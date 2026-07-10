export function getClientIp(req) {
  return (
    req.headers['cf-connecting-ip'] ||
    req.headers['true-client-ip'] ||
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  ).replace(/^::ffff:/, '');
}

const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;

export function isValidIp(value) {
  const ip = String(value || '').trim();
  if (!ip) return false;

  if (IPV4_RE.test(ip)) return true;

  // Basic IPv6 (covers common forms used in block lists)
  const v6 = /^[0-9a-f:]+$/i;
  return v6.test(ip) && ip.includes(':');
}

/** Aceita IP solto (1.2.3.4) ou CIDR IPv4 (1.2.3.0/24). */
export function isValidIpOrCidr(value) {
  const raw = String(value || '').trim();
  if (!raw) return false;

  if (!raw.includes('/')) {
    return isValidIp(raw);
  }

  const [base, maskRaw] = raw.split('/');
  const mask = Number(maskRaw);
  if (!IPV4_RE.test(base)) return false;
  if (!Number.isInteger(mask) || mask < 0 || mask > 32) return false;
  return true;
}

function ipv4ToInt(ip) {
  const parts = String(ip)
    .trim()
    .split('.')
    .map((part) => Number(part));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return null;
  }
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

/**
 * Verifica se um IP IPv4 está dentro de um CIDR (ex: 10.0.0.0/8)
 * ou é igual a um IP exato.
 */
export function ipInRange(ip, range) {
  const cleanIp = String(ip || '')
    .trim()
    .replace(/^::ffff:/, '');
  const cleanRange = String(range || '').trim();
  if (!cleanIp || !cleanRange) return false;

  if (!cleanRange.includes('/')) {
    return cleanIp === cleanRange;
  }

  const [base, maskRaw] = cleanRange.split('/');
  const mask = Number(maskRaw);
  const ipInt = ipv4ToInt(cleanIp);
  const baseInt = ipv4ToInt(base);
  if (ipInt === null || baseInt === null || !Number.isInteger(mask) || mask < 0 || mask > 32) {
    return false;
  }

  if (mask === 0) return true;
  const maskBits = mask === 32 ? 0xffffffff : (~((1 << (32 - mask)) - 1)) >>> 0;
  return (ipInt & maskBits) === (baseInt & maskBits);
}

/** True se o IP casa com qualquer item da lista (IP exato ou CIDR). */
export function ipMatchesAny(ip, list = []) {
  if (!ip || !Array.isArray(list) || list.length === 0) return false;
  return list.some((entry) => {
    const value = typeof entry === 'string' ? entry : entry?.value || entry?.ip || '';
    return ipInRange(ip, value);
  });
}

export function serializeBlockedIp(item) {
  return {
    ip: item.ip,
    reason: item.reason || '',
    createdAt: item.createdAt,
    expiresAt: item.expiresAt || null,
    source: item.source || 'manual'
  };
}

export function isBlockActive(item, now = Date.now()) {
  if (!item) return false;
  if (!item.expiresAt) return true;
  return new Date(item.expiresAt).getTime() > now;
}

export function emptyRouteLists() {
  return {
    uaBlacklist: [],
    ipBlacklist: [],
    ipWhitelist: []
  };
}

export function normalizeRouteLists(raw = {}) {
  const base = emptyRouteLists();
  return {
    uaBlacklist: normalizeStringList(raw.uaBlacklist ?? base.uaBlacklist),
    ipBlacklist: normalizeStringList(raw.ipBlacklist ?? base.ipBlacklist),
    ipWhitelist: normalizeStringList(raw.ipWhitelist ?? base.ipWhitelist)
  };
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))];
}
