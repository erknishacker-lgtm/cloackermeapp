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

    // Qualquer usuario logado — perfil / preferencias
    if (req.body?.accessNotificationsEnabled !== undefined) {
      next.accessNotificationsEnabled = Boolean(req.body.accessNotificationsEnabled);
    }
    if (req.body?.operatorEmail !== undefined) {
      next.operatorEmail = String(req.body.operatorEmail || '');
    }
    if (req.body?.displayName !== undefined) {
      next.displayName = String(req.body.displayName || '').slice(0, 120);
    }
    if (req.body?.phone !== undefined) {
      next.phone = String(req.body.phone || '').slice(0, 40);
    }
    if (req.body?.country !== undefined) {
      next.country = String(req.body.country || '').slice(0, 8).toUpperCase();
    }
    if (req.body?.document !== undefined) {
      next.document = String(req.body.document || '').slice(0, 32);
    }
    if (req.body?.planId !== undefined) {
      const allowed = new Set(['start', 'platinum', 'ghost']);
      const planId = String(req.body.planId || '').toLowerCase();
      if (allowed.has(planId)) next.planId = planId;
    }
    if (req.body?.regenerateApiKey === true) {
      next.apiKey = `zg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
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
