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
      const [campaignsRes, eventsRes, statsRes, domainsRes, blockedRes, settingsRes] = await Promise.all([
        api.getCampaigns(),
        api.getEvents({ limit: 100 }),
        api.getStats(),
        api.getDomains(),
        api.getBlockedIps(),
        api.getSettings()
      ]);

      if (campaignsRes.status === 401) {
        setError('Sessao expirada. Entre novamente com usuario e senha.');
        return;
      }
      if (!campaignsRes.ok) throw new Error('Falha ao carregar campanhas');

      setCampaigns(campaignsRes.payload || []);
      setEvents(eventsRes.payload || []);
      setStats({ ...emptyStats, ...(statsRes.payload || {}) });
      setDomains(domainsRes.payload || { global: [], custom: [] });
      setBlockedIps(blockedRes.payload || []);
      if (settingsRes.ok && settingsRes.payload) setSettings(settingsRes.payload);
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
        setMessage(`Nao foi possivel criar: ${payload?.errors?.join(', ') || 'erro desconhecido'}`);
        return;
      }
      setMessage(`Campanha criada: /r/${payload.slug}`);
      setForm({ ...initialForm, domain: form.domain });
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

  return {
    form,
    updateField,
    submitCampaign,
    campaigns,
    updateCampaign,
    deleteCampaign,
    events,
    domains,
    createDomain,
    updateDomain,
    deleteDomain,
    blockedIps,
    createBlockedIp,
    deleteBlockedIp,
    settings,
    saveSettings,
    stats,
    message,
    loading,
    error,
    refreshData
  };
}
