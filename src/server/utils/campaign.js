import { slugify } from './slugify.js';
import { config } from '../config.js';

function isTikTokPlatform(platform) {
  const p = String(platform || '').toLowerCase();
  return p.includes('tiktok') || p.includes('tik tok');
}

export function toCampaign(body = {}) {
  const slug = slugify(body.slug || body.name);
  const platform = body.platform || 'Personalizado / Outro';
  const tiktok = isTikTokPlatform(platform);
  // TikTok: default mais agressivo (agentes de review passam em “modo suave”)
  const mode =
    body.mode || (tiktok ? 'Protecao com fallback agressivo' : 'Protecao server-side');
  const defaultThreshold =
    mode === 'Protecao com fallback agressivo'
      ? config.defaults.aggressiveThreshold
      : tiktok
        ? 30
        : config.defaults.fallbackThreshold;

  return {
    id: body.id || `cmp_${Date.now().toString(36)}`,
    userId: body.userId || null,
    name: body.name || 'Nova Campanha',
    slug,
    primaryUrl: body.primaryUrl,
    fallbackUrl: body.fallbackUrl,
    platform,
    mode,
    domain: body.domain || config.defaults.domain,
    status: body.status || 'active',
    createdAt: body.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    destinations: {
      desktop: body.desktopDestination || body.destinations?.desktop || 'primary',
      mobile: body.mobileDestination || body.destinations?.mobile || 'primary'
    },
    protection: {
      enabled: body.protectionEnabled !== false && body.protection?.enabled !== false,
      rateLimitPerMinute: Number(
        body.rateLimitPerMinute ??
          body.protection?.rateLimitPerMinute ??
          (tiktok ? 12 : config.defaults.rateLimitPerMinute)
      ),
      fallbackThreshold: Number(
        body.fallbackThreshold ?? body.protection?.fallbackThreshold ?? defaultThreshold
      ),
      blockedCountries: parseList(body.blockedCountries ?? body.protection?.blockedCountries, true),
      blockedAsns: parseList(body.blockedAsns ?? body.protection?.blockedAsns, true),
      blockedUserAgents: parseList(body.blockedUserAgents ?? body.protection?.blockedUserAgents, false),
      blockedIps: parseList(body.blockedIps ?? body.protection?.blockedIps, false),
      blockDatacenterAsns: parseBool(
        body.blockDatacenterAsns ?? body.protection?.blockDatacenterAsns,
        true
      ),
      strictHeaders: parseBool(
        body.strictHeaders ?? body.protection?.strictHeaders,
        tiktok // TikTok: headers rigidos por padrao
      ),
      blockPlatformAgents: parseBool(
        body.blockPlatformAgents ?? body.protection?.blockPlatformAgents,
        true
      )
    }
  };
}

