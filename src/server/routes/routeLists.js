import { Router } from 'express';
import { requireActiveUser, requireAdmin } from '../utils/access.js';
import { getClientIp, isValidIpOrCidr, normalizeRouteLists } from '../utils/ip.js';

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

  /** Cliente: descobre o IP atual (para tutorial / whitelist). */
  router.get('/my-ip', (req, res) => {
    if (!requireActiveUser(req, res)) return undefined;
    const ip = getClientIp(req);
    const lists = normalizeRouteLists(store.routeLists);
    const onWhitelist = lists.ipWhitelist.some((entry) => entry === ip);
    return res.json({ ip, onWhitelist });
  });

  /** Cliente: adiciona o proprio IP na whitelist global (autoatendimento). */
  router.post('/my-ip', (req, res) => {
    if (!requireActiveUser(req, res)) return undefined;
    const ip = getClientIp(req);
    if (!isValidIpOrCidr(ip) || ip === 'unknown') {
      return res.status(400).json({
        errors: ['ip_unavailable'],
        message: 'Nao foi possivel detectar seu IP. Tente de outro rede ou peça ao admin.'
      });
    }
    const current = normalizeRouteLists(store.routeLists);
    if (!current.ipWhitelist.includes(ip)) {
      current.ipWhitelist = [...current.ipWhitelist, ip];
      store.routeLists = current;
      store.touch();
    }
    return res.json({
      ok: true,
      ip,
      onWhitelist: true,
      message: 'Seu IP foi adicionado a whitelist. Acessos deste IP vao para a URL principal.'
    });
  });

  router.get('/', (req, res) => {
    if (!requireAdmin(req, res)) return undefined;
    res.json(normalizeRouteLists(store.routeLists));
  });

  router.put('/', (req, res) => {
    if (!requireAdmin(req, res)) return undefined;
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
    if (!requireAdmin(req, res)) return undefined;
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
    if (!requireAdmin(req, res)) return undefined;
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
