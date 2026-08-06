import {
  AlertTriangle,
  Check,
  Copy,
  Edit3,
  ExternalLink,
  FlaskConical,
  Link2,
  Monitor,
  Plus,
  Smartphone,
  Trash2,
  X
} from '../icons.jsx';
import { useMemo, useState } from 'react';
import { CampaignModeModal } from '../components/CampaignModeModal.jsx';
import { Field } from '../components/Field.jsx';
import { SelectShell } from '../components/SelectShell.jsx';
import { UiRadioGroup } from '../components/UiRadio.jsx';
import { UiToggle } from '../components/UiToggle.jsx';
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS, NETWORKS, OS_OPTIONS } from '../constants/networks.js';

/** Monta o link mascarado completo: https://dominio/r/slug */
export function buildMaskUrl(campaign) {
  if (!campaign?.slug) return '';
  const rawDomain = String(campaign.domain || '').trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
  const host =
    rawDomain && !/seudominio|localhost|example\.com/i.test(rawDomain)
      ? rawDomain
      : typeof window !== 'undefined'
        ? window.location.host
        : 'cloaker.lol';
  const protocol =
    typeof window !== 'undefined' && window.location.protocol === 'http:' ? 'http:' : 'https:';
  return `${protocol}//${host}/r/${campaign.slug}`;
}

function CopyLinkRow({ url, label }) {
  const [copied, setCopied] = useState(false);
  if (!url) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copie o link mascarado:', url);
    }
  }

  return (
    <div className="mask-link-row">
      {label ? <span className="mask-link-label">{label}</span> : null}
      <code className="mask-link-url" title={url}>
        {url}
      </code>
      <button type="button" className="ghost-button mask-copy-btn" onClick={copy} title="Copiar link">
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
      <a className="ghost-button mask-open-btn" href={url} target="_blank" rel="noreferrer" title="Abrir link">
        <ExternalLink size={16} />
      </a>
    </div>
  );
}

function emptyDraft(domainDefault) {
  return {
    name: '',
    slug: '',
    status: 'active',
    fallbackUrl: '',
    primaryUrl: '',
    safeDisplay: 'redirect',
    offerDisplay: 'redirect',
    abTest: false,
    domain: domainDefault || '',
    platform: 'TikTok',
    devices: { mobile: true, tablet: true, desktop: true },
    countries: [],
    countryMode: 'allow',
    language: '',
    languageMode: 'allow',
    emReview: false,
    // advanced filters
    cloakupAi: true,
    adspy: true,
    blockBots: true,
    blockProxy: true,
    deviceMode: 'allow',
    blockedUserAgents: 'bytespider, headless, selenium, puppeteer',
    blockedBrowsers: '',
    osList: [],
    osMode: 'allow',
    blockedIps: '',
    allowedIps: '',
    blockedAsns: '',
    blockedDomains: '',
    referrers: '',
    blockEmptyReferrer: false,
    blockedIsps: '',
    urlParams: '',
    urlParamMode: 'any',
    removeParams: false,
    rateLimitPerMinute: 12,
    fallbackThreshold: 25,
    mode: 'Protecao com fallback agressivo',
    strictHeaders: true,
    blockDatacenterAsns: true
  };
}

function slugFromName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
}

