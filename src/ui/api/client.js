const TOKEN_KEY = 'mycloaker_session_token';
const USER_KEY = 'mycloaker_user';

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
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
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

  login: (username, password) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request('/api/auth/me'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  changePassword: (body) =>
    request('/api/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),

  getUsers: () => request('/api/auth/users'),
  createUser: (body) => request('/api/auth/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id, body) => request(`/api/auth/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteUser: (id) => request(`/api/auth/users/${id}`, { method: 'DELETE' }),

  getCampaigns: () => request('/api/campaigns'),
  createCampaign: (body) => request('/api/campaigns', { method: 'POST', body: JSON.stringify(body) }),
  updateCampaign: (id, body) => request(`/api/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteCampaign: (id) => request(`/api/campaigns/${id}`, { method: 'DELETE' }),
  startCampaignTest: (id) => request(`/api/campaigns/${id}/test-mode`, { method: 'POST' }),

  getEvents: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/events${query ? `?${query}` : ''}`);
  },
  getLocations: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/locations${query ? `?${query}` : ''}`);
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

  getRouteLists: () => request('/api/route-lists'),
  getMyIp: () => request('/api/route-lists/my-ip'),
  addMyIpToWhitelist: () => request('/api/route-lists/my-ip', { method: 'POST' }),
  addRouteListEntry: (list, value) =>
    request(`/api/route-lists/${list}`, { method: 'POST', body: JSON.stringify({ value }) }),
  removeRouteListEntry: (list, value) =>
    request(`/api/route-lists/${list}?value=${encodeURIComponent(value)}`, { method: 'DELETE' }),

  getSettings: () => request('/api/settings'),
  updateSettings: (body) => request('/api/settings', { method: 'PATCH', body: JSON.stringify(body) }),

  getNotifications: () => request('/api/notifications'),
  markNotificationRead: (id) => request(`/api/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request('/api/notifications/read-all', { method: 'POST' })
};
