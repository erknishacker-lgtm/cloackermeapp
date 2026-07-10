import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { seedCampaign } from '../utils/campaign.js';
import { isBlockActive } from '../utils/ip.js';
import { createOwnerUser, ensureOwnerUser } from '../utils/users.js';

function emptyState(seedDemo = false) {
  return {
    campaigns: seedDemo ? [structuredClone(seedCampaign)] : [],
    events: [],
    hitsByIp: {},
    blockedIps: {},
    violationsByIp: {},
    globalDomains: [
      {
        id: 'dom_global_go',
        domain: 'cloaker.lol',
        type: 'global',
        active: true,
        createdAt: new Date().toISOString()
      }
    ],
    customDomains: [],
    users: [createOwnerUser()],
    sessions: {},
    notifications: [],
    settings: {
      allowSimulate: config.allowSimulate,
      autoBlockEnabled: true,
      accessNotificationsEnabled: true,
      operatorEmail: 'louzada@cloaker.lol',
      supportWhatsapp: ''
    }
  };
}

function hydrateMaps(raw) {
  const base = emptyState(false);
  const users = ensureOwnerUser(raw.users || base.users);
  const state = {
    ...base,
    ...raw,
    hitsByIp: new Map(Object.entries(raw.hitsByIp || {})),
    blockedIps: new Map(Object.entries(raw.blockedIps || {})),
    violationsByIp: new Map(Object.entries(raw.violationsByIp || {})),
    sessions: new Map(Object.entries(raw.sessions || {})),
    campaigns: raw.campaigns || [],
    events: raw.events || [],
    globalDomains: raw.globalDomains || base.globalDomains,
    customDomains: raw.customDomains || [],
    users,
    notifications: raw.notifications || [],
    settings: { ...base.settings, ...(raw.settings || {}) }
  };
  return state;
}

function serializeState(store) {
  return {
    campaigns: store.campaigns,
    events: store.events.slice(0, config.maxEvents),
    hitsByIp: Object.fromEntries(store.hitsByIp),
    blockedIps: Object.fromEntries(store.blockedIps),
    violationsByIp: Object.fromEntries(store.violationsByIp),
    sessions: Object.fromEntries(store.sessions),
    globalDomains: store.globalDomains,
    customDomains: store.customDomains,
    users: store.users,
    notifications: (store.notifications || []).slice(0, 200),
    settings: store.settings
  };
}

export function createStore(options = {}) {
  const persist = options.persist === true;
  const dataFile = options.dataFile || config.dataFile;
  let state;

  if (persist && existsSync(dataFile)) {
    try {
      const raw = JSON.parse(readFileSync(dataFile, 'utf8'));
      state = hydrateMaps(raw);
    } catch {
      state = hydrateMaps(emptyState(options.seedDemo ?? config.seedDemo));
    }
  } else {
    state = hydrateMaps(emptyState(options.seedDemo ?? false));
  }

  // Always ensure owner exists after load
  state.users = ensureOwnerUser(state.users);

  let writeTimer = null;

  function schedulePersist() {
    if (!persist) return;
    clearTimeout(writeTimer);
    writeTimer = setTimeout(() => {
      try {
        const dir = path.dirname(dataFile);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        writeFileSync(dataFile, JSON.stringify(serializeState(state), null, 2));
      } catch (error) {
        console.error('[store] failed to persist', error.message);
      }
    }, 120);
  }

  function pruneExpiredBlocks(now = Date.now()) {
    for (const [ip, item] of state.blockedIps.entries()) {
      if (!isBlockActive(item, now)) {
        state.blockedIps.delete(ip);
      }
    }
    for (const [token, session] of state.sessions.entries()) {
      if (session.expiresAt && new Date(session.expiresAt).getTime() <= now) {
        state.sessions.delete(token);
      }
    }
  }

  return {
    get campaigns() {
      return state.campaigns;
    },
    set campaigns(value) {
      state.campaigns = value;
      schedulePersist();
    },
    get events() {
      return state.events;
    },
    set events(value) {
      state.events = value;
      schedulePersist();
    },
    get hitsByIp() {
      return state.hitsByIp;
    },
    get blockedIps() {
      return state.blockedIps;
    },
    get violationsByIp() {
      return state.violationsByIp;
    },
    get globalDomains() {
      return state.globalDomains;
    },
    set globalDomains(value) {
      state.globalDomains = value;
      schedulePersist();
    },
    get customDomains() {
      return state.customDomains;
    },
    set customDomains(value) {
      state.customDomains = value;
      schedulePersist();
    },
    get users() {
      return state.users;
    },
    set users(value) {
      state.users = value;
      schedulePersist();
    },
    get sessions() {
      return state.sessions;
    },
    get notifications() {
      return state.notifications;
    },
    set notifications(value) {
      state.notifications = value;
      schedulePersist();
    },
    get settings() {
      return state.settings;
    },
    set settings(value) {
      state.settings = value;
      schedulePersist();
    },
    touch() {
      schedulePersist();
    },
    pruneExpiredBlocks,
    persistNow() {
      if (!persist) return;
      const dir = path.dirname(dataFile);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(dataFile, JSON.stringify(serializeState(state), null, 2));
    }
  };
}
