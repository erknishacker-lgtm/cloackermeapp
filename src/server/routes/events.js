import { Router } from 'express';
import { filterEventsForUser, requireActiveUser } from '../utils/access.js';

function serializeEvent(event) {
  return {
    ...event,
    reasons: event.reasons || []
  };
}

export function createEventsRouter(store) {
  const router = Router();

  router.get('/', (req, res) => {
    const user = requireActiveUser(req, res);
    if (!user) return undefined;

    const limit = Math.min(Number(req.query.limit || 50), 500);
    const decision = req.query.decision;
    const slug = req.query.slug;

    let events = filterEventsForUser(store.events, store.campaigns, user);
    if (decision) events = events.filter((e) => e.decision === decision);
    if (slug) events = events.filter((e) => e.campaignSlug === slug);

    res.json(events.slice(0, limit).map(serializeEvent));
  });

  return router;
}
