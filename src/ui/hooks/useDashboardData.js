import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { initialForm } from '../constants.js';

const emptyStats = {
  total: 0,
  allowed: 0,
  fallback: 0,
  white: 0,
  black: 0,
  blocked: 0,
  mobile: 0,
  desktop: 0,
  campaigns: 0,
  topCountries: [],
  topReasons: [],
  topCampaigns: [],
  topIps: [],
  today: { total: 0, allowed: 0, fallback: 0, blocked: 0 },
  week: { total: 0, fallback: 0 },
  month: { total: 0, fallback: 0 }
};

export function useDashboardData({ enabled = true } = {}) {
  const [form, setForm] = useState(initialForm);
  const [campaigns, setCampaigns] = useState([]);
  const [events, setEvents] = useState([]);
  const [domains, setDomains] = useState({ global: [], custom: [] });
  const [blockedIps, setBlockedIps] = useState([]);
  const [routeLists, setRouteLists] = useState({
    uaBlacklist: [],
    ipBlacklist: [],
    ipWhitelist: []
  });
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({
    allowSimulate: true,
    autoBlockEnabled: true,
    accessNotificationsEnabled: true,
    operatorEmail: 'louzada@cloaker.lol',
    supportWhatsapp: ''
  });
  const [stats, setStats] = useState(emptyStats);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refreshData = useCallback(async () => {
    if (!enabled) return;
    try {
      const [campaignsRes, eventsRes, statsRes, domainsRes, settingsRes] = await Promise.all([
        api.getCampaigns(),
        api.getEvents({ limit: 1000 }),
        api.getStats(),
        api.getDomains(),
        api.getSettings()
      ]);

      if (campaignsRes.status === 401) {
        setError('Sessao expirada. Entre novamente com usuario e senha.');
        return;
      }
      if (!campaignsRes.ok) throw new Error('Falha ao carregar campanhas');

      const nextEvents = Array.isArray(eventsRes.payload) ? eventsRes.payload : [];
      setCampaigns(campaignsRes.payload || []);
      setEvents(nextEvents);

      // Stats oficiais da API; se falhar, calcula a partir dos eventos carregados
      if (statsRes.ok && statsRes.payload && typeof statsRes.payload.total === 'number') {
        setStats({ ...emptyStats, ...statsRes.payload });
      } else {
        const allowed = nextEvents.filter((e) => e.decision === 'allow').length;
        const fallback = nextEvents.filter((e) => e.decision === 'fallback').length;
        setStats({
          ...emptyStats,
          total: nextEvents.length,
          allowed,
          fallback,
          white: allowed,
          black: fallback,
          mobile: nextEvents.filter((e) => e.device === 'mobile').length,
          desktop: nextEvents.filter((e) => e.device !== 'mobile').length,
          campaigns: Array.isArray(campaignsRes.payload) ? campaignsRes.payload.length : 0
        });
      }

      setDomains(domainsRes.payload || { global: [], custom: [] });
      if (settingsRes.ok && settingsRes.payload) setSettings(settingsRes.payload);

      // Listas: cada usuario tem as suas. Bloqueios globais: so admin.
      const [blockedRes, listsRes] = await Promise.all([api.getBlockedIps(), api.getRouteLists()]);
      if (blockedRes.ok) setBlockedIps(blockedRes.payload || []);
      else setBlockedIps([]);
      if (listsRes.ok && listsRes.payload) {
        setRouteLists({
          uaBlacklist: listsRes.payload.uaBlacklist || [],
          ipBlacklist: listsRes.payload.ipBlacklist || [],
          ipWhitelist: listsRes.payload.ipWhitelist || []
        });
      } else {
        setRouteLists({ uaBlacklist: [], ipBlacklist: [], ipWhitelist: [] });
      }

      setError('');
    } catch {
      setError('Backend indisponivel. Verifique o deploy no EasyPanel.');
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) refreshData();
  }, [enabled, refreshData]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitCampaign(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { response, payload } = await api.createCampaign(form);
      if (!response.ok) {
        setMessage(`Nao foi possivel criar: ${payload?.errors?.join(', ') || payload?.message || 'erro desconhecido'}`);
        return;
      }
      const host = String(payload.domain || form.domain || (typeof window !== 'undefined' ? window.location.host : 'cloaker.lol'))
        .replace(/^https?:\/\//i, '')
        .replace(/\/$/, '');
      const full = `https://${host}/r/${payload.slug}`;
      setMessage(`Cloaker criado. Link mascarado: ${full}`);
      try {
        await navigator.clipboard.writeText(full);
        setMessage(`Cloaker criado. Link copiado: ${full}`);
      } catch {
        // clipboard pode falhar sem HTTPS
      }
      setForm({ ...initialForm, domain: form.domain || host });
      await refreshData();
    } catch {
      setMessage('Falha ao conectar no backend.');
    } finally {
      setLoading(false);
    }
  }

  async function updateCampaign(id, body) {
    try {
      const { response, payload } = await api.updateCampaign(id, body);
      if (!response.ok) return { ok: false, message: payload?.errors?.join(', ') || 'Erro ao atualizar.' };
      await refreshData();
      return { ok: true };
    } catch {
      return { ok: false, message: 'Falha ao conectar no backend.' };
    }
  }

  async function deleteCampaign(id) {
    try {
      const { response } = await api.deleteCampaign(id);
      if (!response.ok) return { ok: false, message: 'Erro ao excluir campanha.' };
      await refreshData();
      return { ok: true };
    } catch {
      return { ok: false, message: 'Falha ao conectar no backend.' };
    }
  }

  async function createDomain(domain) {
    try {
      const { response, payload } = await api.createDomain(domain);
      if (!response.ok) return { ok: false, message: payload?.errors?.join(', ') || 'Erro ao adicionar dominio.' };
      await refreshData();
      return { ok: true };
    } catch {
      return { ok: false, message: 'Falha ao conectar no backend.' };
    }
  }

  async function updateDomain(id, changes) {
    try {
      const { response, payload } = await api.updateDomain(id, changes);
      if (!response.ok) return { ok: false, message: payload?.errors?.join(', ') || 'Erro ao atualizar dominio.' };
      await refreshData();
      return { ok: true };
    } catch {
      return { ok: false, message: 'Falha ao conectar no backend.' };
    }
  }

  async function deleteDomain(id) {
    try {
      const { response } = await api.deleteDomain(id);
      if (!response.ok) return { ok: false, message: 'Erro ao excluir dominio.' };
      await refreshData();
      return { ok: true };
    } catch {
      return { ok: false, message: 'Falha ao conectar no backend.' };
    }
  }

  async function createBlockedIp(ip, reason) {
    try {
      const { response, payload } = await api.createBlockedIp(ip, reason);
      if (!response.ok) return { ok: false, message: payload?.errors?.join(', ') || 'Erro ao bloquear IP.' };
      await refreshData();
      return { ok: true };
    } catch {
      return { ok: false, message: 'Falha ao conectar no backend.' };
    }
  }

  async function deleteBlockedIp(ip) {
    try {
      const { response } = await api.deleteBlockedIp(ip);
      if (!response.ok) return { ok: false, message: 'Erro ao remover IP.' };
      await refreshData();
      return { ok: true };
    } catch {
      return { ok: false, message: 'Falha ao conectar no backend.' };
    }
  }

  async function addRouteListEntry(list, value) {
    try {
      const { response, payload } = await api.addRouteListEntry(list, value);
      if (!response.ok) {
        return { ok: false, message: payload?.message || payload?.errors?.join(', ') || 'Erro ao adicionar.' };
      }
      setRouteLists({
        uaBlacklist: payload.uaBlacklist || [],
        ipBlacklist: payload.ipBlacklist || [],
        ipWhitelist: payload.ipWhitelist || []
      });
      return { ok: true };
    } catch {
      return { ok: false, message: 'Falha ao conectar no backend.' };
    }
  }

  async function removeRouteListEntry(list, value) {
    try {
      const { response, payload } = await api.removeRouteListEntry(list, value);
      if (!response.ok) {
        return { ok: false, message: payload?.message || 'Erro ao remover.' };
      }
      setRouteLists({
        uaBlacklist: payload.uaBlacklist || [],
        ipBlacklist: payload.ipBlacklist || [],
        ipWhitelist: payload.ipWhitelist || []
      });
      return { ok: true };
    } catch {
      return { ok: false, message: 'Falha ao conectar no backend.' };
    }
  }

  async function saveSettings(body) {
    try {
      const { response, payload } = await api.updateSettings(body);
      if (!response.ok) return { ok: false, message: 'Erro ao salvar configuracoes.' };
      setSettings(payload);
      return { ok: true };
    } catch {
      return { ok: false, message: 'Falha ao conectar no backend.' };
    }
  }

  async function changePassword(body) {
    try {
      const { response, payload } = await api.changePassword(body);
      if (!response.ok) {
        return { ok: false, message: payload?.message || payload?.errors?.join(', ') || 'Erro ao trocar senha.' };
      }
      return { ok: true };
    } catch {
      return { ok: false, message: 'Falha ao conectar no backend.' };
    }
  }

  const refreshUsers = useCallback(async () => {
    try {
      const { response, payload } = await api.getUsers();
      if (response.ok) setUsers(payload || []);
      else setUsers([]);
    } catch {
      setUsers([]);
    }
  }, []);

  async function createUser(body) {
    try {
      const { response, payload } = await api.createUser(body);
      if (!response.ok) {
        return { ok: false, message: payload?.message || payload?.errors?.join(', ') || 'Erro ao criar.' };
      }
      await refreshUsers();
      return {
        ok: true,
        temporaryPassword: payload?.temporaryPassword,
        message: payload?.message
      };
    } catch {
      return { ok: false, message: 'Falha ao conectar no backend.' };
    }
  }

  async function updateUser(id, body) {
    try {
      const { response, payload } = await api.updateUser(id, body);
      if (!response.ok) {
        return { ok: false, message: payload?.message || 'Erro ao atualizar.' };
      }
      await refreshUsers();
      return { ok: true };
    } catch {
      return { ok: false, message: 'Falha ao conectar no backend.' };
    }
  }

  async function deleteUser(id) {
    try {
      const { response, payload } = await api.deleteUser(id);
      if (!response.ok) {
        return { ok: false, message: payload?.message || 'Erro ao excluir.' };
      }
      await refreshUsers();
      return { ok: true };
    } catch {
      return { ok: false, message: 'Falha ao conectar no backend.' };
    }
  }

  async function startCampaignTest(campaign) {
    try {
      const { response, payload } = await api.startCampaignTest(campaign.id || campaign.slug);
      if (!response.ok) {
        setMessage(payload?.message || 'Nao foi possivel iniciar o teste.');
        return { ok: false };
      }
      const url = payload?.testUrl || `/r/${campaign.slug}?test=1`;
      window.open(url, '_blank', 'noopener,noreferrer');
      setMessage('Modo teste ativo por 1h neste navegador/IP. Nova aba aberta na URL principal.');
      return { ok: true };
    } catch {
      setMessage('Falha ao conectar no backend.');
      return { ok: false };
    }
  }

  return {
    form,
    updateField,
    submitCampaign,
    campaigns,
    updateCampaign,
    deleteCampaign,
    startCampaignTest,
    events,
    domains,
    createDomain,
    updateDomain,
    deleteDomain,
    blockedIps,
    createBlockedIp,
    deleteBlockedIp,
    routeLists,
    addRouteListEntry,
    removeRouteListEntry,
    users,
    refreshUsers,
    createUser,
    updateUser,
    deleteUser,
    settings,
    saveSettings,
    changePassword,
    stats,
    message,
    loading,
    error,
    refreshData
  };
}
