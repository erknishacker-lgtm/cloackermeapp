import { useEffect, useMemo, useState } from 'react';
import {
  Copy,
  CreditCard,
  KeyRound,
  Receipt,
  Save,
  Settings,
  Shield,
  User
} from '../icons.jsx';
import { api, clearAdminToken, setStoredUser } from '../api/client.js';
import { EmptyState } from '../components/EmptyState.jsx';
import { Field } from '../components/Field.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { getPlanById } from '../constants/plans.js';

const TABS = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'security', label: 'Seguranca', icon: Shield },
  { id: 'subscription', label: 'Assinaturas', icon: Receipt },
  { id: 'payments', label: 'Pagamentos', icon: CreditCard },
  { id: 'payment-methods', label: 'Metodos de pagamento', icon: CreditCard },
  { id: 'api-keys', label: 'Chaves de API', icon: KeyRound }
];

function initialFrom(settings = {}, user = {}) {
  return {
    displayName: settings.displayName || user.displayName || user.username || '',
    phone: settings.phone || settings.supportWhatsapp || '',
    operatorEmail: settings.operatorEmail || user.email || '',
    country: settings.country || 'BR',
    document: settings.document || '',
    accessNotificationsEnabled: settings.accessNotificationsEnabled !== false,
    allowSimulate: settings.allowSimulate !== false,
    autoBlockEnabled: settings.autoBlockEnabled !== false,
    planId: settings.planId || 'start',
    apiKey: settings.apiKey || '',
    invoices: Array.isArray(settings.invoices) ? settings.invoices : [],
    paymentMethods: Array.isArray(settings.paymentMethods) ? settings.paymentMethods : []
  };
}

