import { config } from './config.js';
import { emptyRouteLists, ipMatchesAny, isBlockActive, mergeRouteLists, normalizeRouteLists } from './utils/ip.js';

/**
 * Automacao / scrapers genericos (sobe score; em geral ja bloqueia).
 * NAO incluir "tiktok" nem "musical_ly" nem "bytedancewebview" — isso e browser in-app de usuario real.
 */
const BOT_UA_PATTERN =
  /(bot|crawler|spider|headless|phantom|selenium|playwright|puppeteer|curl|wget|python-requests|httpclient|scrapy|postman|go-http-client|java\/|okhttp|axios|libwww|httpie|aiohttp|node-fetch|undici|libcurl|http\.rb|faraday|restsharp|python-urllib|aiohttp|httpx|scrapy|mechanize|wget|fetch\s|slurp|mediapartners|adsbot|semrush|ahrefs|mj12bot|dotbot|petalbot|yandexbot|baiduspider|duckduckbot|bingpreview|pingdom|uptimerobot|statuscake|gtmetrix|lighthouse|chrome-lighthouse|pagespeed)/i;

/**
 * Bloqueio HARD imediato (fallback). Crawlers de plataforma / agents explicitos.
 * Bytespider = crawler da ByteDance (TikTok). NAO e o webview do app do usuario.
 */
const HARD_BLOCK_UA_PATTERN =
  /(bytespider|byte[_\s-]?spider|tiktokspider|tiktok[_\s-]?spider|bytedance[_\s-]?spider|bdspider|toutiaospider|newsarticle|facebookexternalhit|facebot|meta-externalagent|meta-externalfetcher|twitterbot|linkedinbot|pinterestbot|slackbot|discordbot|telegrambot|whatsapp(?!\/)|previewbot|embedly|quora\s*link|outbrain|applebot|storebot-google|adsbot-google|google-inspectiontool|petalbot|seznambot|sogou|exabot|ia_archiver|archive\.org_bot|ccbot|gptbot|chatgpt-user|claudebot|anthropic|perplexitybot|bytespider|tiktokbot)/i;

const MOBILE_UA_PATTERN = /(iphone|ipad|android|mobile|phone)/i;

/** Webview real do app TikTok (usuario clicando no anuncio) — NAO bloquear so por isso. */
const TIKTOK_INAPP_UA_PATTERN = /(bytedancewebview|musical_ly|tiktok\s|tiktok\/|ttwebview|aweme)/i;

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
  'AS40021',
  // proxies / bot hosts frequentes em review
  'AS212238',
  'AS9009',
  'AS60068',
  'AS62240',
  'AS20473',
  'AS53667',
  'AS209366',
  'AS9009'
]);

/**
 * Redes da ByteDance / TikTok (escritorio, crawlers, infra).
 * Usuario real de anuncio vem de operadora (Vivo, Claro, Verizon…) — nao destas ASNs.
 * Sempre bloqueadas quando blockPlatformAgents !== false.
 */
const PLATFORM_AGENT_ASNS = new Set([
  'AS396986', // Bytedance Inc (TikTok)
  'AS138699', // TikTok Pte. Ltd / ByteDance
  'AS55967', // Beijing Baishan / related infra sometimes seen
  'AS137718' // Beijing Volcano / ByteDance related ranges
]);

function isTikTokCampaign(campaign) {
  const p = normalizeString(campaign?.platform).toLowerCase();
  return p.includes('tiktok') || p.includes('tik tok') || p === 'tt';
}

function isPlatformAgentsEnabled(protection) {
  return protection?.blockPlatformAgents !== false;
}

