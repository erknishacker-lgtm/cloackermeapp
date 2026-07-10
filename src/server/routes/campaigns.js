import { Router } from 'express';
import { applyCampaignPatch, toCampaign, validateCampaign } from '../utils/campaign.js';

export function createCampaignsRouter(store) {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(store.campaigns);
  });

  router.get('/:id', (req, res) => {
    const campaign = store.campaigns.find((item) => item.id === req.params.id || item.slug === req.params.id);
    if (!campaign) return res.status(404).json({ errors: ['campaign_not_found'] });
    return res.json(campaign);
  });

  router.post('/', (req, res) => {
    const campaign = toCampaign(req.body || {});
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
    const index = store.campaigns.findIndex((item) => item.id === req.params.id || item.slug === req.params.id);
    if (index === -1) return res.status(404).json({ errors: ['campaign_not_found'] });

    const updated = applyCampaignPatch(store.campaigns[index], req.body || {});
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
    const next = store.campaigns.filter((item) => item.id !== req.params.id && item.slug !== req.params.id);
    if (next.length === store.campaigns.length) {
      return res.status(404).json({ errors: ['campaign_not_found'] });
    }
    store.campaigns = next;
    return res.status(204).send();
  });

  return router;
}
