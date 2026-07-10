import { Router } from 'express';
import { isValidIp, serializeBlockedIp } from '../utils/ip.js';

export function createBlockedIpsRouter(store) {
  const router = Router();

  router.get('/', (_req, res) => {
    store.pruneExpiredBlocks();
    res.json(Array.from(store.blockedIps.values()).map(serializeBlockedIp));
  });

  router.post('/', (req, res) => {
    const ip = String(req.body?.ip || '').trim();

    if (!ip) {
      return res.status(400).json({ errors: ['ip_required'] });
    }
    if (!isValidIp(ip)) {
      return res.status(400).json({ errors: ['ip_invalid'] });
    }

    const item = {
      ip,
      reason: String(req.body?.reason || '').trim() || 'Bloqueio manual',
      createdAt: new Date().toISOString(),
      expiresAt: req.body?.expiresAt || null,
      source: 'manual'
    };

    store.blockedIps.set(ip, item);
    store.touch();
    return res.status(201).json(serializeBlockedIp(item));
  });

  router.delete('/:ip', (req, res) => {
    if (!store.blockedIps.delete(req.params.ip)) {
      return res.status(404).json({ errors: ['ip_not_found'] });
    }
    store.touch();
    return res.status(204).send();
  });

  return router;
}
