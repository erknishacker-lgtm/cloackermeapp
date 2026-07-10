import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { seedCampaign } from '../utils/campaign.js';
import { isBlockActive } from '../utils/ip.js';

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
        domain: 'go.seudominio.com',
        type: 'global',
        active: true,
        createdAt: new Date().toISOString()
      }
    ],
    customDomains: [],
    settings: {
      allowSimulate: config.allowSimulate,
      autoBlockEnabled: true,
      operatorEmail: 'admin@mycloaker.local',
      supportWhatsapp: ''
    }
  };
}

function hydrateMaps(raw) {
  const state = {
    ...emptyState(false),
    ...raw,
    hitsByIp: new Map(Object.entries(raw.hitsByIp || {})),
    blockedIps: new Map(Object.entries(raw.blockedIps || {})),
    violationsByIp: new Map(Object.entries(raw.violationsByIp || {})),
    campaigns: raw.campaigns || [],
    events: raw.events || [],
    globalDomains: raw.globalDomains || emptyState(false).globalDomains,
    customDomains: raw.customDomains || [],
    settings: { ...emptyState(false).settings, ...(raw.settings || {}) }
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
    globalDomains: store.globalDomains,
    customDomains: store.customDomains,
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
