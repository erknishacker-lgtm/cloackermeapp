const TOKEN_KEY = 'mycloaker_admin_token';

export function getAdminToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setAdminToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function clearAdminToken() {
  setAdminToken('');
}

async function parse(response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function request(path, options = {}) {
  const token = getAdminToken();
  const headers = {
    'content-type': 'application/json',
    ...(options.headers || {})
  };
  if (token) {
    headers['x-admin-token'] = token;
  }

  const response = await fetch(path, {
    ...options,
    headers
  });
  const payload = await parse(response);
  return { response, payload, ok: response.ok, status: response.status };
}

export const api = {
  health: () => request('/health'),
  getCampaigns: () => request('/api/campaigns'),
  createCampaign: (body) => request('/api/campaigns', { method: 'POST', body: JSON.stringify(body) }),
  updateCampaign: (id, body) => request(`/api/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteCampaign: (id) => request(`/api/campaigns/${id}`, { method: 'DELETE' }),

  getEvents: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/events${query ? `?${query}` : ''}`);
  },
  getStats: () => request('/api/stats'),

  getDomains: () => request('/api/domains'),
  createDomain: (domain) => request('/api/domains', { method: 'POST', body: JSON.stringify({ domain }) }),
  updateDomain: (id, body) => request(`/api/domains/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteDomain: (id) => request(`/api/domains/${id}`, { method: 'DELETE' }),

  getBlockedIps: () => request('/api/blocked-ips'),
  createBlockedIp: (ip, reason) =>
    request('/api/blocked-ips', { method: 'POST', body: JSON.stringify({ ip, reason }) }),
  deleteBlockedIp: (ip) => request(`/api/blocked-ips/${encodeURIComponent(ip)}`, { method: 'DELETE' }),

  getSettings: () => request('/api/settings'),
  updateSettings: (body) => request('/api/settings', { method: 'PATCH', body: JSON.stringify(body) })
};
