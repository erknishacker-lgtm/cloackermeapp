import { config } from './config.js';
import { ipMatchesAny, isBlockActive, normalizeRouteLists } from './utils/ip.js';

/** User-Agents tipicos de automacao, scrapers e ferramentas de request. */
const BOT_UA_PATTERN =
  /(bot|crawler|spider|headless|phantom|selenium|playwright|puppeteer|curl|wget|python-requests|httpclient|scrapy|postman|go-http-client|java\/|okhttp|axios|libwww|httpie|aiohttp|node-fetch|undici|libcurl|scrapy|http.rb|faraday|restsharp)/i;

const MOBILE_UA_PATTERN = /(iphone|ipad|android|mobile|phone)/i;

/**
 * ASNs de datacenter / nuvem comumente usados por scanners e automacao.
 * Ativo por padrao; pode desligar por campanha (blockDatacenterAsns: false).
 */
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

function fallbackResult({ campaign, device, country, asn, reasons, riskScore = 100 }) {
  return {
    decision: 'fallback',
    riskScore,
    reasons,
    targetUrl: campaign.fallbackUrl,
    device,
    country,
    asn
  };
}

/** Lista custom de trechos no User-Agent (ex: "curl", "python"). */
export function matchesBlockedUserAgent(userAgent, blockedList = []) {
  const ua = normalizeString(userAgent).toLowerCase();
  if (!ua || !Array.isArray(blockedList) || blockedList.length === 0) return false;
  return blockedList.some((item) => {
    const needle = normalizeString(item).toLowerCase();
    return needle && ua.includes(needle);
  });
}

/** Lista de IPs bloqueados na campanha (IP exato ou CIDR). */
export function matchesBlockedIp(ip, blockedList = []) {
  return ipMatchesAny(ip, blockedList);
}

/**
 * Roteamento por listas admin (prioridade):
 * 1) IP na whitelist  → real
 * 2) IP na blacklist  → blocked
 * 3) UA na blacklist  → blocked
 * 4) demais           → real
 *
 * Mapeamento no cloaker:
 * - real    = URL principal (primaryUrl)
 * - blocked = URL alternativa (fallbackUrl)
 */
export function evaluateListRouting(input = {}, lists = {}) {
  const routeLists = normalizeRouteLists(lists);
  const ip = normalizeString(input.ip);
  const userAgent = normalizeString(input.userAgent);

  if (ip && ipMatchesAny(ip, routeLists.ipWhitelist)) {
    return {
      route: 'real',
      isBlocked: false,
      reasons: ['ip_whitelist'],
      score: 0
    };
  }

  if (ip && ipMatchesAny(ip, routeLists.ipBlacklist)) {
    return {
      route: 'blocked',
      isBlocked: true,
      reasons: ['ip_blacklist'],
      score: 100
    };
  }

  if (matchesBlockedUserAgent(userAgent, routeLists.uaBlacklist)) {
    return {
      route: 'blocked',
      isBlocked: true,
      reasons: ['ua_blacklist'],
      score: 100
    };
  }

  return {
    route: 'real',
    isBlocked: false,
    reasons: ['default_real'],
    score: 0
  };
}

/**
 * Avalia headers de browser "de verdade".
 * Requests sem Accept HTML, Accept-Language ou client hints sobem o risco.
 */
export function scoreHeaders(input, { strictHeaders = false } = {}) {
  const reasons = [];
  let riskScore = 0;
  const accept = normalizeString(input.accept);
  const acceptLanguage = normalizeString(input.acceptLanguage);
  const headers = input.headers || {};

  if (!accept.includes('text/html')) {
    riskScore += 15;
    reasons.push('html_accept_missing');
  }

  if (!acceptLanguage) {
    riskScore += 15;
    reasons.push('accept_language_missing');
  }

  const missingHints =
    !headers['sec-fetch-mode'] && !headers['sec-ch-ua'] && !headers['sec-fetch-site'];

  if (missingHints) {
    if (strictHeaders || riskScore > 0) {
      riskScore += strictHeaders ? 25 : 10;
      reasons.push('missing_client_hints');
    }
  }

  // Referer ausente em conjunto com outros sinais fracos
  if (strictHeaders && !headers.referer && !headers.referrer) {
    riskScore += 5;
    reasons.push('missing_referer');
  }

  return { riskScore, reasons };
}

export function detectDevice(userAgent) {
  return MOBILE_UA_PATTERN.test(normalizeString(userAgent)) ? 'mobile' : 'desktop';
}

/**
 * Motor de filtro de trafego.
 *
 * Sinais:
 * - User-Agent (bots conhecidos + lista custom da campanha)
 * - IP (bloqueio global + lista da campanha)
 * - Headers (Accept, Accept-Language, Sec-Fetch / client hints)
 * - Pais, ASN, rate limit
 *
 * Decisao:
 * - allow    → URL principal (ou destino desktop/mobile)
 * - fallback → pagina alternativa (URL secundária)
 */
