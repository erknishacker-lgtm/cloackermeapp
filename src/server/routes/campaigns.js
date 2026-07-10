import { Router } from 'express';
import { canAccessCampaign, filterCampaignsForUser, requireActiveUser } from '../utils/access.js';
import { applyCampaignPatch, toCampaign, validateCampaign } from '../utils/campaign.js';
import { createSessionToken } from '../utils/password.js';
import { getClientIp } from '../utils/ip.js';

const TEST_TTL_MS = 60 * 60_000;

export function createCampaignsRouter(store) {
  const router = Router();

  router.get('/', (req, res) => {
    const user = requireActiveUser(req, res);
    if (!user) return undefined;
    return res.json(filterCampaignsForUser(store.campaigns, user));
  });

  router.get('/:id', (req, res) => {
    const user = requireActiveUser(req, res);
    if (!user) return undefined;

    const campaign = store.campaigns.find((item) => item.id === req.params.id || item.slug === req.params.id);
    if (!campaign || !canAccessCampaign(user, campaign)) {
      return res.status(404).json({ errors: ['campaign_not_found'] });
    }
    return res.json(campaign);
  });

  router.post('/', (req, res) => {
    const user = requireActiveUser(req, res);
    if (!user) return undefined;

    const campaign = toCampaign({ ...(req.body || {}), userId: user.id });
    const errors = validateCampaign(campaign);

    if (errors.length) {
      return res.status(400).json({ errors });
    }

    if (store.campaigns.some((item) => item.slug === campaign.slug)) {
      return res.status(409).json({ errors: ['slug_already_exists'] });
    }

    store.campaigns = [campaign, ...store.campaigns];
    return res.status(201).json(campaign);
  });

  router.patch('/:id', (req, res) => {
    const user = requireActiveUser(req, res);
    if (!user) return undefined;

    const index = store.campaigns.findIndex((item) => item.id === req.params.id || item.slug === req.params.id);
    if (index === -1 || !canAccessCampaign(user, store.campaigns[index])) {
      return res.status(404).json({ errors: ['campaign_not_found'] });
    }

    const body = { ...(req.body || {}) };
    delete body.userId;

    const updated = applyCampaignPatch(store.campaigns[index], body);
    updated.userId = store.campaigns[index].userId;
    const errors = validateCampaign(updated);
    if (errors.length) return res.status(400).json({ errors });

    if (store.campaigns.some((item, i) => i !== index && item.slug === updated.slug)) {
      return res.status(409).json({ errors: ['slug_already_exists'] });
    }

    const next = [...store.campaigns];
    next[index] = updated;
    store.campaigns = next;
    return res.json(updated);
  });

  router.delete('/:id', (req, res) => {
    const user = requireActiveUser(req, res);
    if (!user) return undefined;

    const campaign = store.campaigns.find((item) => item.id === req.params.id || item.slug === req.params.id);
    if (!campaign || !canAccessCampaign(user, campaign)) {
      return res.status(404).json({ errors: ['campaign_not_found'] });
    }

    store.campaigns = store.campaigns.filter((item) => item.id !== campaign.id);
    return res.status(204).send();
  });

  /**
   * Modo teste rapido: cookie test_mode + IP do criador do token
   * libera URL principal por 1h (nao substitui whitelist).
   */
  router.post('/:id/test-mode', (req, res) => {
    const user = requireActiveUser(req, res);
    if (!user) return undefined;

    const campaign = store.campaigns.find((item) => item.id === req.params.id || item.slug === req.params.id);
    if (!campaign || !canAccessCampaign(user, campaign)) {
      return res.status(404).json({ errors: ['campaign_not_found'] });
    }

    const token = createSessionToken().slice(0, 32);
    const ip = getClientIp(req);
    const expiresAt = new Date(Date.now() + TEST_TTL_MS).toISOString();

    store.testModes.set(token, {
      token,
      userId: user.id,
      campaignId: campaign.id,
      campaignSlug: campaign.slug,
      ip,
      expiresAt,
      createdAt: new Date().toISOString()
    });
    store.touch();

    const maxAge = Math.floor(TEST_TTL_MS / 1000);
    res.setHeader(
      'Set-Cookie',
      `test_mode=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax; HttpOnly`
    );

    return res.json({
      ok: true,
      token,
      expiresAt,
      testUrl: `/r/${campaign.slug}?test=1`,
      message: 'Cookie de teste criado. Abra o link em nova aba no mesmo navegador/IP.'
    });
  });

  return router;
}