export function SettingsPage({
  settings,
  saveSettings,
  changePassword,
  isAdmin,
  user,
  setActivePage,
  eventsCount = 0,
  domainsCount = 0
}) {
  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState(() => initialFrom(settings, user));
  const [message, setMessage] = useState('');
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdMessage, setPwdMessage] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [totpEnabled, setTotpEnabled] = useState(Boolean(user?.totpEnabled));
  const [totpSetup, setTotpSetup] = useState(null); // { secret, qrUrl, otpauthUrl }
  const [totpCode, setTotpCode] = useState('');
  const [totpBusy, setTotpBusy] = useState(false);
  const [disablePwd, setDisablePwd] = useState('');
  const [disableCode, setDisableCode] = useState('');

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  useEffect(() => {
    setForm(initialFrom(settings, user));
    setTotpEnabled(Boolean(user?.totpEnabled));
  }, [settings, user]);

  useEffect(() => {
    if (tab !== 'security') return undefined;
    let cancelled = false;
    (async () => {
      try {
        const status = await api.get2faStatus();
        if (!cancelled && status.ok) setTotpEnabled(Boolean(status.payload?.enabled));
      } catch {
        // ignore
      }
      setSessionsLoading(true);
      try {
        const res = await api.getSessions();
        if (!cancelled && res.ok) setSessions(res.payload?.sessions || []);
      } catch {
        if (!cancelled) setSessions([]);
      } finally {
        if (!cancelled) setSessionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  async function start2faSetup() {
    setTotpBusy(true);
    setMessage('');
    try {
      const res = await api.setup2fa();
      if (!res.ok) {
        setMessage(res.payload?.message || 'Nao foi possivel iniciar o 2FA.');
        return;
      }
      setTotpSetup(res.payload);
      setTotpCode('');
    } finally {
      setTotpBusy(false);
    }
  }

  async function confirm2faEnable(event) {
    event.preventDefault();
    setTotpBusy(true);
    setMessage('');
    try {
      const res = await api.enable2fa(totpCode.trim());
      if (!res.ok) {
        setMessage(res.payload?.message || 'Codigo invalido.');
        return;
      }
      setTotpEnabled(true);
      setTotpSetup(null);
      setTotpCode('');
      if (res.payload?.user) setStoredUser(res.payload.user);
      setMessage('2FA ativado. No proximo login sera pedido o codigo do app.');
    } finally {
      setTotpBusy(false);
    }
  }

  async function confirm2faDisable(event) {
    event.preventDefault();
    setTotpBusy(true);
    setMessage('');
    try {
      const res = await api.disable2fa(disablePwd, disableCode.trim());
      if (!res.ok) {
        setMessage(res.payload?.message || 'Nao foi possivel desativar o 2FA.');
        return;
      }
      setTotpEnabled(false);
      setDisablePwd('');
      setDisableCode('');
      if (res.payload?.user) setStoredUser(res.payload.user);
      setMessage('2FA desativado.');
    } finally {
      setTotpBusy(false);
    }
  }

  async function refreshSessions() {
    setSessionsLoading(true);
    try {
      const res = await api.getSessions();
      if (res.ok) setSessions(res.payload?.sessions || []);
    } finally {
      setSessionsLoading(false);
    }
  }

  async function revokeSession(id) {
    const res = await api.revokeSession(id);
    if (!res.ok) {
      setMessage(res.payload?.message || 'Nao foi possivel encerrar a sessao.');
      return;
    }
    setMessage('Sessao encerrada.');
    refreshSessions();
  }

  async function revokeOthers() {
    const res = await api.revokeOtherSessions();
    if (res.ok) {
      setMessage(`Encerradas ${res.payload?.revoked || 0} outras sessoes.`);
      refreshSessions();
    }
  }

  async function revokeAll() {
    const res = await api.revokeAllSessions();
    if (res.ok) {
      clearAdminToken();
      window.location.reload();
    }
  }

  function formatWhen(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return iso;
    }
  }

  const plan = useMemo(() => getPlanById(form.planId), [form.planId]);
  const initial = (form.displayName || user?.username || 'U').charAt(0).toUpperCase();
  const reqUsed = Math.min(eventsCount || 0, plan.requests);
  const reqPct = Math.min(100, Math.round((reqUsed / plan.requests) * 100));
  const domUsed = Math.min(domainsCount || 0, plan.domains);
  const domPct = Math.min(100, Math.round((domUsed / plan.domains) * 100));

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    const result = await saveSettings({
      displayName: form.displayName,
      phone: form.phone,
      operatorEmail: form.operatorEmail,
      country: form.country,
      document: form.document,
      accessNotificationsEnabled: form.accessNotificationsEnabled,
      allowSimulate: form.allowSimulate,
      autoBlockEnabled: form.autoBlockEnabled
    });
    setSaving(false);
    setMessage(result.ok ? 'Perfil salvo.' : result.message || 'Falha ao salvar.');
  }

  async function saveAddress(event) {
    event.preventDefault();
    setSaving(true);
    const result = await saveSettings({ country: form.country });
    setSaving(false);
    setMessage(result.ok ? 'Endereco atualizado.' : result.message || 'Falha ao salvar.');
  }

  async function saveDocument(event) {
    event.preventDefault();
    setSaving(true);
    const result = await saveSettings({ document: form.document });
    setSaving(false);
    setMessage(result.ok ? 'Documento atualizado.' : result.message || 'Falha ao salvar.');
  }

  async function onChangePassword(event) {
    event.preventDefault();
    setPwdLoading(true);
    setPwdMessage('');
    const result = await changePassword(pwd);
    setPwdLoading(false);
    if (result.ok) {
      setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwdMessage('Senha atualizada. Voce continua logado.');
    } else {
      setPwdMessage(result.message || 'Nao foi possivel trocar a senha.');
    }
  }

  async function selectPlan(planId) {
    setSaving(true);
    const result = await saveSettings({ planId });
    setSaving(false);
    if (result.ok) {
      setForm((c) => ({ ...c, planId }));
      setMessage(`Plano ${getPlanById(planId).name} definido na conta.`);
    } else {
      setMessage(result.message || 'Nao foi possivel alterar o plano.');
    }
  }

  async function regenerateKey() {
    setSaving(true);
    const result = await saveSettings({ regenerateApiKey: true });
    setSaving(false);
    if (result.ok && result.payload?.apiKey) {
      setForm((c) => ({ ...c, apiKey: result.payload.apiKey }));
      setMessage('Nova chave de API gerada. Guarde em local seguro.');
    } else if (result.ok) {
      setMessage('Chave atualizada.');
    } else {
      setMessage(result.message || 'Falha ao gerar chave.');
    }
  }

  async function copyKey() {
    if (!form.apiKey) return;
    try {
      await navigator.clipboard.writeText(form.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setMessage('Nao foi possivel copiar. Selecione o texto manualmente.');
    }
  }

  return (
    <div className="settings-page">
      <PageHeader
        title="Configuracoes"
        breadcrumb="Dashboard / Configuracoes"
        subtitle="Perfil, seguranca, assinatura, pagamentos e API."
        icon={Settings}
      />

      <nav className="settings-tabs" aria-label="Secoes de configuracoes">
        {TABS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`settings-tab ${tab === item.id ? 'active' : ''}`}
              onClick={() => {
                setTab(item.id);
                setMessage('');
              }}
            >
              <Icon size={15} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {message ? <div className="message settings-flash">{message}</div> : null}

      {tab === 'profile' ? (
        <div className="settings-sections">
          <form className="settings-section" onSubmit={saveProfile}>
            <div className="settings-section-copy">
              <h2>Perfil</h2>
              <p>Atualize suas informacoes de nome e telefone.</p>
            </div>
            <div className="settings-section-body">
              <div className="settings-avatar-row">
                <div className="settings-avatar" aria-hidden>
                  {initial}
                </div>
                <div>
                  <button type="button" className="ghost-button" disabled>
                    Alterar avatar
                  </button>
                  <p className="settings-hint">JPG, GIF ou PNG. Maximo 1MB. (em breve)</p>
                </div>
              </div>
              <div className="settings-grid-2">
                <Field label="Nome" required>
                  <input
                    value={form.displayName}
                    onChange={(e) => setForm((c) => ({ ...c, displayName: e.target.value }))}
                    required
                  />
                </Field>
                <Field label="WhatsApp">
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                  />
                </Field>
              </div>
              <Field label="E-mail" required>
                <input
                  type="email"
                  value={form.operatorEmail}
                  onChange={(e) => setForm((c) => ({ ...c, operatorEmail: e.target.value }))}
                  required
                />
              </Field>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={form.accessNotificationsEnabled}
                  onChange={(e) =>
                    setForm((c) => ({ ...c, accessNotificationsEnabled: e.target.checked }))
                  }
                />
                <span>Notificacoes de acessos no sino</span>
              </label>
              {isAdmin ? (
                <>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={form.allowSimulate}
                      onChange={(e) => setForm((c) => ({ ...c, allowSimulate: e.target.checked }))}
                    />
                    <span>Permitir `?simulate=human|bot` nos links (teste)</span>
                  </label>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={form.autoBlockEnabled}
                      onChange={(e) => setForm((c) => ({ ...c, autoBlockEnabled: e.target.checked }))}
                    />
                    <span>Auto-ban de IPs apos violacoes repetidas</span>
                  </label>
                </>
              ) : null}
              <div className="settings-actions">
                <button className="submit-button" type="submit" disabled={saving}>
                  <Save size={16} />
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </form>

          <form className="settings-section" onSubmit={saveAddress}>
            <div className="settings-section-copy">
              <h2>Endereco</h2>
              <p>Atualize seu endereco de cobranca.</p>
            </div>
            <div className="settings-section-body">
              <Field label="Pais" required>
                <select
                  value={form.country}
                  onChange={(e) => setForm((c) => ({ ...c, country: e.target.value }))}
                >
                  <option value="">Selecione um pais...</option>
                  <option value="BR">Brasil</option>
                  <option value="PT">Portugal</option>
                  <option value="US">Estados Unidos</option>
                  <option value="AR">Argentina</option>
                  <option value="MX">Mexico</option>
                </select>
              </Field>
              <div className="settings-actions">
                <button className="submit-button" type="submit" disabled={saving}>
                  Salvar
                </button>
              </div>
            </div>
          </form>

          <form className="settings-section" onSubmit={saveDocument}>
            <div className="settings-section-copy">
              <h2>Documento</h2>
              <p>Atualize o documento para emissao de nota fiscal.</p>
            </div>
            <div className="settings-section-body">
              <Field label="CPF/CNPJ">
                <input
                  value={form.document}
                  onChange={(e) => setForm((c) => ({ ...c, document: e.target.value }))}
                  placeholder="CPF/CNPJ"
                />
              </Field>
              <div className="settings-actions">
                <button className="submit-button" type="submit" disabled={saving}>
                  Salvar
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}

      {tab === 'security' ? (
        <div className="settings-sections">
          <div className="settings-section">
            <div className="settings-section-copy">
              <h2>Autenticacao de dois fatores</h2>
              <p>Adicione uma camada extra de seguranca com um aplicativo autenticador (Google Authenticator, Authy, 1Password…).</p>
            </div>
            <div className="settings-section-body">
              {!totpEnabled && !totpSetup ? (
                <div className="settings-inline-card">
                  <div>
                    <strong>App autenticador</strong>
                    <p className="settings-hint">Recomendamos habilitar para proteger sua conta.</p>
                  </div>
                  <button type="button" className="submit-button" onClick={start2faSetup} disabled={totpBusy}>
                    {totpBusy ? 'Gerando…' : 'Habilitar 2FA'}
                  </button>
                </div>
              ) : null}

              {!totpEnabled && totpSetup ? (
                <form className="settings-2fa-setup" onSubmit={confirm2faEnable}>
                  <p className="settings-hint">
                    1) Escaneie o QR no app · 2) Digite o codigo de 6 digitos para confirmar
                  </p>
                  <div className="settings-2fa-qr">
                    {totpSetup.qrUrl ? (
                      <img src={totpSetup.qrUrl} alt="QR Code 2FA" width={180} height={180} />
                    ) : null}
                    <div>
                      <p className="settings-hint">Chave manual (se nao puder escanear):</p>
                      <code className="mono settings-secret">{totpSetup.secret}</code>
                    </div>
                  </div>
                  <Field label="Codigo do app" required>
                    <input
                      className="mono"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                    />
                  </Field>
                  <div className="settings-actions">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => {
                        setTotpSetup(null);
                        setTotpCode('');
                      }}
                    >
                      Cancelar
                    </button>
                    <button className="submit-button" type="submit" disabled={totpBusy || totpCode.length !== 6}>
                      {totpBusy ? 'Ativando…' : 'Confirmar e ativar'}
                    </button>
                  </div>
                </form>
              ) : null}

              {totpEnabled ? (
                <>
                  <div className="settings-inline-card">
                    <div>
                      <strong>2FA ativo</strong>
                      <p className="settings-hint">Login pede senha + codigo do app autenticador.</p>
                    </div>
                    <span className="settings-chip ok">Ativo</span>
                  </div>
                  <form className="settings-2fa-disable" onSubmit={confirm2faDisable}>
                    <p className="settings-hint">Para desativar, confirme senha e um codigo atual do app.</p>
                    <div className="settings-grid-2">
                      <Field label="Senha" required>
                        <input
                          type="password"
                          value={disablePwd}
                          onChange={(e) => setDisablePwd(e.target.value)}
                          required
                        />
                      </Field>
                      <Field label="Codigo 2FA" required>
                        <input
                          className="mono"
                          value={disableCode}
                          onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          required
                        />
                      </Field>
                    </div>
                    <div className="settings-actions">
                      <button
                        type="submit"
                        className="submit-button ghost"
                        disabled={totpBusy || !disablePwd || disableCode.length !== 6}
                      >
                        Desativar 2FA
                      </button>
                    </div>
                  </form>
                </>
              ) : null}
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-copy">
              <h2>Dispositivos conectados</h2>
              <p>Sessoes ativas da sua conta (aparecem em local e online, com IP e navegador).</p>
            </div>
            <div className="settings-section-body">
              <div className="settings-device-list">
                {sessionsLoading ? (
                  <div className="settings-device-row">
                    <span className="settings-hint">Carregando sessoes…</span>
                  </div>
                ) : null}
                {!sessionsLoading && sessions.length === 0 ? (
                  <div className="settings-device-row">
                    <span className="settings-hint">Nenhuma sessao listada. Faca login de novo se precisar.</span>
                  </div>
                ) : null}
                {sessions.map((s) => (
                  <div className="settings-device-row" key={s.id}>
                    <div>
                      <strong>
                        {s.label || 'Dispositivo'}
                        {s.current ? ' · Este dispositivo' : ''}
                      </strong>
                      <p className="settings-hint">
                        IP {s.ip || '—'} · Ultima atividade {formatWhen(s.lastActiveAt)}
                        {s.createdAt ? ` · Desde ${formatWhen(s.createdAt)}` : ''}
                      </p>
                    </div>
                    {s.current ? (
                      <span className="settings-chip ok">Ativo</span>
                    ) : (
                      <button type="button" className="text-danger-btn" onClick={() => revokeSession(s.id)}>
                        Encerrar sessao
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="settings-plan-actions">
                <button type="button" className="ghost-button" onClick={refreshSessions} disabled={sessionsLoading}>
                  Atualizar lista
                </button>
                <button type="button" className="ghost-button" onClick={revokeOthers}>
                  Sair dos outros dispositivos
                </button>
                <button type="button" className="text-danger-btn" onClick={revokeAll}>
                  Sair de todos os dispositivos
                </button>
              </div>
            </div>
          </div>

          <form className="settings-section" onSubmit={onChangePassword}>
            <div className="settings-section-copy">
              <h2>Atualizar senha</h2>
              <p>Atualize as credenciais de entrada.</p>
            </div>
            <div className="settings-section-body">
              <Field label="Senha atual" required>
                <input
                  type="password"
                  value={pwd.currentPassword}
                  onChange={(e) => setPwd((c) => ({ ...c, currentPassword: e.target.value }))}
                  autoComplete="current-password"
                  required
                />
              </Field>
              <div className="settings-grid-2">
                <Field label="Nova senha" hint="Minimo 6 caracteres" required>
                  <input
                    type="password"
                    value={pwd.newPassword}
                    onChange={(e) => setPwd((c) => ({ ...c, newPassword: e.target.value }))}
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />
                </Field>
                <Field label="Confirme sua senha" required>
                  <input
                    type="password"
                    value={pwd.confirmPassword}
                    onChange={(e) => setPwd((c) => ({ ...c, confirmPassword: e.target.value }))}
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />
                </Field>
              </div>
              {pwdMessage ? <div className="message">{pwdMessage}</div> : null}
              <div className="settings-actions">
                <button
                  className="submit-button"
                  type="submit"
                  disabled={pwdLoading || !pwd.currentPassword || !pwd.newPassword || !pwd.confirmPassword}
                >
                  <KeyRound size={16} />
                  {pwdLoading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}

      {tab === 'subscription' ? (
        <div className="settings-sections">
          <div className="settings-section">
            <div className="settings-section-copy">
              <h2>Assinatura</h2>
              <p>Aqui voce pode gerenciar sua assinatura zGhost.</p>
            </div>
            <div className="settings-section-body">
              <div className="settings-plan-card">
                <div className="settings-plan-top">
                  <div>
                    <span className="settings-hint">zGhost</span>
                    <h3>
                      {plan.name}{' '}
                      <span className="settings-chip ok">Ativo</span>
                    </h3>
                  </div>
                  <div className="settings-plan-price">
                    <strong>{plan.priceLabel}</strong>
                    <span>/ mes</span>
                  </div>
                  <div className="settings-plan-price">
                    <span className="settings-hint">Proximo ciclo</span>
                    <strong>Renovacao mensal</strong>
                  </div>
                </div>

                <div className="settings-usage">
                  <div className="settings-usage-row">
                    <span>Limite de requisicoes</span>
                    <span className="mono">
                      {reqUsed.toLocaleString('pt-BR')} / {plan.requests.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="settings-usage-bar">
                    <i style={{ width: `${reqPct}%` }} />
                  </div>
                  <div className="settings-usage-row">
                    <span>Limite de dominios</span>
                    <span className="mono">
                      {domUsed} / {plan.domains}
                    </span>
                  </div>
                  <div className="settings-usage-bar">
                    <i style={{ width: `${domPct}%` }} />
                  </div>
                </div>

                <div className="settings-plan-actions">
                  <button type="button" className="ghost-button" onClick={() => setActivePage?.('plans')}>
                    Ver todos os planos
                  </button>
                  {['start', 'platinum', 'ghost']
                    .filter((id) => id !== plan.id)
                    .map((id) => (
                      <button
                        key={id}
                        type="button"
                        className="submit-button ghost"
                        disabled={saving}
                        onClick={() => selectPlan(id)}
                      >
                        Mudar para {getPlanById(id).name}
                      </button>
                    ))}
                </div>
              </div>

              <div className="settings-how panel soft">
                <h3>Como o plano funciona</h3>
                <ul>
                  <li>
                    <strong>Start (R$ 147)</strong> — 1 dominio · ate 10 mil requisicoes/mes
                  </li>
                  <li>
                    <strong>Platinum (R$ 267)</strong> — 3 dominios · ate 50 mil requisicoes/mes
                  </li>
                  <li>
                    <strong>Ghost (R$ 497)</strong> — 10 dominios · ate 350 mil requisicoes/mes
                  </li>
                </ul>
                <p className="settings-hint">
                  Excedeu o limite? Filtros e links continuam, mas o painel avisa para upgrade. Dominios extras
                  so entram no plano superior.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'payments' ? (
        <div className="settings-sections">
          <div className="settings-section">
            <div className="settings-section-copy">
              <h2>Pagamentos</h2>
              <p>Historico de pagamentos realizados</p>
            </div>
            <div className="settings-section-body">
              {(form.invoices || []).length === 0 ? (
                <div className="settings-table-empty">
                  <EmptyState
                    icon={Receipt}
                    title="Nenhum pagamento ainda"
                    description="Quando o checkout estiver ativo, as faturas aparecem aqui."
                  />
                </div>
              ) : (
                <div className="settings-table-wrap">
                  <table className="settings-table">
                    <thead>
                      <tr>
                        <th>Numero da fatura</th>
                        <th>Criado em</th>
                        <th>Descricao</th>
                        <th>Valor</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.invoices.map((inv) => (
                        <tr key={inv.id || inv.number}>
                          <td className="mono">{inv.number || inv.id}</td>
                          <td>{inv.createdAt || '—'}</td>
                          <td>{inv.description || '—'}</td>
                          <td>{inv.amount || '—'}</td>
                          <td>{inv.status || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'payment-methods' ? (
        <div className="settings-sections">
          <div className="settings-section">
            <div className="settings-section-copy">
              <h2>Metodos de pagamento</h2>
              <p>Adicione ou remova cartoes de credito para pagamento.</p>
            </div>
            <div className="settings-section-body">
              <div className="settings-actions top">
                <button type="button" className="submit-button" disabled>
                  + Adicionar cartao de credito
                </button>
              </div>
              <div className="settings-table-empty">
                <EmptyState
                  icon={CreditCard}
                  title="Nenhum cartao de credito cadastrado"
                  description="Adicione um cartao quando o gateway de pagamento for ligado."
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'api-keys' ? (
        <div className="settings-sections">
          <div className="settings-section">
            <div className="settings-section-copy">
              <h2>Chaves de API</h2>
              <p>Use a chave para integracoes externas com o zGhost.</p>
            </div>
            <div className="settings-section-body">
              <Field label="Chave atual">
                <div className="settings-api-row">
                  <input
                    className="mono"
                    readOnly
                    value={form.apiKey || 'Nenhuma chave gerada ainda'}
                  />
                  <button type="button" className="ghost-button" onClick={copyKey} disabled={!form.apiKey}>
                    <Copy size={14} />
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </Field>
              <p className="settings-hint">
                Nao compartilhe a chave. Quem tiver ela pode consultar dados da API da sua conta.
              </p>
              <div className="settings-actions">
                <button type="button" className="submit-button" onClick={regenerateKey} disabled={saving}>
                  <KeyRound size={16} />
                  {form.apiKey ? 'Gerar nova chave' : 'Gerar chave de API'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