export function evaluateRequest(input, campaign, state = {}) {
  const protection = campaign.protection || {};
  const enabled = protection.enabled !== false;
  const userAgent = normalizeString(input.userAgent);
  const country = normalizeString(input.country).toUpperCase();
  const asn = normalizeString(input.asn).toUpperCase();
  const reasons = [];
  let riskScore = 0;

  const device = detectDevice(userAgent);
  const now = input.now || Date.now();
  const blockDatacenter = protection.blockDatacenterAsns !== false;
  const strictHeaders = protection.strictHeaders === true;

  // Test mode cookie (mesmo IP do token, 1h) → sempre URL principal
  if (input.testMode === true) {
    recordHit(input, state);
    return {
      decision: 'allow',
      riskScore: 0,
      reasons: ['test_mode_cookie'],
      targetUrl: getTargetUrl(campaign, device),
      device,
      country,
      asn
    };
  }

  // 0) Listas admin: whitelist IP → real; blacklist IP/UA → blocked
  //    real = primaryUrl | blocked = fallbackUrl
  const listDecision = evaluateListRouting(input, state?.routeLists);
  if (listDecision.route === 'blocked') {
    recordHit(input, state);
    return fallbackResult({
      campaign,
      device,
      country,
      asn,
      reasons: listDecision.reasons,
      riskScore: listDecision.score
    });
  }
  if (listDecision.reasons.includes('ip_whitelist')) {
    recordHit(input, state);
    return {
      decision: 'allow',
      riskScore: 0,
      reasons: ['ip_whitelist'],
      targetUrl: getTargetUrl(campaign, device),
      device,
      country,
      asn
    };
  }

  // 1) IP bloqueado globalmente (mapa legado do painel — IP exato / com expiracao)
  const blockedEntry = state?.blockedIps?.get(input.ip);
  if (blockedEntry && isBlockActive(blockedEntry, now)) {
    recordHit(input, state);
    return fallbackResult({
      campaign,
      device,
      country,
      asn,
      reasons: ['manual_ip_block']
    });
  }

  // 1b) IPs do mapa legado tambem aceitam chave CIDR
  if (state?.blockedIps?.size) {
    const cidrKeys = [...state.blockedIps.keys()].filter((key) => String(key).includes('/'));
    for (const key of cidrKeys) {
      const item = state.blockedIps.get(key);
      if (item && isBlockActive(item, now) && ipMatchesAny(input.ip, [key])) {
        recordHit(input, state);
        return fallbackResult({
          campaign,
          device,
          country,
          asn,
          reasons: ['manual_ip_block']
        });
      }
    }
  }

  // 2) IP bloqueado na campanha (IP ou CIDR)
  if (matchesBlockedIp(input.ip, protection.blockedIps)) {
    recordHit(input, state);
    return fallbackResult({
      campaign,
      device,
      country,
      asn,
      reasons: ['campaign_ip_block']
    });
  }

  // 3) User-Agent custom bloqueado na campanha (match imediato)
  if (matchesBlockedUserAgent(userAgent, protection.blockedUserAgents)) {
    recordHit(input, state);
    return fallbackResult({
      campaign,
      device,
      country,
      asn,
      reasons: ['campaign_user_agent_block']
    });
  }

  // 4) ASN de datacenter (opcional por campanha)
  if (blockDatacenter && asn && isDatacenterAsn(asn)) {
    recordHit(input, state);
    return fallbackResult({
      campaign,
      device,
      country,
      asn,
      reasons: ['datacenter_asn']
    });
  }

  // Modo so logs: calcula score mas nao desvia
  if (campaign.mode === 'Somente logs' || !enabled) {
    recordHit(input, state);
    if (!userAgent) reasons.push('missing_user_agent');
    else if (BOT_UA_PATTERN.test(userAgent)) {
      riskScore += 70;
      reasons.push('known_automation_user_agent');
    }
    const headerScore = scoreHeaders(input, { strictHeaders });
    riskScore += headerScore.riskScore;
    reasons.push(...headerScore.reasons);
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

  // 5) User-Agent ausente ou de automacao
  if (!userAgent) {
    riskScore += 40;
    reasons.push('missing_user_agent');
  } else if (BOT_UA_PATTERN.test(userAgent)) {
    riskScore += 70;
    reasons.push('known_automation_user_agent');
  }

  // 6) Headers de browser
  const headerScore = scoreHeaders(input, { strictHeaders });
  riskScore += headerScore.riskScore;
  reasons.push(...headerScore.reasons);

  // 7) Pais / ASN da campanha
  if (country && (protection.blockedCountries || []).map((item) => item.toUpperCase()).includes(country)) {
    riskScore += 60;
    reasons.push('blocked_country');
  }

  if (asn && (protection.blockedAsns || []).map((item) => item.toUpperCase()).includes(asn)) {
    riskScore += 50;
    reasons.push('blocked_asn');
  }

  // 8) Rate limit por IP
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
 * Registra violacao (fallback) e opcionalmente auto-bloqueia o IP.
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
