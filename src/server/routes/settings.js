import { Router } from 'express';
import { isAdminUser } from '../utils/users.js';
import { requireActiveUser } from '../utils/access.js';

export function createSettingsRouter(store) {
  const router = Router();

  router.get('/', (req, res) => {
    if (!requireActiveUser(req, res)) return undefined;
    res.json(store.settings);
  });

  router.patch('/', (req, res) => {
    const user = requireActiveUser(req, res);
    if (!user) return undefined;

    const next = { ...store.settings };
    const admin = isAdminUser(user);

    // Qualquer usuario logado
    if (req.body?.accessNotificationsEnabled !== undefined) {
      next.accessNotificationsEnabled = Boolean(req.body.accessNotificationsEnabled);
    }
    if (req.body?.operatorEmail !== undefined) {
      next.operatorEmail = String(req.body.operatorEmail || '');
    }

    // Somente admin (config global do motor)
    if (admin) {
      if (req.body?.allowSimulate !== undefined) next.allowSimulate = Boolean(req.body.allowSimulate);
      if (req.body?.autoBlockEnabled !== undefined) next.autoBlockEnabled = Boolean(req.body.autoBlockEnabled);
      if (req.body?.supportWhatsapp !== undefined) next.supportWhatsapp = String(req.body.supportWhatsapp || '');
    }

    store.settings = next;
    return res.json(next);
  });

  return router;
}
