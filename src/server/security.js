import { config } from './config.js';
import { isBlockActive } from './utils/ip.js';

const BOT_UA_PATTERN =
  /(bot|crawler|spider|headless|phantom|selenium|playwright|puppeteer|curl|wget|python-requests|httpclient|scrapy|postman|go-http-client|java\/|okhttp|axios|libwww|httpie|aiohttp|node-fetch|undici)/i;
const MOBILE_UA_PATTERN = /(iphone|ipad|android|mobile|phone)/i;

// Datacenter / ads-reviewer ASNs blocked globally before campaign rules.
const BLOCKED_DATACENTER_ASNS = new Set([
  'AS32934',
  'AS15169',
  'AS396982',
  'AS16550',
  'AS14618',
  'AS16509',
  'AS8075',
  'AS8068',
  'AS16276',
  'AS14061',
  'AS13335',
  'AS24940',
  'AS36352',
  'AS63949',
  'AS45102',
  'AS132203',
  'AS46475',
  'AS29073',
  'AS9009',
  'AS49505',
  'AS397423',
  'AS46562',
  'AS55286',
  'AS24875',
  'AS42831',
  'AS199524',
  'AS395974',
  'AS40021'
]);

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isDatacenterAsn(asn) {
  const normalized = normalizeString(asn).toUpperCase().replace(/\s+/g, '');
  return BLOCKED_DATACENTER_ASNS.has(normalized);
}

function getTargetUrl(campaign, device) {
  const destinations = campaign.destinations || {};
  const destination = destinations[device] || 'primary';

  if (destination === 'fallback') {
    return campaign.fallbackUrl;
  }

  return campaign.primaryUrl;
}

function resolveThreshold(campaign, protection) {
  if (campaign.mode === 'Protecao com fallback agressivo') {
    return Number(protection.fallbackThreshold || config.defaults.aggressiveThreshold);
  }
  return Number(protection.fallbackThreshold || config.defaults.fallbackThreshold);
}

function getRecentHits(input, state) {
  const hitsByIp = state?.hitsByIp;
  if (!hitsByIp || !input.ip) return [];

  const now = input.now || Date.now();
  const minuteAgo = now - 60_000;
  return (hitsByIp.get(input.ip) || []).filter((timestamp) => timestamp >= minuteAgo);
}

function recordHit(input, state) {
  const hitsByIp = state?.hitsByIp;
  if (!hitsByIp || !input.ip) return;

  const now = input.now || Date.now();
  const recent = getRecentHits(input, state);
  recent.push(now);
  hitsByIp.set(input.ip, recent);
}

export function detectDevice(userAgent) {
  return MOBILE_UA_PATTERN.test(normalizeString(userAgent)) ? 'mobile' : 'desktop';
}

