import { Router } from 'express';
import { isValidIpOrCidr, normalizeRouteLists } from '../utils/ip.js';

const LIST_KEYS = {
  'ua-blacklist': 'uaBlacklist',
  'ip-blacklist': 'ipBlacklist',
  'ip-whitelist': 'ipWhitelist'
};

function resolveListKey(param) {
  return LIST_KEYS[param] || null;
}

function isValidListEntry(listKey, value) {
  const entry = String(value || '').trim();
  if (!entry) return false;
  if (listKey === 'uaBlacklist') return entry.length >= 2 && entry.length <= 200;
  return isValidIpOrCidr(entry);
}

export function createRouteListsRouter(store) {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(normalizeRouteLists(store.routeLists));
  });

  router.put('/', (req, res) => {
    const next = normalizeRouteLists({
      uaBlacklist: req.body?.uaBlacklist,
      ipBlacklist: req.body?.ipBlacklist,
      ipWhitelist: req.body?.ipWhitelist
    });

    for (const item of next.ipBlacklist) {
      if (!isValidIpOrCidr(item)) {
        return res.status(400).json({ errors: ['ip_blacklist_invalid'], message: `IP/CIDR invalido: ${item}` });
      }
    }
    for (const item of next.ipWhitelist) {
      if (!isValidIpOrCidr(item)) {
        return res.status(400).json({ errors: ['ip_whitelist_invalid'], message: `IP/CIDR invalido: ${item}` });
      }
    }

    store.routeLists = next;
    store.touch();
    return res.json(store.routeLists);
  });

  router.post('/:list', (req, res) => {
    const listKey = resolveListKey(req.params.list);
    if (!listKey) {
      return res.status(400).json({ errors: ['list_invalid'], message: 'Lista desconhecida.' });
    }

    const value = String(req.body?.value || req.body?.entry || req.body?.ip || req.body?.ua || '').trim();
    if (!isValidListEntry(listKey, value)) {
      return res.status(400).json({
        errors: ['entry_invalid'],
        message: listKey === 'uaBlacklist' ? 'User-Agent invalido.' : 'Use IP (1.2.3.4) ou CIDR (1.2.3.0/24).'
      });
    }

    const current = normalizeRouteLists(store.routeLists);
    if (current[listKey].some((item) => item.toLowerCase() === value.toLowerCase())) {
      return res.status(409).json({ errors: ['entry_exists'], message: 'Entrada ja existe na lista.' });
    }

    current[listKey] = [...current[listKey], value];
    store.routeLists = current;
    store.touch();
    return res.status(201).json(store.routeLists);
  });

  router.delete('/:list', (req, res) => {
    const listKey = resolveListKey(req.params.list);
    if (!listKey) {
      return res.status(400).json({ errors: ['list_invalid'] });
    }

    const value = String(req.body?.value || req.query?.value || '').trim();
    if (!value) {
      return res.status(400).json({ errors: ['value_required'] });
    }

    const current = normalizeRouteLists(store.routeLists);
    const nextItems = current[listKey].filter((item) => item.toLowerCase() !== value.toLowerCase());
    if (nextItems.length === current[listKey].length) {
      return res.status(404).json({ errors: ['entry_not_found'] });
    }

    current[listKey] = nextItems;
    store.routeLists = current;
    store.touch();
    return res.json(store.routeLists);
  });

  return router;
}
