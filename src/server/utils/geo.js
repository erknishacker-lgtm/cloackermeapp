/** Centros aproximados por pais (fallback quando CF nao manda lat/lng). */
const COUNTRY_CENTROIDS = {
  AF: [33.9, 67.7],
  AL: [41.2, 20.2],
  DZ: [28.0, 1.7],
  AR: [-38.4, -63.6],
  AU: [-25.3, 133.8],
  AT: [47.5, 14.6],
  BD: [23.7, 90.4],
  BE: [50.5, 4.5],
  BO: [-16.3, -63.6],
  BR: [-14.2, -51.9],
  BG: [42.7, 25.5],
  CA: [56.1, -106.3],
  CL: [-35.7, -71.5],
  CN: [35.9, 104.2],
  CO: [4.6, -74.3],
  CR: [9.7, -83.8],
  HR: [45.1, 15.2],
  CZ: [49.8, 15.5],
  DK: [56.3, 9.5],
  DO: [18.7, -70.2],
  EC: [-1.8, -78.2],
  EG: [26.8, 30.8],
  SV: [13.8, -88.9],
  EE: [58.6, 25.0],
  FI: [61.9, 25.7],
  FR: [46.2, 2.2],
  DE: [51.2, 10.5],
  GH: [7.9, -1.0],
  GR: [39.1, 21.8],
  GT: [15.8, -90.2],
  HN: [15.2, -86.2],
  HK: [22.3, 114.2],
  HU: [47.2, 19.5],
  IS: [64.96, -19.0],
  IN: [20.6, 78.9],
  ID: [-0.8, 113.9],
  IE: [53.1, -7.7],
  IL: [31.0, 34.9],
  IT: [41.9, 12.6],
  JP: [36.2, 138.3],
  KE: [-0.0, 37.9],
  KR: [35.9, 127.8],
  LV: [56.9, 24.6],
  LT: [55.2, 23.9],
  LU: [49.8, 6.1],
  MY: [4.2, 101.9],
  MX: [23.6, -102.5],
  MA: [31.8, -7.1],
  NL: [52.1, 5.3],
  NZ: [-40.9, 174.9],
  NG: [9.1, 8.7],
  NO: [60.5, 8.5],
  PK: [30.4, 69.3],
  PA: [8.5, -80.8],
  PY: [-23.4, -58.4],
  PE: [-9.2, -75.0],
  PH: [12.9, 121.8],
  PL: [51.9, 19.1],
  PT: [39.4, -8.2],
  PR: [18.2, -66.6],
  RO: [45.9, 24.9],
  RU: [61.5, 105.3],
  SA: [23.9, 45.1],
  RS: [44.0, 21.0],
  SG: [1.4, 103.8],
  SK: [48.7, 19.7],
  ZA: [-30.6, 22.9],
  ES: [40.5, -3.7],
  SE: [60.1, 18.6],
  CH: [46.8, 8.2],
  TW: [23.7, 121.0],
  TH: [15.9, 100.9],
  TR: [38.9, 35.2],
  UA: [48.4, 31.2],
  AE: [23.4, 53.8],
  GB: [55.4, -3.4],
  US: [37.1, -95.7],
  UY: [-32.5, -55.8],
  VE: [6.4, -66.6],
  VN: [14.1, 108.3]
};

function header(req, ...names) {
  const headers = req.headers || {};
  for (const name of names) {
    const value = headers[name];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

function parseCoord(value) {
  const n = Number.parseFloat(String(value || '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function countryCentroid(countryCode) {
  const code = String(countryCode || '')
    .trim()
    .toUpperCase();
  if (!code || code === 'XX' || code === 'T1') return null;
  const pair = COUNTRY_CENTROIDS[code];
  if (!pair) return null;
  return { latitude: pair[0], longitude: pair[1] };
}

/**
 * Extrai geo do Cloudflare (e fallbacks).
 * Pais: sempre disponivel com CF proxy.
 * Cidade/lat/lng: se "Add visitor location headers" estiver ativo nas Transform Rules.
 */
export function extractVisitorGeo(req) {
  const countryRaw = header(req, 'cf-ipcountry', 'x-country-code', 'x-vercel-ip-country');
  const country = countryRaw.toUpperCase();
  const city = header(req, 'cf-ipcity', 'x-city', 'x-vercel-ip-city');
  const region = header(req, 'cf-region', 'cf-ipregion', 'cf-region-code', 'x-region');
  const timezone = header(req, 'cf-timezone', 'x-timezone') || 'UTC';
  let latitude = parseCoord(header(req, 'cf-iplatitude', 'cf-ip-latitude', 'x-latitude'));
  let longitude = parseCoord(header(req, 'cf-iplongitude', 'cf-ip-longitude', 'x-longitude'));

  if ((latitude === null || longitude === null) && country) {
    const center = countryCentroid(country);
    if (center) {
      latitude = latitude ?? center.latitude;
      longitude = longitude ?? center.longitude;
    }
  }

  return {
    country: country && country !== 'XX' ? country : '',
    city: city || '',
    region: region || '',
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    timezone: timezone || 'UTC',
    hasCountry: Boolean(country && country !== 'XX' && country !== 'T1')
  };
}

export function countryFlagEmoji(countryCode) {
  const code = String(countryCode || '')
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || code === 'XX') return '🌐';
  const base = 127397;
  return String.fromCodePoint(base + code.charCodeAt(0), base + code.charCodeAt(1));
}
