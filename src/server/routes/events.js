import { Router } from 'express';

function serializeEvent(event) {
  return {
    ...event,
    reasons: event.reasons || []
  };
}

export function createEventsRouter(store) {
  const router = Router();

  router.get('/', (req, res) => {
    const limit = Math.min(Number(req.query.limit || 50), 500);
    const decision = req.query.decision;
    const slug = req.query.slug;

    let events = store.events;
    if (decision) events = events.filter((e) => e.decision === decision);
    if (slug) events = events.filter((e) => e.campaignSlug === slug);

    res.json(events.slice(0, limit).map(serializeEvent));
  });

  return router;
}
