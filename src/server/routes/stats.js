import { Router } from 'express';
import { filterCampaignsForUser, filterEventsForUser, requireActiveUser } from '../utils/access.js';
import { buildStats } from '../utils/stats.js';

export function createStatsRouter(store) {
  const router = Router();

  router.get('/', (req, res) => {
    const user = requireActiveUser(req, res);
    if (!user) return undefined;

    store.pruneExpiredBlocks();
    const campaigns = filterCampaignsForUser(store.campaigns, user);
    const events = filterEventsForUser(store.events, store.campaigns, user);
    const blockedSize = store.blockedIps?.size ?? 0;

    return res.json(buildStats(events, campaigns, blockedSize));
  });

  return router;
}
