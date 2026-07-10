import { Router } from 'express';
import { filterCampaignsForUser, filterEventsForUser, requireActiveUser } from '../utils/access.js';

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

export function createStatsRouter(store) {
  const router = Router();

  router.get('/', (req, res) => {
    const user = requireActiveUser(req, res);
    if (!user) return undefined;

    store.pruneExpiredBlocks();
    const campaigns = filterCampaignsForUser(store.campaigns, user);
    const events = filterEventsForUser(store.events, store.campaigns, user);
    const now = Date.now();
    const dayStart = startOfDay();
    const weekAgo = now - 7 * 24 * 60 * 60_000;
    const monthAgo = now - 30 * 24 * 60 * 60_000;

    const total = events.length;
    const allowed = events.filter((event) => event.decision === 'allow').length;
    const fallback = events.filter((event) => event.decision === 'fallback').length;
    const blocked = events.filter((event) => event.reasons?.includes('manual_ip_block')).length;
    const mobile = events.filter((event) => event.device === 'mobile').length;
    const today = events.filter((event) => new Date(event.createdAt).getTime() >= dayStart);
    const week = events.filter((event) => new Date(event.createdAt).getTime() >= weekAgo);
    const month = events.filter((event) => new Date(event.createdAt).getTime() >= monthAgo);

    res.json({
      total,
      allowed,
      fallback,
      white: allowed,
      black: fallback,
      blocked,
      mobile,
      desktop: total - mobile,
      campaigns: campaigns.length,
      activeCampaigns: campaigns.filter((c) => c.status === 'active').length,
      blockedIps: store.blockedIps.size,
      today: {
        total: today.length,
        allowed: today.filter((e) => e.decision === 'allow').length,
        fallback: today.filter((e) => e.decision === 'fallback').length,
        blocked: today.filter((e) => e.reasons?.includes('manual_ip_block')).length
      },
      week: {
        total: week.length,
        fallback: week.filter((e) => e.decision === 'fallback').length
      },
      month: {
        total: month.length,
        fallback: month.filter((e) => e.decision === 'fallback').length
      },
      topCountries: countBy(events, (e) => e.country || '??').slice(0, 10),
      topReasons: countBy(
        events.filter((e) => e.decision === 'fallback'),
        (e) => e.reasons?.[0] || 'fallback'
      ).slice(0, 10),
      topCampaigns: countBy(
        events.filter((e) => e.decision === 'fallback'),
        (e) => e.campaignName
      ).slice(0, 10),
      topIps: countBy(
        events.filter((e) => e.decision === 'fallback'),
        (e) => e.ip
      ).slice(0, 10)
    });
  });

  return router;
}
