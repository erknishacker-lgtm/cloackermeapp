import { Router } from 'express';
import { config } from '../config.js';
import { evaluateRequest, trackViolation } from '../security.js';
import { extractVisitorGeo } from '../utils/geo.js';
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

  if (session.campaignSlug && session.campaignSlug !== campaign.slug) {
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

    const geo = extractVisitorGeo(req);

    // ASN: Cloudflare so manda se Transform Rule / Worker expor; aceita varios nomes comuns.
    const asnHeader =
      req.headers['cf-asn'] ||
      req.headers['x-asn'] ||
      req.headers['x-as-number'] ||
      req.headers['x-client-asn'] ||
      req.headers['as-number'] ||
      req.query.asn ||
      '';

    const input = {
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] || '',
      accept: req.headers.accept || '',
      acceptLanguage: req.headers['accept-language'] || '',
      country: geo.country || req.query.country || '',
      asn: asnHeader,
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
      campaignId: campaign.id || null,
      campaignSlug: campaign.slug,
      campaignName: campaign.name,
      campaignUserId: campaign.userId || null,
      ip: input.ip,
      userAgent: input.userAgent,
      decision: result.decision,
      riskScore: result.riskScore,
      reasons: result.reasons,
      device: result.device,
      country: result.country || geo.country || '',
      city: geo.city || '',
      region: geo.region || '',
      latitude: geo.latitude,
      longitude: geo.longitude,
      timezone: geo.timezone || 'UTC',
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
