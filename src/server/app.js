import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { adminAuth } from './middleware/adminAuth.js';
import { createBlockedIpsRouter } from './routes/blockedIps.js';
import { createCampaignsRouter } from './routes/campaigns.js';
import { createDomainsRouter } from './routes/domains.js';
import { createEventsRouter } from './routes/events.js';
import { createRedirectRouter } from './routes/redirect.js';
import { createSettingsRouter } from './routes/settings.js';
import { createStatsRouter } from './routes/stats.js';
import { createStore } from './store/createStore.js';

export function createApp(options = {}) {
  const app = express();
  const store = options.store || createStore(options);

  // EasyPanel / Cloudflare / reverse proxy
  app.set('trust proxy', true);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      campaigns: store.campaigns.length,
      events: store.events.length,
      uptime: process.uptime(),
      authRequired: Boolean(config.adminToken)
    });
  });

  // Painel e API protegidos quando ADMIN_TOKEN existir. /r/* fica público.
  app.use('/api', adminAuth);
  app.use('/api/campaigns', createCampaignsRouter(store));
  app.use('/api/events', createEventsRouter(store));
  app.use('/api/stats', createStatsRouter(store));
  app.use('/api/domains', createDomainsRouter(store));
  app.use('/api/blocked-ips', createBlockedIpsRouter(store));
  app.use('/api/settings', createSettingsRouter(store));
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