function normalizeAsn(asn) {
  const raw = normalizeString(asn).toUpperCase().replace(/\s+/g, '');
  if (!raw) return '';
  if (raw.startsWith('AS')) return raw;
  if (/^\d+$/.test(raw)) return `AS${raw}`;
  return raw;
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isDatacenterAsn(asn) {
  return BLOCKED_DATACENTER_ASNS.has(normalizeAsn(asn));
}

function isPlatformAgentAsn(asn) {
  return PLATFORM_AGENT_ASNS.has(normalizeAsn(asn));
}

/**
 * Sinais de agente/headless que passam se so olharmos "Chrome mobile".
 * Nao bloqueia webview legitimo do TikTok sozinho.
 */
export function scoreAgentSignals(input, { tiktokProfile = false } = {}) {
  const reasons = [];
  let riskScore = 0;
  const ua = normalizeString(input.userAgent);
  const headers = input.headers || {};
  const accept = normalizeString(input.accept);
  const acceptLanguage = normalizeString(input.acceptLanguage);
  const isInAppTikTok = TIKTOK_INAPP_UA_PATTERN.test(ua);
  const isMobile = MOBILE_UA_PATTERN.test(ua);

  // Headless / automation fingerprints no UA
  if (/\bheadlesschrome\b|headless|phantomjs|electron\/|nightmare/i.test(ua)) {
    riskScore += 55;
    reasons.push('headless_fingerprint');
  }

  // WebDriver / automation headers
  if (headers['x-requested-with'] === 'XMLHttpRequest' && !accept.includes('text/html')) {
    riskScore += 15;
    reasons.push('xhr_not_navigation');
  }

  // Chrome desktop moderno quase sempre manda sec-ch-ua; ausencia + sem language e suspeito
  const hasChUa = Boolean(headers['sec-ch-ua']);
  const hasFetchMode = Boolean(headers['sec-fetch-mode']);
  const hasFetchSite = Boolean(headers['sec-fetch-site']);
  const hasSecFetch = hasFetchMode || hasFetchSite || Boolean(headers['sec-fetch-dest']);

  if (!isInAppTikTok && /chrome\/|crios\//i.test(ua) && !hasChUa && !hasSecFetch) {
    riskScore += tiktokProfile ? 30 : 18;
    reasons.push('chrome_without_client_hints');
  }

  // Navegacao de anuncio: secao Fetch Mode=navigate e comum em browser real
  if (!isInAppTikTok && accept.includes('text/html') && !hasFetchMode && !hasChUa) {
    riskScore += tiktokProfile ? 20 : 10;
    reasons.push('html_nav_without_sec_fetch');
  }

  // Idioma ausente em campanha de ads (agentes baratos esquecem)
  if (!acceptLanguage) {
    riskScore += tiktokProfile ? 25 : 0; // generico ja pontua em scoreHeaders
    if (tiktokProfile) reasons.push('tiktok_missing_language');
  }

  // Perfil TikTok Ads: trafego real e quase todo mobile in-app ou mobile browser
  if (tiktokProfile && !isMobile && !isInAppTikTok) {
    riskScore += 28;
    reasons.push('tiktok_desktop_unlikely');
  }

  // UA muito curto / generico de lib
  if (ua && ua.length < 40 && !isInAppTikTok) {
    riskScore += 20;
    reasons.push('short_user_agent');
  }

  // Empty UA ja tratado fora; aqui so reforco
  if (!ua) {
    riskScore += 10;
    reasons.push('empty_ua_agent_signal');
  }

  return { riskScore, reasons, isInAppTikTok };
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
  const asn = normalizeAsn(input.asn);
  const reasons = [];
  let riskScore = 0;

  const device = detectDevice(userAgent);
  const now = input.now || Date.now();
  const blockDatacenter = protection.blockDatacenterAsns !== false;
  const tiktokProfile = isTikTokCampaign(campaign);
  // TikTok Ads: headers mais rigidos por padrao (da pra desligar com strictHeaders: false explicito so se quiser)
  const strictHeaders =
    protection.strictHeaders === true || (tiktokProfile && protection.strictHeaders !== false);
  const platformAgents = isPlatformAgentsEnabled(protection);

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

  // 0) Listas: global (plataforma) + listas do DONO da campanha (cada cliente independente)
  //    real = primaryUrl | blocked = fallbackUrl
  const ownerId = campaign.userId || null;
  const ownerLists =
    typeof state?.getUserRouteLists === 'function'
      ? state.getUserRouteLists(ownerId)
      : normalizeRouteLists(state?.userRouteLists?.[ownerId] || emptyRouteLists());
  const effectiveLists = mergeRouteLists(state?.routeLists || emptyRouteLists(), ownerLists);
  const listDecision = evaluateListRouting(input, effectiveLists);
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

  // 0b) HARD: crawlers/agents de plataforma (Bytespider, Meta external, etc.)
  //     NAO inclui webview in-app do TikTok (usuario real do anuncio).
  if (platformAgents && userAgent && HARD_BLOCK_UA_PATTERN.test(userAgent)) {
    // Protecao: se for claramente in-app legitimo sem "spider", nao hard-block
    const isInApp = TIKTOK_INAPP_UA_PATTERN.test(userAgent);
    const isSpider = /(spider|crawler|bot|externalhit|externalagent|externalfetcher)/i.test(userAgent);
    if (!isInApp || isSpider) {
      recordHit(input, state);
      return fallbackResult({
        campaign,
        device,
        country,
        asn,
        reasons: ['platform_agent_user_agent'],
        riskScore: 100
      });
    }
  }

  // 0c) HARD: ASN da ByteDance/TikTok (agentes de review na rede da empresa)
  if (platformAgents && asn && isPlatformAgentAsn(asn)) {
    recordHit(input, state);
    return fallbackResult({
      campaign,
      device,
      country,
      asn,
      reasons: ['platform_agent_asn'],
      riskScore: 100
    });
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
    const agentScore = scoreAgentSignals(input, { tiktokProfile });
    riskScore += agentScore.riskScore;
    reasons.push(...agentScore.reasons);
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

  // 6b) Sinais de agente / perfil TikTok (headless, desktop em ads, chrome sem hints…)
  const agentScore = scoreAgentSignals(input, { tiktokProfile });
  riskScore += agentScore.riskScore;
  reasons.push(...agentScore.reasons);

  // 7) Pais / ASN da campanha
  if (country && (protection.blockedCountries || []).map((item) => item.toUpperCase()).includes(country)) {
    riskScore += 60;
    reasons.push('blocked_country');
  }

  if (asn && (protection.blockedAsns || []).map((item) => normalizeAsn(item)).includes(asn)) {
    riskScore += 50;
    reasons.push('blocked_asn');
  }

  // 8) Rate limit por IP (TikTok ads: um pouco mais rígido se perfil)
  const recentHits = getRecentHits(input, state);
  const baseLimit = Number(protection.rateLimitPerMinute || config.defaults.rateLimitPerMinute);
  const limit = tiktokProfile ? Math.min(baseLimit, 12) : baseLimit;
  if (recentHits.length >= limit) {
    riskScore += 45;
    reasons.push('rate_limit_exceeded');
  }

  recordHit(input, state);

  if (riskScore === 0) {
    reasons.push('browser_headers_present');
  }

  // TikTok Ads: limiar mais baixo (agentes “quase browser” precisam de menos pontos pra cair na alternativa)
  let threshold = resolveThreshold(campaign, protection);
  if (tiktokProfile) {
    const cap = campaign.mode === 'Protecao com fallback agressivo' ? 22 : 30;
    threshold = Math.min(threshold, cap);
  }

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
