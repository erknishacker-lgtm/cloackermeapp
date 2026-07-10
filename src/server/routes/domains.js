import { Router } from 'express';
import { requireAdmin, requireActiveUser } from '../utils/access.js';
import { isValidDomain, normalizeDomain } from '../utils/domain.js';

export function createDomainsRouter(store) {
  const router = Router();

  // Clientes podem ler (select de campanha); so admin altera
  router.get('/', (req, res) => {
    if (!requireActiveUser(req, res)) return undefined;
    res.json({
      global: store.globalDomains,
      custom: store.customDomains
    });
  });

  router.post('/', (req, res) => {
    if (!requireAdmin(req, res)) return undefined;
    const domain = normalizeDomain(req.body?.domain);

    if (!isValidDomain(domain)) {
      return res.status(400).json({ errors: ['domain_invalid'] });
    }

    if (
      store.globalDomains.some((item) => item.domain === domain) ||
      store.customDomains.some((item) => item.domain === domain)
    ) {
      return res.status(409).json({ errors: ['domain_exists'] });
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
    if (!requireAdmin(req, res)) return undefined;
    const index = store.customDomains.findIndex((item) => item.id === req.params.id);
    if (index === -1) {
      const globalIndex = store.globalDomains.findIndex((item) => item.id === req.params.id);
      if (globalIndex === -1) return res.status(404).json({ errors: ['domain_not_found'] });
      const nextGlobal = [...store.globalDomains];
      nextGlobal[globalIndex] = {
        ...nextGlobal[globalIndex],
        ...(req.body?.active !== undefined ? { active: Boolean(req.body.active) } : {}),
        ...(req.body?.domain ? { domain: normalizeDomain(req.body.domain) } : {})
      };
      store.globalDomains = nextGlobal;
      return res.json(nextGlobal[globalIndex]);
    }

    const next = [...store.customDomains];
    next[index] = {
      ...next[index],
      ...(req.body?.active !== undefined ? { active: Boolean(req.body.active) } : {}),
      ...(req.body?.domain ? { domain: normalizeDomain(req.body.domain) } : {})
    };
    store.customDomains = next;
    return res.json(next[index]);
  });

  router.delete('/:id', (req, res) => {
    if (!requireAdmin(req, res)) return undefined;
    const next = store.customDomains.filter((item) => item.id !== req.params.id);
    if (next.length === store.customDomains.length) {
      return res.status(404).json({ errors: ['domain_not_found'] });
    }
    store.customDomains = next;
    return res.status(204).send();
  });

  return router;
}