/** Converte draft UI → payload da API existente */
function draftToApiBody(draft) {
  const emReview = Boolean(draft.emReview);
  const devices = draft.devices || {};
  // Dispositivos nao marcados vao para pagina segura (fallback)
  let desktopDestination = devices.desktop === false ? 'fallback' : 'primary';
  let mobileDestination = devices.mobile === false && devices.tablet === false ? 'fallback' : 'primary';
  if (emReview) {
    desktopDestination = 'fallback';
    mobileDestination = 'fallback';
  }

  const uas = [String(draft.blockedUserAgents || '').trim()];
  if (draft.blockBots) uas.push('bot, crawler, spider, headless, selenium, puppeteer, curl, python-requests');
  if (draft.adspy) uas.push('adspy, spyfu, similarweb, semrush');
  if (draft.blockedBrowsers) uas.push(draft.blockedBrowsers);

  const countryList = Array.isArray(draft.countries) ? draft.countries.filter(Boolean) : [];
  // block = bloqueia so os paises marcados (resto passa);
  // allow = so os paises marcados passam (resto cai na pagina segura)
  const blockedCountries = draft.countryMode === 'block' ? countryList : [];
  const allowedCountries = draft.countryMode === 'allow' ? countryList : [];

  return {
    name: draft.name,
    slug: draft.slug || slugFromName(draft.name),
    // oferta = principal (humano); segura = fallback (bot/review)
    primaryUrl: draft.primaryUrl,
    fallbackUrl: draft.fallbackUrl,
    platform: draft.platform,
    domain: draft.domain,
    status: draft.status === 'active' ? 'active' : 'paused',
    mode: draft.cloakupAi || draft.blockBots ? 'Protecao com fallback agressivo' : draft.mode || 'Protecao server-side',
    desktopDestination,
    mobileDestination,
    rateLimitPerMinute: draft.rateLimitPerMinute,
    fallbackThreshold: draft.fallbackThreshold,
    blockedCountries,
    blockedAsns: draft.blockedAsns || '',
    blockedUserAgents: uas.filter(Boolean).join(', '),
    blockedIps: [draft.blockedIps, draft.allowedIps ? '' : ''].filter(Boolean).join(', ') || draft.blockedIps || '',
    blockDatacenterAsns: draft.blockProxy !== false && draft.blockDatacenterAsns !== false,
    strictHeaders: draft.strictHeaders !== false,
    protection: {
      blockPlatformAgents: draft.adspy !== false,
      forceSafePage: emReview,
      displaySafe: draft.safeDisplay,
      displayOffer: draft.offerDisplay,
      abTest: Boolean(draft.abTest),
      language: draft.language || '',
      languageMode: draft.languageMode || 'allow',
      countryMode: draft.countryMode || 'allow',
      countries: countryList,
      allowedCountries,
      devices: draft.devices,
      osList: draft.osList || [],
      osMode: draft.osMode || 'allow',
      referrers: draft.referrers || '',
      blockEmptyReferrer: Boolean(draft.blockEmptyReferrer),
      urlParams: draft.urlParams || '',
      urlParamMode: draft.urlParamMode || 'any',
      removeParams: Boolean(draft.removeParams),
      blockedDomains: draft.blockedDomains || '',
      blockedIsps: draft.blockedIsps || '',
      allowedIps: draft.allowedIps || '',
      cloakupAi: draft.cloakupAi !== false
    }
  };
}

function listToStr(value) {
  if (Array.isArray(value)) return value.join(', ');
  return String(value || '');
}

