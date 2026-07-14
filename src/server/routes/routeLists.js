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

function readUserLists(store, userId) {
  return store.getUserRouteLists(userId);
}

function writeUserLists(store, userId, lists) {
  store.setUserRouteLists(userId, lists);
}

export function createRouteListsRouter(store) {
  const router = Router();

  /** Qualquer usuario: descobre o IP atual. */
  router.get('/my-ip', (req, res) => {
    const user = requireActiveUser(req, res);
    if (!user) return undefined;
    const ip = getClientIp(req);
    const lists = readUserLists(store, user.id);
    const onWhitelist = lists.ipWhitelist.some((entry) => entry === ip);
    return res.json({ ip, onWhitelist });
  });

  /** Qualquer usuario: adiciona o proprio IP na SUA whitelist. */
  router.post('/my-ip', (req, res) => {
    const user = requireActiveUser(req, res);
    if (!user) return undefined;
    const ip = getClientIp(req);
    if (!isValidIpOrCidr(ip) || ip === 'unknown') {
      return res.status(400).json({
        errors: ['ip_unavailable'],
        message: 'Nao foi possivel detectar seu IP. Tente de outra rede.'
      });
    }
    const current = readUserLists(store, user.id);
    if (!current.ipWhitelist.includes(ip)) {
      current.ipWhitelist = [...current.ipWhitelist, ip];
      writeUserLists(store, user.id, current);
    }
    return res.json({
      ok: true,
      ip,
      onWhitelist: true,
      message: 'Seu IP foi adicionado a SUA whitelist. Acessos deste IP nas suas campanhas vao para a URL principal.'
    });
  });

  /** Listas do usuario logado (cada cliente e independente). */
  router.get('/', (req, res) => {
    const user = requireActiveUser(req, res);
    if (!user) return undefined;
    return res.json(readUserLists(store, user.id));
  });

  /** Admin: listas globais da plataforma (aplicam em todas as campanhas). */
  router.get('/global', (req, res) => {
    if (!requireAdmin(req, res)) return undefined;
    return res.json(normalizeRouteLists(store.routeLists));
  });

  router.put('/', (req, res) => {
    const user = requireActiveUser(req, res);
    if (!user) return undefined;
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

    writeUserLists(store, user.id, next);
    return res.json(readUserLists(store, user.id));
  });

  router.post('/:list', (req, res) => {
    const user = requireActiveUser(req, res);
    if (!user) return undefined;

    // rota reservada
    if (req.params.list === 'global' || req.params.list === 'my-ip') {
      return res.status(400).json({ errors: ['list_invalid'] });
    }

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

    const current = readUserLists(store, user.id);
    if (current[listKey].some((item) => item.toLowerCase() === value.toLowerCase())) {
      return res.status(409).json({ errors: ['entry_exists'], message: 'Entrada ja existe na lista.' });
    }

    current[listKey] = [...current[listKey], value];
    writeUserLists(store, user.id, current);
    return res.status(201).json(readUserLists(store, user.id));
  });

  router.delete('/:list', (req, res) => {
    const user = requireActiveUser(req, res);
    if (!user) return undefined;

    const listKey = resolveListKey(req.params.list);
    if (!listKey) {
      return res.status(400).json({ errors: ['list_invalid'] });
    }

    const value = String(req.body?.value || req.query?.value || '').trim();
    if (!value) {
      return res.status(400).json({ errors: ['value_required'] });
    }

    const current = readUserLists(store, user.id);
    const nextItems = current[listKey].filter((item) => item.toLowerCase() !== value.toLowerCase());
    if (nextItems.length === current[listKey].length) {
      return res.status(404).json({ errors: ['entry_not_found'] });
    }

    current[listKey] = nextItems;
    writeUserLists(store, user.id, current);
    return res.json(readUserLists(store, user.id));
  });

  return router;
}
