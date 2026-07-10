import { Router } from 'express';
import { config } from '../config.js';
import { evaluateRequest, trackViolation } from '../security.js';
import { getClientIp } from '../utils/ip.js';
import { parseCookieHeader } from '../utils/password.js';
import { pushAccessNotification } from './notifications.js';

function resolveTestMode(store, req, campaign) {
  const token = parseCookieHeader(req.headers.cookie || '', 'test_mode');
  if (!token || !store.testModes?.has(token)) {
    return { active: false };
  }

  const session = store.testModes.get(token);
  const now = Date.now();
  if (session.expiresAt && new Date(session.expiresAt).getTime() <= now) {
    store.testModes.delete(token);
    store.touch();
    return { active: false };
  }

  const ip = getClientIp(req);
  if (session.ip && session.ip !== ip) {
    return { active: false, reason: 'test_mode_ip_mismatch' };
  }

  // Token valido: liberar principal (mesmo sem ?test=1, mas preferimos com)
  if (session.campaignSlug && session.campaignSlug !== campaign.slug) {
    // token de outra campanha ainda libera teste se mesmo dono — opcional: so mesma campanha
    if (session.campaignId && session.campaignId !== campaign.id) {
      return { active: false };
    }
  }

  return { active: true, session };
}

export function createRedirectRouter(store) {
  const router = Router();

  router.get('/:slug', (req, res) => {
    store.pruneExpiredBlocks();

    const campaign = store.campaigns.find((item) => item.slug === req.params.slug && item.status === 'active');

    if (!campaign) {
      return res.status(404).send('Campanha nao encontrada');
    }

    const input = {
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] || '',
      accept: req.headers.accept || '',
      acceptLanguage: req.headers['accept-language'] || '',
      country: req.headers['cf-ipcountry'] || req.headers['x-country-code'] || req.query.country || '',
      asn: req.headers['x-asn'] || req.headers['cf-asn'] || req.query.asn || '',
      headers: req.headers,
      now: Date.now()
    };

    const test = resolveTestMode(store, req, campaign);
    if (test.active) {
      input.testMode = true;
    }

    const allowSimulate = store.settings?.allowSimulate !== false && config.allowSimulate;
    if (allowSimulate && req.query.simulate === 'bot') {
      input.userAgent = 'curl/8.4.0';
      input.accept = '*/*';
      input.acceptLanguage = '';
    }

    if (allowSimulate && req.query.simulate === 'human') {
      input.userAgent = 'Mozilla/5.0 AppleWebKit/537.36 Chrome/126 Safari/537.36';
      input.accept = 'text/html,application/xhtml+xml';
      input.acceptLanguage = 'pt-BR,pt;q=0.9';
    }

    const result = evaluateRequest(input, campaign, store);

    if (result.decision === 'fallback') {
      trackViolation(input.ip, store, {
        now: input.now,
        autoBlockEnabled: store.settings?.autoBlockEnabled !== false
      });
    }

    const event = {
      id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      campaignSlug: campaign.slug,
      campaignName: campaign.name,
      campaignUserId: campaign.userId || null,
      ip: input.ip,
      userAgent: input.userAgent,
      decision: result.decision,
      riskScore: result.riskScore,
      reasons: result.reasons,
      device: result.device,
      country: result.country || input.country || '',
      asn: result.asn || input.asn || '',
      targetUrl: result.targetUrl,
      createdAt: new Date().toISOString()
    };

    store.events = [event, ...store.events].slice(0, config.maxEvents);
    pushAccessNotification(store, event);
    store.touch();

    return res.redirect(302, result.targetUrl);
  });

  return router;
}