/** Campanha da API → draft do formulario */
function campaignToDraft(campaign, domainDefault) {
  const p = campaign.protection || {};
  const dest = campaign.destinations || {};
  const base = emptyDraft(domainDefault);
  return {
    ...base,
    name: campaign.name || '',
    slug: campaign.slug || '',
    slugTouched: true,
    status: campaign.status === 'active' ? 'active' : 'paused',
    primaryUrl: campaign.primaryUrl || '',
    fallbackUrl: campaign.fallbackUrl || '',
    domain: campaign.domain || domainDefault || '',
    platform: campaign.platform || 'TikTok',
    devices: p.devices || {
      mobile: dest.mobile !== 'fallback',
      tablet: dest.mobile !== 'fallback',
      desktop: dest.desktop !== 'fallback'
    },
    countries:
      (Array.isArray(p.countries) && p.countries.length && p.countries) ||
      (Array.isArray(p.allowedCountries) && p.allowedCountries.length && p.allowedCountries) ||
      (Array.isArray(p.blockedCountries) && p.blockedCountries.length && p.blockedCountries) ||
      (p.selectedCountry ? [p.selectedCountry] : []),
    countryMode: p.countryMode || (Array.isArray(p.allowedCountries) && p.allowedCountries.length ? 'allow' : 'block'),
    language: p.language || '',
    languageMode: p.languageMode || 'allow',
    emReview: Boolean(p.forceSafePage),
    cloakupAi: p.cloakupAi !== false,
    adspy: p.blockPlatformAgents !== false,
    blockBots: true,
    blockProxy: p.blockDatacenterAsns !== false,
    blockedUserAgents: listToStr(p.blockedUserAgents) || base.blockedUserAgents,
    blockedBrowsers: listToStr(p.blockedBrowsers),
    osList: Array.isArray(p.osList) ? p.osList : [],
    osMode: p.osMode || 'allow',
    blockedIps: listToStr(p.blockedIps),
    allowedIps: listToStr(p.allowedIps),
    blockedAsns: listToStr(p.blockedAsns),
    blockedDomains: listToStr(p.blockedDomains),
    referrers: listToStr(p.referrers),
    blockEmptyReferrer: Boolean(p.blockEmptyReferrer),
    blockedIsps: listToStr(p.blockedIsps),
    urlParams: listToStr(p.urlParams),
    urlParamMode: p.urlParamMode || 'any',
    removeParams: Boolean(p.removeParams),
    rateLimitPerMinute: p.rateLimitPerMinute ?? 12,
    fallbackThreshold: p.fallbackThreshold ?? 25,
    mode: campaign.mode || base.mode,
    strictHeaders: p.strictHeaders !== false,
    blockDatacenterAsns: p.blockDatacenterAsns !== false,
    safeDisplay: p.displaySafe || 'redirect',
    offerDisplay: p.displayOffer || 'redirect',
    abTest: Boolean(p.abTest)
  };
}

function NetworkPicker({ value, onChange }) {
  return (
    <div className="network-grid">
      {NETWORKS.map((n) => (
        <button
          key={n.id}
          type="button"
          className={`network-card ${value === n.id ? 'selected' : ''}`}
          onClick={() => onChange(n.id)}
        >
          <span className={`network-badge net-${n.short}`}>{n.label.slice(0, 1)}</span>
          <span className="network-name">{n.label}</span>
          <span className="network-radio" aria-hidden />
        </button>
      ))}
    </div>
  );
}

