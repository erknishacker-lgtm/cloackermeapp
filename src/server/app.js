import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { adminAuth } from './middleware/adminAuth.js';
import { createAuthRouter } from './routes/auth.js';
import { createBlockedIpsRouter } from './routes/blockedIps.js';
import { createCampaignsRouter } from './routes/campaigns.js';
import { createDomainsRouter } from './routes/domains.js';
import { createEventsRouter } from './routes/events.js';
import { createNotificationsRouter } from './routes/notifications.js';
import { createRedirectRouter } from './routes/redirect.js';
import { createRouteListsRouter } from './routes/routeLists.js';
import { createSettingsRouter } from './routes/settings.js';
import { createStatsRouter } from './routes/stats.js';
import { createStore } from './store/createStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../../public');

export function createApp(options = {}) {
  const app = express();
  const store = options.store || createStore(options);
  const requireAuth = adminAuth(store);

  app.set('trust proxy', true);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));

  if (existsSync(publicDir)) {
    app.use(express.static(publicDir));
  }

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      campaigns: store.campaigns.length,
      events: store.events.length,
      users: store.users.length,
      uptime: process.uptime(),
      authRequired: true,
      brand: 'Cloaker.lol'
    });
  });

  app.use('/api/auth', createAuthRouter(store, requireAuth));
  app.use('/api/campaigns', requireAuth, createCampaignsRouter(store));
  app.use('/api/events', requireAuth, createEventsRouter(store));
  app.use('/api/stats', requireAuth, createStatsRouter(store));
  app.use('/api/domains', requireAuth, createDomainsRouter(store));
  app.use('/api/blocked-ips', requireAuth, createBlockedIpsRouter(store));
  app.use('/api/route-lists', requireAuth, createRouteListsRouter(store));
  app.use('/api/settings', requireAuth, createSettingsRouter(store));
  app.use('/api/notifications', requireAuth, createNotificationsRouter(store));
  app.use('/r', createRedirectRouter(store));

  const distDir = options.distDir || config.distDir;
  if (existsSync(distDir)) {
    app.use(express.static(distDir));
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      if (req.path.startsWith('/api') || req.path.startsWith('/r/') || req.path === '/health') return next();
      if (path.extname(req.path)) return next();
      res.sendFile(path.join(distDir, 'index.html'), (err) => {
        if (err) next(err);
      });
    });
  }

  app.locals.store = store;
  return app;
}
