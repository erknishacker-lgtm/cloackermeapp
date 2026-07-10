import { Router } from 'express';
import { isValidDomain, normalizeDomain } from '../utils/domain.js';

export function createDomainsRouter(store) {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({
      global: store.globalDomains,
      custom: store.customDomains
    });
  });

  router.post('/', (req, res) => {
    const domain = normalizeDomain(req.body?.domain);

    if (!isValidDomain(domain)) {
      return res.status(400).json({ errors: ['domain_invalid'] });
    }

    const exists = [...store.globalDomains, ...store.customDomains].some((item) => item.domain === domain);
    if (exists) {
      return res.status(409).json({ errors: ['domain_already_exists'] });
    }

    const item = {
      id: `dom_${Date.now().toString(36)}`,
      domain,
      type: 'custom',
      active: true,
      createdAt: new Date().toISOString()
    };

    store.customDomains = [item, ...store.customDomains];
    return res.status(201).json(item);
  });

  router.patch('/:id', (req, res) => {
    const index = store.customDomains.findIndex((domain) => domain.id === req.params.id);
    if (index === -1) return res.status(404).json({ errors: ['domain_not_found'] });

    const item = { ...store.customDomains[index] };

    if (req.body?.domain !== undefined) {
      const nextDomain = normalizeDomain(req.body.domain);
      if (!isValidDomain(nextDomain)) {
        return res.status(400).json({ errors: ['domain_invalid'] });
      }
      const exists = [...store.globalDomains, ...store.customDomains].some(
        (domain) => domain.id !== item.id && domain.domain === nextDomain
      );
      if (exists) {
        return res.status(409).json({ errors: ['domain_already_exists'] });
      }
      item.domain = nextDomain;
    }

    if (req.body?.active !== undefined) {
      item.active = Boolean(req.body.active);
    }

    const next = [...store.customDomains];
    next[index] = item;
    store.customDomains = next;
    return res.json(item);
  });

  router.delete('/:id', (req, res) => {
    const nextDomains = store.customDomains.filter((domain) => domain.id !== req.params.id);
    if (nextDomains.length === store.customDomains.length) {
      return res.status(404).json({ errors: ['domain_not_found'] });
    }
    store.customDomains = nextDomains;
    return res.status(204).send();
  });

  return router;
}