function CountryPicker({ selected, onChange }) {
  const list = Array.isArray(selected) ? selected : [];
  return (
    <div className="os-grid">
      {COUNTRY_OPTIONS.map((c) => {
        const on = list.includes(c.code);
        return (
          <button
            key={c.code}
            type="button"
            className={`os-chip ${on ? 'selected' : ''}`}
            onClick={() => {
              const set = new Set(list);
              if (set.has(c.code)) set.delete(c.code);
              else set.add(c.code);
              onChange([...set]);
            }}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}

function DevicePicker({ devices, onChange }) {
  const items = [
    { key: 'mobile', label: 'Celular', Icon: Smartphone },
    { key: 'tablet', label: 'Tablet', Icon: Monitor },
    { key: 'desktop', label: 'Computador', Icon: Monitor }
  ];
  return (
    <div className="device-pick-grid">
      {items.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          className={`device-pick ${devices[key] ? 'selected' : ''}`}
          onClick={() => onChange({ ...devices, [key]: !devices[key] })}
        >
          <Icon size={22} />
          <span>{label}</span>
          <span className="device-check" aria-hidden />
        </button>
      ))}
    </div>
  );
}

export function CampaignsPage({
  submitCampaign,
  message,
  loading,
  campaigns,
  activeCampaign,
  domains,
  updateCampaign,
  deleteCampaign,
  startCampaignTest
}) {
  const [modeModal, setModeModal] = useState(false);
  const [createMode, setCreateMode] = useState(null); // null | 'simple' | 'advanced'
  const [editingId, setEditingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  const domainOptions = useMemo(() => {
    const opts = [
      ...domains.global.filter((d) => d.active).map((d) => d.domain),
      ...domains.custom.filter((d) => d.active).map((d) => d.domain)
    ];
    if (!opts.length) opts.push(typeof window !== 'undefined' ? window.location.host : 'cloaker.lol');
    return opts;
  }, [domains]);

  const [draft, setDraft] = useState(() => emptyDraft(domainOptions[0]));

  function setD(field, value) {
    setDraft((c) => {
      const next = { ...c, [field]: value };
      if (field === 'name' && !c.slugTouched) {
        next.slug = slugFromName(value);
      }
      return next;
    });
  }

  function openCreate() {
    setEditingId(null);
    setModeModal(true);
  }

  function selectMode(mode) {
    setModeModal(false);
    setEditingId(null);
    setDraft(emptyDraft(domainOptions[0]));
    setCreateMode(mode);
  }

  function openEdit(campaign) {
    setEditingId(campaign.id);
    setDraft(campaignToDraft(campaign, domainOptions[0]));
    setCreateMode('advanced');
    setModeModal(false);
  }

  function closeCreate() {
    setCreateMode(null);
    setEditingId(null);
    setModeModal(false);
  }

  async function toggleStatus(campaign) {
    setTogglingId(campaign.id);
    try {
      await updateCampaign(campaign.id, {
        status: campaign.status === 'active' ? 'paused' : 'active'
      });
    } finally {
      setTogglingId(null);
    }
  }

  async function onSubmitCreate(event) {
    event.preventDefault();
    if (!draft.name?.trim()) return;
    if (!draft.primaryUrl?.trim() || !draft.fallbackUrl?.trim()) return;
    if (!draft.slug?.trim()) return;

    const body = draftToApiBody(draft);
    // TikTok presets
    if (String(body.platform).toLowerCase().includes('tiktok')) {
      body.mode = 'Protecao com fallback agressivo';
      body.strictHeaders = true;
      body.blockDatacenterAsns = true;
    }

    if (editingId) {
      const result = await updateCampaign(editingId, body);
      if (result?.ok) closeCreate();
      return;
    }

    const result = await submitCampaign(event, body);
    if (result?.ok) {
      closeCreate();
    }
  }

  const filtered = useMemo(() => {
    return (campaigns || []).filter((c) => {
      if (statusFilter === 'active' && c.status !== 'active') return false;
      if (statusFilter === 'paused' && c.status === 'active') return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const hay = `${c.name || ''} ${c.slug || ''} ${c.platform || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [campaigns, statusFilter, query]);

  const maskPreview =
    draft.slug || draft.name
      ? buildMaskUrl({ slug: draft.slug || slugFromName(draft.name), domain: draft.domain })
      : '';
  const activeMaskUrl = activeCampaign ? buildMaskUrl(activeCampaign) : '';

  const creating = createMode === 'simple' || createMode === 'advanced';

  return (
    <div className="cloakup-page">
      <CampaignModeModal open={modeModal} onClose={() => setModeModal(false)} onSelect={selectMode} />

      {!creating ? (
        <>
          <header className="cloakup-page-head row">
            <div>
              <p className="page-breadcrumb">Dashboard / Campanhas</p>
              <h1>Campanhas</h1>
            </div>
            <button type="button" className="submit-button head-cta" onClick={openCreate}>
              <Plus size={18} />
              Criar Campanha
            </button>
          </header>

          <div className="list-toolbar">
            <div className="segmented">
              <button type="button" className={statusFilter === 'all' ? 'selected' : ''} onClick={() => setStatusFilter('all')}>
                Todas
              </button>
              <button
                type="button"
                className={statusFilter === 'active' ? 'selected' : ''}
                onClick={() => setStatusFilter('active')}
              >
                Ativadas
              </button>
              <button
                type="button"
                className={statusFilter === 'paused' ? 'selected' : ''}
                onClick={() => setStatusFilter('paused')}
              >
                Desativadas
              </button>
            </div>
            <input
              className="list-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar por nome"
            />
          </div>

          <div className="panel table-panel">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Criado em</th>
                    <th>Nome</th>
                    <th>Network</th>
                    <th>Status</th>
                    <th>Link</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-state">
                        Nenhuma campanha nesta lista.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((campaign) => (
                      <tr key={campaign.id}>
                        <td>{campaign.createdAt ? new Date(campaign.createdAt).toLocaleString('pt-BR') : '—'}</td>
                        <td>
                          <strong>{campaign.name}</strong>
                          <span>/r/{campaign.slug}</span>
                        </td>
                        <td>{campaign.platform || '—'}</td>
                        <td>
                          <UiToggle
                            className="campaign-status-toggle"
                            size="sm"
                            checked={campaign.status === 'active'}
                            disabled={togglingId === campaign.id}
                            onChange={() => toggleStatus(campaign)}
                            label={campaign.status === 'active' ? 'Ativa' : 'Pausada'}
                          />
                        </td>
                        <td>
                          <CopyLinkRow url={buildMaskUrl(campaign)} />
                        </td>
                        <td>
                          <div className="campaign-actions">
                            <button
                              type="button"
                              className="icon-button"
                              title="Editar campanha"
                              onClick={() => openEdit(campaign)}
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              title="Testar"
                              onClick={() => startCampaignTest?.(campaign)}
                            >
                              <FlaskConical size={16} />
                            </button>
                            <button
                              type="button"
                              className="icon-button danger"
                              title="Excluir"
                              onClick={async () => {
                                if (window.confirm(`Excluir ${campaign.name}?`)) {
                                  await deleteCampaign(campaign.id);
                                }
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {message ? <div className="message mask-success">{message}</div> : null}
        </>
      ) : (
        <form className="camp-create" onSubmit={onSubmitCreate}>
          <header className="cloakup-page-head">
            <p className="page-breadcrumb">
              Dashboard / Campanhas /{' '}
              {editingId
                ? 'Editar campanha'
                : `Criar no modo ${createMode === 'simple' ? 'basico' : 'avancado'}`}
            </p>
            <div className="camp-create-title-row">
              <h1>{editingId ? 'Editar campanha' : 'Criar campanha'}</h1>
              <button type="button" className="ghost-button" onClick={closeCreate}>
                <X size={16} /> Cancelar
              </button>
            </div>
          </header>

          <Field label="Nome" required>
            <input
              value={draft.name}
              onChange={(e) => setD('name', e.target.value)}
              placeholder="Nome da campanha"
              required
            />
          </Field>

          {createMode === 'advanced' ? (
            <Field label="Status">
              <SelectShell>
                <select value={draft.status} onChange={(e) => setD('status', e.target.value)}>
                  <option value="active">Ativada</option>
                  <option value="paused">Desativada</option>
                </select>
              </SelectShell>
            </Field>
          ) : null}

          <section className="camp-block">
            <h2>Pagina segura</h2>
            <p className="camp-help">
              Essa e sua pagina fake — bots, moderadores e concorrentes veem ela. Conteudo de qualidade ajuda na
              aprovacao do anuncio.
            </p>
            <Field label="URL da pagina" required>
              <div className="input-with-icon">
                <Link2 size={16} />
                <input
                  value={draft.fallbackUrl}
                  onChange={(e) => setD('fallbackUrl', e.target.value)}
                  placeholder="https://"
                  required
                />
              </div>
            </Field>
            <span className="field-label">Modo de exibicao</span>
            <UiRadioGroup
              name="safeDisplay"
              className="ui-radio-row"
              size="sm"
              value={draft.safeDisplay}
              onChange={(v) => setD('safeDisplay', v)}
              options={[
                { value: 'content', label: 'Mostrar Conteudo' },
                { value: 'redirect', label: 'Redirecionar' }
              ]}
            />
          </section>

          <section className="camp-block">
            <div className="camp-block-head">
              <div>
                <h2>Pagina de oferta</h2>
                <p className="camp-help">
                  Pagina de vendas, VSL, advertorial… e o destino do trafego real (white).
                </p>
              </div>
              {createMode === 'simple' || createMode === 'advanced' ? (
                <UiToggle checked={draft.abTest} onChange={(v) => setD('abTest', v)} label="Teste A/B" size="sm" />
              ) : null}
            </div>
            <Field label="URL da pagina" required>
              <div className="input-with-icon">
                <Link2 size={16} />
                <input
                  value={draft.primaryUrl}
                  onChange={(e) => setD('primaryUrl', e.target.value)}
                  placeholder="https://"
                  required
                />
              </div>
            </Field>
            {createMode === 'advanced' ? (
              <Field label="Divisao de trafego (%)" hint="Reservado para multi-ofertas / A/B">
                <input type="number" min="0" max="100" value={100} readOnly />
              </Field>
            ) : null}
            <span className="field-label">Modo de exibicao</span>
            <UiRadioGroup
              name="offerDisplay"
              className="ui-radio-row"
              size="sm"
              value={draft.offerDisplay}
              onChange={(v) => setD('offerDisplay', v)}
              options={[
                { value: 'content', label: 'Mostrar Conteudo' },
                { value: 'redirect', label: 'Redirecionar' }
              ]}
            />
          </section>

          <div className="form-row">
            <Field label="Dominio" required>
              <SelectShell>
                <select value={draft.domain} onChange={(e) => setD('domain', e.target.value)} required>
                  {domainOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </SelectShell>
            </Field>
            <Field label="Slug" required>
              <div className="input-with-icon">
                <span className="input-prefix">/</span>
                <input
                  value={draft.slug}
                  onChange={(e) => {
                    setDraft((c) => ({ ...c, slug: e.target.value, slugTouched: true }));
                  }}
                  placeholder="oferta"
                  required
                />
              </div>
            </Field>
          </div>

          {maskPreview ? (
            <div className="mask-preview-box">
              <div className="mask-preview-head">
                <Link2 size={18} />
                <strong>Link mascarado (previa)</strong>
              </div>
              <CopyLinkRow url={maskPreview} />
            </div>
          ) : null}

          <section className="camp-block">
            <h2>Network</h2>
            <NetworkPicker value={draft.platform} onChange={(v) => setD('platform', v)} />
          </section>

          <section className="camp-block">
            <h2>Dispositivo</h2>
            <DevicePicker devices={draft.devices} onChange={(v) => setD('devices', v)} />
          </section>

          <section className="camp-block">
            <h2>Localizacao</h2>
            <UiRadioGroup
              name="countryMode"
              className="ui-radio-row"
              size="sm"
              value={draft.countryMode}
              onChange={(v) => setD('countryMode', v)}
              options={[
                { value: 'allow', label: 'Permitir apenas os marcados' },
                { value: 'block', label: 'Bloquear os marcados' }
              ]}
            />
            <Field
              label="Paises"
              hint={
                draft.countryMode === 'allow'
                  ? 'So visitantes desses paises acessam a oferta; todo o resto cai na pagina segura.'
                  : 'Visitantes desses paises caem na pagina segura; o resto acessa normalmente.'
              }
            >
              <CountryPicker selected={draft.countries} onChange={(v) => setD('countries', v)} />
            </Field>
          </section>

          <section className="camp-block">
            <h2>Idioma</h2>
            <Field label="Linguagem do navegador">
              <SelectShell>
                <select value={draft.language} onChange={(e) => setD('language', e.target.value)}>
                  <option value="">Selecione uma linguagem...</option>
                  {LANGUAGE_OPTIONS.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </SelectShell>
            </Field>
          </section>

          <UiToggle
            checked={draft.emReview}
            onChange={(v) => setD('emReview', v)}
            label="Em review"
            hint="Marque se quiser mostrar SEMPRE a pagina segura"
            size="sm"
          />

          {createMode === 'advanced' ? (
            <>
              <section className="camp-block">
                <h2>Filtros</h2>
                <div className="filter-toggles">
                  <UiToggle
                    checked={draft.cloakupAi}
                    onChange={(v) => setD('cloakupAi', v)}
                    label="zGhost AI"
                    hint="Inteligencia para bloquear trafego suspeito"
                    size="sm"
                  />
                  <UiToggle
                    checked={draft.adspy}
                    onChange={(v) => setD('adspy', v)}
                    label="Adspy"
                    hint="Bloquear plataformas de espionagem"
                    size="sm"
                  />
                  <UiToggle
                    checked={draft.blockBots}
                    onChange={(v) => setD('blockBots', v)}
                    label="Bots"
                    hint="Bloquear bots conhecidos"
                    size="sm"
                  />
                  <UiToggle
                    checked={draft.blockProxy}
                    onChange={(v) => setD('blockProxy', v)}
                    label="Proxy/VPN"
                    hint="Bloquear Proxy, VPN ou Tor (datacenter)"
                    size="sm"
                  />
                </div>
              </section>

              <section className="camp-block">
                <h2>Filtro de user agent</h2>
                <Field label="Trechos bloqueados (virgula)" hint="Ex: curl, python, scrapy">
                  <textarea
                    rows={3}
                    value={draft.blockedUserAgents}
                    onChange={(e) => setD('blockedUserAgents', e.target.value)}
                  />
                </Field>
              </section>

              <section className="camp-block">
                <h2>Filtro de navegador</h2>
                <Field label="Navegadores (virgula)" hint="Chrome, Firefox, Safari…">
                  <input
                    value={draft.blockedBrowsers}
                    onChange={(e) => setD('blockedBrowsers', e.target.value)}
                    placeholder="Chrome, Firefox"
                  />
                </Field>
              </section>

              <section className="camp-block">
                <h2>Filtro de sistema operacional</h2>
                <div className="os-grid">
                  {OS_OPTIONS.map((os) => {
                    const on = (draft.osList || []).includes(os);
                    return (
                      <button
                        key={os}
                        type="button"
                        className={`os-chip ${on ? 'selected' : ''}`}
                        onClick={() => {
                          const list = new Set(draft.osList || []);
                          if (list.has(os)) list.delete(os);
                          else list.add(os);
                          setD('osList', [...list]);
                        }}
                      >
                        {os}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="camp-block">
                <h2>Filtro de IP</h2>
                <Field label="Blacklist" hint="IPs separados por virgula">
                  <input
                    value={draft.blockedIps}
                    onChange={(e) => setD('blockedIps', e.target.value)}
                    placeholder="1.2.3.4, 5.6.7.8"
                  />
                </Field>
                <Field label="Whitelist" hint="Reservado (guardado na campanha)">
                  <input
                    value={draft.allowedIps}
                    onChange={(e) => setD('allowedIps', e.target.value)}
                    placeholder="Seu IP"
                  />
                </Field>
                <Field label="ASNs bloqueados">
                  <input
                    value={draft.blockedAsns}
                    onChange={(e) => setD('blockedAsns', e.target.value)}
                    placeholder="AS12345"
                  />
                </Field>
              </section>

              <section className="camp-block">
                <h2>Filtro de referencia (URL de origem)</h2>
                <Field label="Dominios de referencia" hint="facebook.com, *.facebook.com">
                  <input value={draft.referrers} onChange={(e) => setD('referrers', e.target.value)} />
                </Field>
                <UiToggle
                  checked={draft.blockEmptyReferrer}
                  onChange={(v) => setD('blockEmptyReferrer', v)}
                  label="Bloquear referencia vazia"
                  hint="Acesso direto sem vir de outro site"
                  size="sm"
                />
              </section>

              <section className="camp-block">
                <h2>Filtro de dominio</h2>
                <p className="camp-help">Recomendado para integracao via Javascript.</p>
                <Field label="Dominios permitidos (virgula)">
                  <input value={draft.blockedDomains} onChange={(e) => setD('blockedDomains', e.target.value)} />
                </Field>
              </section>

              <section className="camp-block">
                <h2>Filtro de parametros de URL</h2>
                <UiRadioGroup
                  name="urlParamMode"
                  className="ui-radio-row"
                  size="sm"
                  value={draft.urlParamMode}
                  onChange={(v) => setD('urlParamMode', v)}
                  options={[
                    { value: 'all', label: 'Todos' },
                    { value: 'any', label: 'Algum' }
                  ]}
                />
                <Field label="Parametros (chave=valor, virgula)">
                  <input value={draft.urlParams} onChange={(e) => setD('urlParams', e.target.value)} />
                </Field>
                <UiToggle
                  checked={draft.removeParams}
                  onChange={(v) => setD('removeParams', v)}
                  label="Remover parametros da URL"
                  size="sm"
                />
              </section>

              <section className="camp-block">
                <h2>Filtro de ISP</h2>
                <Field label="ISPs (virgula)">
                  <input
                    value={draft.blockedIsps}
                    onChange={(e) => setD('blockedIsps', e.target.value)}
                    placeholder="Claro, Vivo, Oi"
                  />
                </Field>
              </section>

              <section className="camp-block">
                <h2>Limites tecnicos</h2>
                <div className="form-row">
                  <Field label="Rate limit / min">
                    <input
                      type="number"
                      min="1"
                      value={draft.rateLimitPerMinute}
                      onChange={(e) => setD('rateLimitPerMinute', e.target.value)}
                    />
                  </Field>
                  <Field label="Score para alternativa">
                    <input
                      type="number"
                      min="10"
                      max="100"
                      value={draft.fallbackThreshold}
                      onChange={(e) => setD('fallbackThreshold', e.target.value)}
                    />
                  </Field>
                </div>
                <UiToggle
                  checked={draft.strictHeaders}
                  onChange={(v) => setD('strictHeaders', v)}
                  label="Headers rigorosos"
                  hint="Exige sinais de browser real"
                  size="sm"
                />
              </section>
            </>
          ) : null}

          {message ? (
            <div className={`message ${String(message).includes('/r/') ? 'mask-success' : ''}`}>{message}</div>
          ) : null}

          <div className="camp-submit-row">
            <button type="button" className="ghost-button" onClick={closeCreate}>
              Cancelar
            </button>
            <button className="submit-button" type="submit" disabled={loading}>
              {editingId ? <Edit3 size={18} /> : <Plus size={18} />}
              {loading ? 'Salvando…' : editingId ? 'Salvar alteracoes' : 'Salvar'}
            </button>
          </div>

          {createMode === 'simple' && activeMaskUrl ? (
            <aside className="panel compact" style={{ marginTop: 16 }}>
              <h2>
                <Link2 size={18} /> Ultima campanha
              </h2>
              <CopyLinkRow url={activeMaskUrl} />
            </aside>
          ) : null}

          {createMode === 'advanced' ? (
            <div className="warning-box" style={{ marginTop: 16 }}>
              <AlertTriangle size={20} />
              <div>
                <strong>Como o filtro funciona:</strong>
                <ul>
                  <li>
                    <strong>Pagina de oferta</strong> = visitante real · <strong>Pagina segura</strong> = bot/review
                  </li>
                  <li>User-Agent, IP/ASN, headers e regras da campanha definem o destino</li>
                  <li>Em review forca sempre a pagina segura</li>
                </ul>
              </div>
            </div>
          ) : null}
        </form>
      )}
    </div>
  );
}
