import { Router } from 'express';

export function createNotificationsRouter(store) {
  const router = Router();

  router.get('/', (_req, res) => {
    const list = store.notifications || [];
    res.json({
      enabled: store.settings?.accessNotificationsEnabled !== false,
      unread: list.filter((n) => !n.read).length,
      items: list.slice(0, 50)
    });
  });

  router.post('/read-all', (_req, res) => {
    store.notifications = (store.notifications || []).map((item) => ({ ...item, read: true }));
    res.json({ ok: true });
  });

  router.post('/:id/read', (req, res) => {
    const next = (store.notifications || []).map((item) =>
      item.id === req.params.id ? { ...item, read: true } : item
    );
    store.notifications = next;
    const item = next.find((n) => n.id === req.params.id);
    if (!item) return res.status(404).json({ errors: ['notification_not_found'] });
    return res.json(item);
  });

  return router;
}

export function pushAccessNotification(store, event) {
  if (store.settings?.accessNotificationsEnabled === false) return;

  const decisionLabel = event.decision === 'allow' ? 'White (aprovado)' : 'Black (fallback)';
  const item = {
    id: `ntf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'access',
    eventId: event.id,
    title: `Novo acesso · ${decisionLabel}`,
    body: `${event.campaignName} · IP ${event.ip}${event.country ? ` · ${event.country}` : ''} · ${event.device}`,
    decision: event.decision,
    campaignName: event.campaignName,
    campaignSlug: event.campaignSlug,
    ip: event.ip,
    country: event.country || '',
    device: event.device,
    riskScore: event.riskScore,
    createdAt: event.createdAt || new Date().toISOString(),
    read: false
  };

  store.notifications = [item, ...(store.notifications || [])].slice(0, 200);
}
