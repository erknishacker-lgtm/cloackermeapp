import { createStore } from '../src/server/store/createStore.js';
import { createApp } from '../src/server/app.js';
import { hashPassword } from '../src/server/utils/password.js';
import { evaluateRequest } from '../src/server/security.js';

console.log('[1] imports ok');

const store = createStore({ persist: false, seedDemo: false });
store.users = [
  ...store.users,
  {
    id: 'usr_cli',
    username: 'cliente',
    passwordHash: hashPassword('senha123'),
    role: 'user',
    active: true,
    email: 'c@t.com',
    displayName: 'Cliente',
    fullAccess: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr_other',
    username: 'outro',
    passwordHash: hashPassword('senha123'),
    role: 'user',
    active: true,
    email: 'o@t.com',
    displayName: 'Outro',
    fullAccess: true,
    createdAt: new Date().toISOString()
  }
];
store.setUserRouteLists('usr_cli', {
  uaBlacklist: ['curl'],
  ipBlacklist: [],
  ipWhitelist: ['203.0.113.9']
});
store.campaigns = [
  {
    id: 'c1',
    userId: 'usr_cli',
    slug: 'oferta',
    name: 'Oferta',
    primaryUrl: 'https://a.com/real',
    fallbackUrl: 'https://a.com/safe',
    status: 'active',
    destinations: { desktop: 'primary', mobile: 'primary' },
    protection: {
      enabled: true,
      fallbackThreshold: 45,
      rateLimitPerMinute: 20,
      blockDatacenterAsns: false
    }
  }
];

console.log('[2] store seeded');

const r1 = evaluateRequest(
  {
    ip: '8.8.8.8',
    userAgent: 'curl/8',
    accept: '*/*',
    acceptLanguage: '',
    country: 'BR',
    asn: '',
    headers: {},
    now: Date.now()
  },
  store.campaigns[0],
  store
);
const r2 = evaluateRequest(
  {
    ip: '203.0.113.9',
    userAgent: 'curl/8',
    accept: 'text/html',
    acceptLanguage: 'pt',
    country: 'BR',
    asn: '',
    headers: {
      'sec-fetch-mode': 'navigate',
      'sec-ch-ua': 'x',
      'sec-fetch-site': 'none'
    },
    now: Date.now()
  },
  store.campaigns[0],
  store
);
console.log('[3] evaluate', r1.decision, r2.decision);

const app = createApp({ store });
const server = await new Promise((resolve, reject) => {
  const s = app.listen(0, '127.0.0.1', () => resolve(s));
  s.on('error', reject);
});
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;
console.log('[4] listening', port);

const login = await fetch(`${base}/api/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ username: 'cliente', password: 'senha123' })
}).then((r) => r.json());
if (!login.token) {
  console.error('login fail', login);
  process.exit(1);
}
const h = { 'x-admin-token': login.token, 'content-type': 'application/json' };

const d = await fetch(`${base}/api/domains`, {
  method: 'POST',
  headers: h,
  body: JSON.stringify({ domain: 'go.cliente.com' })
});
const dj = await d.json();
console.log('[5] domain', d.status, dj.domain, dj.userId);

const lists = await fetch(`${base}/api/route-lists`, { headers: h }).then((r) => r.json());
console.log('[6] lists', lists.uaBlacklist);

const add = await fetch(`${base}/api/route-lists/ua-blacklist`, {
  method: 'POST',
  headers: h,
  body: JSON.stringify({ value: 'scrapy' })
});
const addj = await add.json();
console.log('[7] add ua', add.status, addj.uaBlacklist);

const camp = await fetch(`${base}/api/campaigns`, {
  method: 'POST',
  headers: h,
  body: JSON.stringify({
    name: 'Teste',
    slug: 'teste-cli',
    primaryUrl: 'https://a.com/r',
    fallbackUrl: 'https://a.com/f',
    domain: 'go.cliente.com',
    status: 'active'
  })
});
const campj = await camp.json();
console.log('[8] campaign', camp.status, campj.userId, campj.slug);

const login2 = await fetch(`${base}/api/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ username: 'outro', password: 'senha123' })
}).then((r) => r.json());
const doms = await fetch(`${base}/api/domains`, {
  headers: { 'x-admin-token': login2.token }
}).then((r) => r.json());
console.log('[9] other custom', (doms.custom || []).map((x) => x.domain));

const ok =
  d.status === 201 &&
  dj.userId === 'usr_cli' &&
  lists.uaBlacklist?.includes('curl') &&
  add.status === 201 &&
  camp.status === 201 &&
  campj.userId === 'usr_cli' &&
  r1.decision === 'fallback' &&
  r2.decision === 'allow' &&
  (doms.custom || []).length === 0;

console.log(ok ? 'ALL OK' : 'FAIL');
await new Promise((resolve) => server.close(resolve));
process.exit(ok ? 0 : 1);
