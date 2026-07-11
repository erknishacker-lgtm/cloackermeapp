import { isAdminUser, isUserActive, OWNER_ID } from './users.js';

export function getAuthUser(req) {
  return req.authUser || null;
}

export function requireActiveUser(req, res) {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ errors: ['unauthorized'], message: 'Faca login.' });
    return null;
  }
  if (!isUserActive(user) && !isAdminUser(user)) {
    res.status(403).json({ errors: ['user_disabled'], message: 'Usuario desativado. Contate o admin.' });
    return null;
  }
  return user;
}

export function requireAdmin(req, res) {
  const user = requireActiveUser(req, res);
  if (!user) return null;
  if (!isAdminUser(user)) {
    res.status(403).json({ errors: ['forbidden'], message: 'Apenas o admin pode fazer isso.' });
    return null;
  }
  return user;
}

export function canAccessCampaign(user, campaign) {
  if (!user || !campaign) return false;
  if (isAdminUser(user)) return true;
  return campaign.userId === user.id;
}

export function filterCampaignsForUser(campaigns, user) {
  if (!user) return [];
  if (isAdminUser(user)) return campaigns || [];
  return (campaigns || []).filter((item) => item.userId === user.id);
}

export function ownedCampaignSlugs(campaigns, user) {
  return new Set(filterCampaignsForUser(campaigns, user).map((item) => item.slug));
}

export function filterEventsForUser(events, campaigns, user) {
  if (!user) return [];
  if (isAdminUser(user)) return events || [];

  const owned = filterCampaignsForUser(campaigns, user);
  const slugs = new Set(owned.map((item) => item.slug).filter(Boolean));
  const ids = new Set(owned.map((item) => item.id).filter(Boolean));

  return (events || []).filter((event) => {
    // Eventos novos gravam o dono da campanha
    if (event.campaignUserId && event.campaignUserId === user.id) return true;
    // Fallback por slug / id da campanha
    if (event.campaignSlug && slugs.has(event.campaignSlug)) return true;
    if (event.campaignId && ids.has(event.campaignId)) return true;
    return false;
  });
}

export function assignMissingCampaignOwners(campaigns, ownerId = OWNER_ID) {
  return (campaigns || []).map((campaign) => ({
    ...campaign,
    userId: campaign.userId || ownerId
  }));
}
