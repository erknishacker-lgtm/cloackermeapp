import { Router } from 'express';
import { requireActiveUser, requireAdmin } from '../utils/access.js';
import { isAdminUser } from '../utils/users.js';
import { isValidDomain, normalizeDomain } from '../utils/domain.js';

function canManageDomain(user, item) {
  if (!user || !item) return false;
  if (isAdminUser(user)) return true;
  return item.userId === user.id;
}

export function createDomainsRouter(store) {
  const router = Router();

  router.get('/', (req, res) => {
    const user = requireActiveUser(req, res);
    if (!user) return undefined;

    const custom = isAdminUser(user)
      ? store.customDomains
      : (store.customDomains || []).filter((item) => item.userId === user.id);

    res.json({
      global: store.globalDomains,
      custom
    });
  });

  /** Qualquer usuario autenticado cadastra dominio para SI. */
  router.post('/', (req, res) => {
    const user = requireActiveUser(req, res);
    if (!user) return undefined;

    const domain = normalizeDomain(req.body?.domain);

    if (!isValidDomain(domain)) {
      return res.status(400).json({
        errors: ['domain_invalid'],
        message: 'Digite um dominio valido, ex: meulink.com (sem https://).'
      });
    }

    if (
      store.globalDomains.some((item) => item.domain === domain) ||
      store.customDomains.some((item) => item.domain === domain)
    ) {
      return res.status(409).json({
        errors: ['domain_exists'],
        message: 'Este dominio ja esta cadastrado.'
      });
    }

    const item = {
      id: `dom_${Date.now().toString(36)}`,
      domain,
      type: 'custom',
      userId: user.id,
      active: true,
      createdAt: new Date().toISOString()
    };

    store.customDomains = [item, ...store.customDomains];
    return res.status(201).json(item);
  });

  router.patch('/:id', (req, res) => {
    const user = requireActiveUser(req, res);
    if (!user) return undefined;

    // Global domains: so admin
    const globalIndex = store.globalDomains.findIndex((item) => item.id === req.params.id);
    if (globalIndex !== -1) {
      if (!requireAdmin(req, res)) return undefined;
      const nextGlobal = [...store.globalDomains];
      nextGlobal[globalIndex] = {
        ...nextGlobal[globalIndex],
        ...(req.body?.active !== undefined ? { active: Boolean(req.body.active) } : {}),
        ...(req.body?.domain ? { domain: normalizeDomain(req.body.domain) } : {})
      };
      store.globalDomains = nextGlobal;
      return res.json(nextGlobal[globalIndex]);
    }

    const index = store.customDomains.findIndex((item) => item.id === req.params.id);
    if (index === -1) return res.status(404).json({ errors: ['domain_not_found'] });

    if (!canManageDomain(user, store.customDomains[index])) {
      return res.status(403).json({ errors: ['forbidden'], message: 'Voce so pode editar seus dominios.' });
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
    const user = requireActiveUser(req, res);
    if (!user) return undefined;

    const item = store.customDomains.find((d) => d.id === req.params.id);
    if (!item) {
      return res.status(404).json({ errors: ['domain_not_found'] });
    }
    if (!canManageDomain(user, item)) {
      return res.status(403).json({ errors: ['forbidden'], message: 'Voce so pode excluir seus dominios.' });
    }

    store.customDomains = store.customDomains.filter((d) => d.id !== item.id);
    return res.status(204).send();
  });

  return router;
}