export function applyCampaignPatch(campaign, body = {}) {
  const next = { ...campaign };

  if (body.name !== undefined) next.name = body.name;
  if (body.slug !== undefined) next.slug = slugify(body.slug);
  // userId so pode ser alterado pelo dono da campanha (evita sequestro)
  if (body.primaryUrl !== undefined) next.primaryUrl = body.primaryUrl;
  if (body.fallbackUrl !== undefined) next.fallbackUrl = body.fallbackUrl;
  if (body.platform !== undefined) next.platform = body.platform;
  if (body.mode !== undefined) next.mode = body.mode;
  if (body.domain !== undefined) next.domain = body.domain;
  if (body.status !== undefined) next.status = body.status;

  if (body.desktopDestination !== undefined || body.mobileDestination !== undefined || body.destinations) {
    next.destinations = {
      desktop: body.desktopDestination || body.destinations?.desktop || campaign.destinations?.desktop || 'primary',
      mobile: body.mobileDestination || body.destinations?.mobile || campaign.destinations?.mobile || 'primary'
    };
  }

  const protection = { ...campaign.protection };
  if (body.protectionEnabled !== undefined) protection.enabled = body.protectionEnabled !== false;
  if (body.rateLimitPerMinute !== undefined) protection.rateLimitPerMinute = Number(body.rateLimitPerMinute);
  if (body.fallbackThreshold !== undefined) protection.fallbackThreshold = Number(body.fallbackThreshold);
  if (body.blockedCountries !== undefined) protection.blockedCountries = parseList(body.blockedCountries, true);
  if (body.blockedAsns !== undefined) protection.blockedAsns = parseList(body.blockedAsns, true);
  if (body.blockedUserAgents !== undefined) {
    protection.blockedUserAgents = parseList(body.blockedUserAgents, false);
  }
  if (body.blockedIps !== undefined) protection.blockedIps = parseList(body.blockedIps, false);
  if (body.blockDatacenterAsns !== undefined) {
    protection.blockDatacenterAsns = parseBool(body.blockDatacenterAsns, true);
  }
  if (body.strictHeaders !== undefined) protection.strictHeaders = parseBool(body.strictHeaders, false);
  if (body.blockPlatformAgents !== undefined) {
    protection.blockPlatformAgents = parseBool(body.blockPlatformAgents, true);
  }
  if (body.protection) {
    Object.assign(protection, body.protection);
    if (body.protection.blockedCountries) {
      protection.blockedCountries = parseList(body.protection.blockedCountries, true);
    }
    if (body.protection.blockedAsns) {
      protection.blockedAsns = parseList(body.protection.blockedAsns, true);
    }
    if (body.protection.blockedUserAgents) {
      protection.blockedUserAgents = parseList(body.protection.blockedUserAgents, false);
    }
    if (body.protection.blockedIps) {
      protection.blockedIps = parseList(body.protection.blockedIps, false);
    }
    if (body.protection.blockDatacenterAsns !== undefined) {
      protection.blockDatacenterAsns = parseBool(body.protection.blockDatacenterAsns, true);
    }
    if (body.protection.strictHeaders !== undefined) {
      protection.strictHeaders = parseBool(body.protection.strictHeaders, false);
    }
    if (body.protection.blockPlatformAgents !== undefined) {
      protection.blockPlatformAgents = parseBool(body.protection.blockPlatformAgents, true);
    }
  }
  next.protection = protection;
  next.updatedAt = new Date().toISOString();
  return next;
}

export function validateCampaign(campaign) {
  const errors = [];

  if (!campaign.slug) errors.push('slug_required');
  if (!campaign.primaryUrl) errors.push('primary_url_required');
  if (!campaign.fallbackUrl) errors.push('fallback_url_required');

  for (const [field, value] of [
    ['primaryUrl', campaign.primaryUrl],
    ['fallbackUrl', campaign.fallbackUrl]
  ]) {
    try {
      const parsed = new URL(value);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        errors.push(`${field}_must_be_http_url`);
      }
    } catch {
      errors.push(`${field}_invalid`);
    }
  }

  return errors;
}

function parseList(value, upper = false) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .map((item) => (upper ? item.toUpperCase() : item));
  }

  return String(value || '')
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (upper ? item.toUpperCase() : item));
}

function parseBool(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on', 'sim'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off', 'nao', 'não'].includes(normalized)) return false;
  return defaultValue;
}

export const seedCampaign = {
  id: 'cmp_demo',
  userId: 'usr_louzada',
  name: 'Campanha Demo',
  slug: 'demo',
  primaryUrl: 'https://example.com/real-offer',
  fallbackUrl: 'https://example.com/safe-page',
  platform: 'Personalizado / Outro',
  mode: 'Protecao server-side',
  domain: 'go.seudominio.com',
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  destinations: {
    desktop: 'primary',
    mobile: 'primary'
  },
  protection: {
    enabled: true,
    rateLimitPerMinute: 20,
    fallbackThreshold: 45,
    blockedCountries: [],
    blockedAsns: [],
    blockedUserAgents: [],
    blockedIps: [],
    blockDatacenterAsns: true,
    strictHeaders: false
  }
};
