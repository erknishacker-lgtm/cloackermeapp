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

export function isValidIp(value) {
  const ip = String(value || '').trim();
  if (!ip) return false;

  const v4 = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
  if (v4.test(ip)) return true;

  // Basic IPv6 (covers common forms used in block lists)
  const v6 = /^[0-9a-f:]+$/i;
  return v6.test(ip) && ip.includes(':');
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
