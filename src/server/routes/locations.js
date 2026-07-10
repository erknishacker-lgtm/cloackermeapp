import { Router } from 'express';
import { filterEventsForUser, requireActiveUser } from '../utils/access.js';
import { countryCentroid, countryFlagEmoji } from '../utils/geo.js';

function isValidCountry(code) {
  const c = String(code || '')
    .trim()
    .toUpperCase();
  return Boolean(c) && c !== 'XX' && c !== 'T1' && c !== '??';
}

function resolveCoords(event) {
  let lat = Number(event.latitude);
  let lng = Number(event.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
    return { latitude: lat, longitude: lng };
  }
  return countryCentroid(event.country);
}

/**
 * Agrega acessos com pais para o mapa e top paises.
 */
export function buildLocationsPayload(events) {
  const withCountry = (events || []).filter((event) => isValidCountry(event.country));

  const byCountry = new Map();
  for (const event of withCountry) {
    const code = String(event.country).toUpperCase();
    const prev = byCountry.get(code) || {
      country: code,
      flag: countryFlagEmoji(code),
      count: 0,
      cities: new Map(),
      latitude: null,
      longitude: null
    };
    prev.count += 1;
    if (event.city) {
      prev.cities.set(event.city, (prev.cities.get(event.city) || 0) + 1);
    }
    const coords = resolveCoords(event);
    if (coords && prev.latitude === null) {
      prev.latitude = coords.latitude;
      prev.longitude = coords.longitude;
    }
    byCountry.set(code, prev);
  }

  const topCountries = [...byCountry.values()]
    .map((item) => ({
      country: item.country,
      flag: item.flag,
      count: item.count,
      city:
        [...item.cities.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ||
        '',
      latitude: item.latitude,
      longitude: item.longitude
    }))
    .sort((a, b) => b.count - a.count);

  const mapPins = topCountries
    .filter((item) => item.latitude != null && item.longitude != null)
    .map((item) => ({
      lat: item.latitude,
      lng: item.longitude,
      country: item.country,
      flag: item.flag,
      city: item.city || '—',
      count: item.count
    }));

  const recent = withCountry.slice(0, 100).map((event) => {
    const coords = resolveCoords(event);
    return {
      id: event.id,
      country: event.country,
      flag: countryFlagEmoji(event.country),
      city: event.city || '',
      region: event.region || '',
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      decision: event.decision,
      device: event.device,
      ip: event.ip,
      campaignName: event.campaignName,
      createdAt: event.createdAt
    };
  });

  return {
    total: withCountry.length,
    located: mapPins.length,
    topCountries,
    mapPins,
    recent
  };
}

export function createLocationsRouter(store) {
  const router = Router();

  router.get('/', (req, res) => {
    const user = requireActiveUser(req, res);
    if (!user) return undefined;

    const limit = Math.min(Number(req.query.limit || 500), 2000);
    const events = filterEventsForUser(store.events, store.campaigns, user).slice(0, limit);
    return res.json(buildLocationsPayload(events));
  });

  return router;
}
