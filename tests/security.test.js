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

  test('blocks datacenter ASNs by default even without campaign config', () => {
    const minimalCampaign = {
      primaryUrl: 'https://example.com/real',
      fallbackUrl: 'https://example.com/safe',
      protection: { enabled: true }
    };

    const cloudVisitor = evaluateRequest(request({ asn: 'AS16509' }), minimalCampaign, {
      hitsByIp: new Map()
    });
    expect(cloudVisitor.decision).toBe('fallback');
    expect(cloudVisitor.targetUrl).toBe('https://example.com/safe');
    expect(cloudVisitor.reasons).toContain('datacenter_asn');
  });

  test('allows disabling datacenter ASN block per campaign', () => {
    const result = evaluateRequest(
      request({ asn: 'AS16509' }),
      {
        ...campaign,
        protection: { ...campaign.protection, blockDatacenterAsns: false }
      },
      { hitsByIp: new Map() }
    );
    expect(result.decision).toBe('allow');
  });

  test('sends campaign-blocked user-agent patterns to alternative page', () => {
    const result = evaluateRequest(
      request({
        userAgent: 'MyCustomScraper/1.0'
      }),
      {
        ...campaign,
        protection: {
          ...campaign.protection,
          blockedUserAgents: ['mycustomscraper']
        }
      },
      { hitsByIp: new Map() }
    );

    expect(result.decision).toBe('fallback');
    expect(result.targetUrl).toBe('https://example.com/safe');
    expect(result.reasons).toContain('campaign_user_agent_block');
  });

  test('sends campaign-blocked IPs to alternative page', () => {
    const result = evaluateRequest(
      request({ ip: '203.0.113.99' }),
      {
        ...campaign,
        protection: {
          ...campaign.protection,
          blockedIps: ['203.0.113.99']
        }
      },
      { hitsByIp: new Map() }
    );

    expect(result.decision).toBe('fallback');
    expect(result.reasons).toContain('campaign_ip_block');
  });

  test('strict headers increase risk when client hints are missing', () => {
    const result = evaluateRequest(
      request({
        headers: {},
        accept: 'text/html',
        acceptLanguage: 'pt-BR'
      }),
      {
        ...campaign,
        protection: {
          ...campaign.protection,
          strictHeaders: true,
          fallbackThreshold: 20
        }
      },
      { hitsByIp: new Map() }
    );

    expect(result.reasons).toContain('missing_client_hints');
    expect(result.decision).toBe('fallback');
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

  test('hard-blocks Bytespider (TikTok/ByteDance crawler) immediately', () => {
    const result = evaluateRequest(
      request({
        userAgent:
          'Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; https://zhanzhang.toutiao.com/)'
      }),
      campaign,
      { hitsByIp: new Map() }
    );
    expect(result.decision).toBe('fallback');
    expect(result.reasons).toContain('platform_agent_user_agent');
  });

  test('hard-blocks ByteDance/TikTok ASN (review agents on corporate net)', () => {
    const result = evaluateRequest(request({ asn: 'AS396986' }), campaign, { hitsByIp: new Map() });
    expect(result.decision).toBe('fallback');
    expect(result.reasons).toContain('platform_agent_asn');
  });

  test('allows real TikTok in-app webview (musical_ly / BytedanceWebview)', () => {
    const result = evaluateRequest(
      request({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_32.0.0 BytedanceWebview/d8a21c6',
        accept: 'text/html,application/xhtml+xml',
        acceptLanguage: 'pt-BR,pt;q=0.9',
        headers: {
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'none',
          'sec-fetch-dest': 'document'
        }
      }),
      {
        ...campaign,
        platform: 'TikTok',
        mode: 'Protecao com fallback agressivo',
        protection: {
          ...campaign.protection,
          strictHeaders: true,
          fallbackThreshold: 25,
          blockDatacenterAsns: true
        }
      },
      { hitsByIp: new Map() }
    );
    expect(result.decision).toBe('allow');
    expect(result.targetUrl).toBe('https://example.com/real');
  });

  test('TikTok profile blocks fake Chrome desktop without client hints', () => {
    const result = evaluateRequest(
      request({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
        accept: 'text/html',
        acceptLanguage: '',
        headers: {}
      }),
      {
        ...campaign,
        platform: 'TikTok',
        mode: 'Protecao com fallback agressivo',
        protection: {
          enabled: true,
          rateLimitPerMinute: 12,
          fallbackThreshold: 25,
          blockDatacenterAsns: true,
          strictHeaders: true
        }
      },
      { hitsByIp: new Map() }
    );
    expect(result.decision).toBe('fallback');
    expect(result.riskScore).toBeGreaterThanOrEqual(25);
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
