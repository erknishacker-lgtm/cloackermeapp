import { describe, expect, test } from 'vitest';
import { evaluateRequest, trackViolation } from '../src/server/security.js';

const campaign = {
  primaryUrl: 'https://example.com/real',
  fallbackUrl: 'https://example.com/safe',
  destinations: {
    desktop: 'primary',
    mobile: 'primary'
  },
  protection: {
    enabled: true,
    rateLimitPerMinute: 3,
    blockedCountries: ['CN'],
    blockedAsns: ['AS13335']
  }
};

function request(overrides = {}) {
  return {
    ip: '203.0.113.10',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
    accept: 'text/html,application/xhtml+xml',
    acceptLanguage: 'pt-BR,pt;q=0.9,en;q=0.8',
    country: 'BR',
    asn: 'AS28573',
    headers: {},
    now: 1_720_000_000_000,
    ...overrides
  };
}

describe('evaluateRequest', () => {
  test('allows a normal browser request to reach the primary target', () => {
    const result = evaluateRequest(request(), campaign, { hitsByIp: new Map() });

    expect(result.decision).toBe('allow');
    expect(result.targetUrl).toBe('https://example.com/real');
    expect(result.reasons).toContain('browser_headers_present');
  });

  test('sends obvious automation to fallback instead of the primary target', () => {
    const result = evaluateRequest(
      request({
        userAgent: 'curl/8.4.0',
        accept: '*/*',
        acceptLanguage: ''
      }),
      campaign,
      { hitsByIp: new Map() }
    );

    expect(result.decision).toBe('fallback');
    expect(result.targetUrl).toBe('https://example.com/safe');
    expect(result.riskScore).toBeGreaterThanOrEqual(70);
    expect(result.reasons).toContain('known_automation_user_agent');
  });

  test('blocks repeated hits beyond the configured rate limit', () => {
    const hitsByIp = new Map([
      [
        '203.0.113.10',
        [1_720_000_000_000, 1_720_000_010_000, 1_720_000_020_000]
      ]
    ]);

    const result = evaluateRequest(request({ now: 1_720_000_030_000 }), campaign, { hitsByIp });

    expect(result.decision).toBe('fallback');
    expect(result.reasons).toContain('rate_limit_exceeded');
  });

  test('routes mobile traffic according to the mobile destination setting', () => {
    const result = evaluateRequest(
      request({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
      }),
      {
        ...campaign,
        destinations: {
          desktop: 'primary',
          mobile: 'fallback'
        }
      },
      { hitsByIp: new Map() }
    );

    expect(result.decision).toBe('allow');
    expect(result.device).toBe('mobile');
    expect(result.targetUrl).toBe('https://example.com/safe');
  });

  test('sends manually blocked IPs to fallback before other routing rules', () => {
    const result = evaluateRequest(request({ ip: '198.51.100.44' }), campaign, {
      hitsByIp: new Map(),
      blockedIps: new Map([
        [
          '198.51.100.44',
          {
            ip: '198.51.100.44',
            reason: 'manual test block'
          }
        ]
      ])
    });

    expect(result.decision).toBe('fallback');
    expect(result.targetUrl).toBe('https://example.com/safe');
    expect(result.reasons).toContain('manual_ip_block');
  });

  test('globally blocks datacenter/reviewer ASNs even without campaign config', () => {
    const minimalCampaign = {
      primaryUrl: 'https://example.com/real',
      fallbackUrl: 'https://example.com/safe',
      protection: { enabled: true }
    };

    const metaReviewer = evaluateRequest(request({ asn: 'AS32934' }), minimalCampaign, {
      hitsByIp: new Map()
    });
    expect(metaReviewer.decision).toBe('fallback');
    expect(metaReviewer.targetUrl).toBe('https://example.com/safe');
    expect(metaReviewer.reasons).toContain('datacenter_asn');
  });

  test('still lets residential ISP users through the global block', () => {
    const minimalCampaign = {
      primaryUrl: 'https://example.com/real',
      fallbackUrl: 'https://example.com/safe',
      protection: { enabled: true }
    };

    const normalUser = evaluateRequest(request({ asn: 'AS28573' }), minimalCampaign, {
      hitsByIp: new Map()
    });
    expect(normalUser.decision).toBe('allow');
    expect(normalUser.targetUrl).toBe('https://example.com/real');
  });

  test('logs-only mode always allows destination routing', () => {
    const result = evaluateRequest(
      request({
        userAgent: 'curl/8.4.0',
        accept: '*/*',
        acceptLanguage: ''
      }),
      { ...campaign, mode: 'Somente logs' },
      { hitsByIp: new Map() }
    );

    expect(result.decision).toBe('allow');
    expect(result.targetUrl).toBe('https://example.com/real');
    expect(result.reasons).toContain('logs_only_mode');
  });
});

describe('trackViolation', () => {
  test('auto-blocks after 3 short-window violations', () => {
    const state = {
      violationsByIp: new Map(),
      blockedIps: new Map()
    };
    const now = 1_720_000_000_000;

    trackViolation('203.0.113.50', state, { now });
    trackViolation('203.0.113.50', state, { now: now + 1000 });
    const ban = trackViolation('203.0.113.50', state, { now: now + 2000 });

    expect(ban).toBeTruthy();
    expect(ban.source).toBe('auto');
    expect(state.blockedIps.has('203.0.113.50')).toBe(true);
  });
});
