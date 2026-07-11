function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function countBy(events, keyFn) {
  const map = new Map();
  for (const event of events) {
    const key = keyFn(event) || 'unknown';
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Monta metricas a partir de uma lista de eventos (ja filtrada por usuario).
 */
export function buildStats(events = [], campaigns = [], blockedIpsSize = 0) {
  const list = Array.isArray(events) ? events : [];
  const camps = Array.isArray(campaigns) ? campaigns : [];
  const now = Date.now();
  const dayStart = startOfDay();
  const weekAgo = now - 7 * 24 * 60 * 60_000;
  const monthAgo = now - 30 * 24 * 60 * 60_000;

  const total = list.length;
  const allowed = list.filter((event) => event.decision === 'allow').length;
  const fallback = list.filter((event) => event.decision === 'fallback').length;
  const blocked = list.filter(
    (event) =>
      event.reasons?.includes('manual_ip_block') ||
      event.reasons?.includes('ip_blacklist') ||
      event.reasons?.includes('campaign_ip_block')
  ).length;
  const mobile = list.filter((event) => event.device === 'mobile').length;
  const today = list.filter((event) => new Date(event.createdAt).getTime() >= dayStart);
  const week = list.filter((event) => new Date(event.createdAt).getTime() >= weekAgo);
  const month = list.filter((event) => new Date(event.createdAt).getTime() >= monthAgo);

  return {
    total,
    allowed,
    fallback,
    white: allowed,
    black: fallback,
    blocked,
    mobile,
    desktop: Math.max(0, total - mobile),
    campaigns: camps.length,
    activeCampaigns: camps.filter((c) => c.status === 'active').length,
    blockedIps: blockedIpsSize,
    today: {
      total: today.length,
      allowed: today.filter((e) => e.decision === 'allow').length,
      fallback: today.filter((e) => e.decision === 'fallback').length,
      blocked: today.filter(
        (e) =>
          e.reasons?.includes('manual_ip_block') ||
          e.reasons?.includes('ip_blacklist') ||
          e.reasons?.includes('campaign_ip_block')
      ).length
    },
    week: {
      total: week.length,
      fallback: week.filter((e) => e.decision === 'fallback').length
    },
    month: {
      total: month.length,
      fallback: month.filter((e) => e.decision === 'fallback').length
    },
    topCountries: countBy(list, (e) => e.country || '??').slice(0, 10),
    topReasons: countBy(
      list.filter((e) => e.decision === 'fallback'),
      (e) => e.reasons?.[0] || 'fallback'
    ).slice(0, 10),
    topCampaigns: countBy(
      list.filter((e) => e.decision === 'fallback'),
      (e) => e.campaignName || e.campaignSlug || 'campanha'
    ).slice(0, 10),
    topIps: countBy(
      list.filter((e) => e.decision === 'fallback'),
      (e) => e.ip
    ).slice(0, 10)
  };
}