export function evaluateRequest(input, campaign, state = {}) {
  const protection = campaign.protection || {};
  const enabled = protection.enabled !== false;
  const userAgent = normalizeString(input.userAgent);
  const accept = normalizeString(input.accept);
  const acceptLanguage = normalizeString(input.acceptLanguage);
  const country = normalizeString(input.country).toUpperCase();
  const asn = normalizeString(input.asn).toUpperCase();
  const reasons = [];
  let riskScore = 0;

  const device = detectDevice(userAgent);
  const now = input.now || Date.now();

  const blockedEntry = state?.blockedIps?.get(input.ip);
  if (blockedEntry && isBlockActive(blockedEntry, now)) {
    recordHit(input, state);
    return {
      decision: 'fallback',
      riskScore: 100,
      reasons: ['manual_ip_block'],
      targetUrl: campaign.fallbackUrl,
      device,
      country,
      asn
    };
  }

  if (asn && isDatacenterAsn(asn)) {
    recordHit(input, state);
    return {
      decision: 'fallback',
      riskScore: 100,
      reasons: ['datacenter_asn'],
      targetUrl: campaign.fallbackUrl,
      device,
      country,
      asn
    };
  }

  // Logs-only mode: score for analytics but always allow destination routing.
  if (campaign.mode === 'Somente logs' || !enabled) {
    recordHit(input, state);
    if (!userAgent) reasons.push('missing_user_agent');
    else if (BOT_UA_PATTERN.test(userAgent)) {
      riskScore += 70;
      reasons.push('known_automation_user_agent');
    }
    reasons.push(campaign.mode === 'Somente logs' ? 'logs_only_mode' : 'protection_disabled');
    return {
      decision: 'allow',
      riskScore,
      reasons,
      targetUrl: getTargetUrl(campaign, device),
      device,
      country,
      asn
    };
  }

  if (!userAgent) {
    riskScore += 40;
    reasons.push('missing_user_agent');
  } else if (BOT_UA_PATTERN.test(userAgent)) {
    riskScore += 70;
    reasons.push('known_automation_user_agent');
  }

  if (!accept.includes('text/html')) {
    riskScore += 15;
    reasons.push('html_accept_missing');
  }

  if (!acceptLanguage) {
    riskScore += 15;
    reasons.push('accept_language_missing');
  }

  // Extra signal only when request already looks incomplete.
  const headers = input.headers || {};
  if (
    riskScore > 0 &&
    !headers['sec-fetch-mode'] &&
    !headers['sec-ch-ua'] &&
    !headers['sec-fetch-site']
  ) {
    riskScore += 10;
    reasons.push('missing_client_hints');
  }

  if (country && (protection.blockedCountries || []).map((item) => item.toUpperCase()).includes(country)) {
    riskScore += 60;
    reasons.push('blocked_country');
  }

  if (asn && (protection.blockedAsns || []).map((item) => item.toUpperCase()).includes(asn)) {
    riskScore += 50;
    reasons.push('blocked_asn');
  }

  const recentHits = getRecentHits(input, state);
  const limit = Number(protection.rateLimitPerMinute || config.defaults.rateLimitPerMinute);
  if (recentHits.length >= limit) {
    riskScore += 45;
    reasons.push('rate_limit_exceeded');
  }

  recordHit(input, state);

  if (riskScore === 0) {
    reasons.push('browser_headers_present');
  }

  const threshold = resolveThreshold(campaign, protection);
  const suspicious = riskScore >= threshold;

  return {
    decision: suspicious ? 'fallback' : 'allow',
    riskScore,
    reasons,
    targetUrl: suspicious ? campaign.fallbackUrl : getTargetUrl(campaign, device),
    device,
    country,
    asn
  };
}

/**
 * Record a fallback violation and optionally auto-block the IP.
 * Returns a blocked entry when a new ban is applied, otherwise null.
 */
export function trackViolation(ip, state, options = {}) {
  if (!ip || !state?.violationsByIp) return null;

  const now = options.now || Date.now();
  const auto = { ...config.autoBlock, ...(options.autoBlock || {}) };
  const previous = state.violationsByIp.get(ip) || [];
  const next = [...previous.filter((ts) => now - ts < auto.longWindowMs), now];
  state.violationsByIp.set(ip, next);

  if (options.autoBlockEnabled === false) return null;
  if (state.blockedIps?.has(ip) && isBlockActive(state.blockedIps.get(ip), now)) return null;

  const shortHits = next.filter((ts) => now - ts <= auto.shortWindowMs).length;
  const longHits = next.length;

  if (longHits >= auto.longThreshold) {
    const item = {
      ip,
      reason: `auto: ${longHits} violacoes em 24h`,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + auto.longBanMs).toISOString(),
      source: 'auto'
    };
    state.blockedIps.set(ip, item);
    return item;
  }

  if (shortHits >= auto.shortThreshold) {
    const item = {
      ip,
      reason: `auto: ${shortHits} violacoes em 15min`,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + auto.shortBanMs).toISOString(),
      source: 'auto'
    };
    state.blockedIps.set(ip, item);
    return item;
  }

  return null;
}
