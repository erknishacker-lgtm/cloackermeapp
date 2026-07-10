import { Router } from 'express';

export function createSettingsRouter(store) {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(store.settings);
  });

  router.patch('/', (req, res) => {
    const next = { ...store.settings };
    if (req.body?.allowSimulate !== undefined) next.allowSimulate = Boolean(req.body.allowSimulate);
    if (req.body?.autoBlockEnabled !== undefined) next.autoBlockEnabled = Boolean(req.body.autoBlockEnabled);
    if (req.body?.operatorEmail !== undefined) next.operatorEmail = String(req.body.operatorEmail || '');
    if (req.body?.supportWhatsapp !== undefined) next.supportWhatsapp = String(req.body.supportWhatsapp || '');
    store.settings = next;
    return res.json(next);
  });

  return router;
}
