import { useMemo, useState } from 'react';
import { BarChart3, Calendar, Grid2X2 } from '../icons.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { UiCard, UiCardHeader } from '../components/UiCard.jsx';

function dayKey(date) {
  const d = new Date(date);
  if (!Number.isFinite(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatDay(ts) {
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function pageLabel(event) {
  return event.pageUrl || event.url || event.path || event.targetUrl || event.primaryUrl || '—';
}

function isAllowed(event) {
  return event.decision === 'allow';
}

function matchesCampaign(event, campaign) {
  if (!campaign) return true;
  if (event.campaignId && event.campaignId === campaign.id) return true;
  if (event.campaignSlug && event.campaignSlug === campaign.slug) return true;
  if (event.campaignName && campaign.name && event.campaignName === campaign.name) return true;
  return false;
}

function inRange(event, fromTs, toTs) {
  const t = new Date(event.createdAt).getTime();
  if (!Number.isFinite(t)) return false;
  if (fromTs != null && t < fromTs) return false;
  if (toTs != null && t > toTs) return false;
  return true;
}

function defaultRange() {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  from.setDate(from.getDate() - 6);
  from.setHours(0, 0, 0, 0);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10)
  };
}

function parseRange(fromStr, toStr) {
  const from = fromStr ? new Date(`${fromStr}T00:00:00`) : null;
  const to = toStr ? new Date(`${toStr}T23:59:59.999`) : null;
  return {
    fromTs: from && Number.isFinite(from.getTime()) ? from.getTime() : null,
    toTs: to && Number.isFinite(to.getTime()) ? to.getTime() : null
  };
}

function buildDaily(events) {
  const map = new Map();
  for (const event of events) {
    const key = dayKey(event.createdAt);
    if (key == null) continue;
    const row = map.get(key) || { t: key, total: 0, allow: 0, block: 0 };
    row.total += 1;
    if (isAllowed(event)) row.allow += 1;
    else row.block += 1;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => a.t - b.t);
}

function buildByCountry(events) {
  const map = new Map();
  for (const event of events) {
    const country = String(event.country || '—').trim().toUpperCase() || '—';
    const row = map.get(country) || { country, total: 0, allow: 0, block: 0 };
    row.total += 1;
    if (isAllowed(event)) row.allow += 1;
    else row.block += 1;
    map.set(country, row);
  }
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 12);
}

function buildByPage(events) {
  const map = new Map();
  for (const event of events) {
    const page = pageLabel(event);
    const row = map.get(page) || { page, total: 0, allow: 0, block: 0 };
    row.total += 1;
    if (isAllowed(event)) row.allow += 1;
    else row.block += 1;
    map.set(page, row);
  }
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 12);
}

function MiniBars({ rows, valueKey = 'total' }) {
  const max = Math.max(1, ...rows.map((r) => r[valueKey] || 0));
  if (!rows.length) return null;
  return (
    <div className="report-bars" role="img" aria-label="Grafico de barras">
      {rows.map((row) => {
        const v = row[valueKey] || 0;
        const h = Math.max(4, Math.round((v / max) * 100));
        const label = row.label || formatDay(row.t) || row.country || row.page || '';
        return (
          <div key={`${label}-${row.t || ''}`} className="report-bar-col" title={`${label}: ${v}`}>
            <div className="report-bar" style={{ height: `${h}%` }} />
            <span className="report-bar-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function RankTable({ rows, nameKey, nameHeader }) {
  if (!rows.length) return null;
  return (
    <div className="report-table-wrap">
      <table className="report-table">
        <thead>
          <tr>
            <th>{nameHeader}</th>
            <th>Total</th>
            <th>Aceitas</th>
            <th>Bloqueadas</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[nameKey]}>
              <td className="report-name" title={row[nameKey]}>
                {row[nameKey]}
              </td>
              <td className="mono">{row.total}</td>
              <td className="mono ok">{row.allow}</td>
              <td className="mono bad">{row.block}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportEmpty({ needCampaign }) {
  return (
    <EmptyState
      icon={BarChart3}
      title="Nenhum dado encontrado"
      description={
        needCampaign
          ? 'Selecione uma campanha para ver os relatorios.'
          : 'Nao ha requisicoes no periodo selecionado.'
      }
    />
  );
}

export function ReportsPage({ events = [], campaigns = [] }) {
  const defaults = useMemo(() => defaultRange(), []);
  const [campaignId, setCampaignId] = useState('');
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);

  const campaign = useMemo(
    () => (campaigns || []).find((c) => c.id === campaignId || c.slug === campaignId) || null,
    [campaigns, campaignId]
  );

  const { fromTs, toTs } = useMemo(() => parseRange(from, to), [from, to]);

  const filtered = useMemo(() => {
    if (!campaignId) return [];
    return (events || []).filter(
      (event) => matchesCampaign(event, campaign) && inRange(event, fromTs, toTs)
    );
  }, [events, campaign, campaignId, fromTs, toTs]);

  const totals = useMemo(() => {
    let allow = 0;
    let block = 0;
    for (const event of filtered) {
      if (isAllowed(event)) allow += 1;
      else block += 1;
    }
    return { total: filtered.length, allow, block };
  }, [filtered]);

  const daily = useMemo(() => buildDaily(filtered), [filtered]);
  const byCountry = useMemo(() => buildByCountry(filtered), [filtered]);
  const byPage = useMemo(() => buildByPage(filtered), [filtered]);

  const needCampaign = !campaignId;
  const empty = !needCampaign && filtered.length === 0;
  const rangeLabel =
    from && to
      ? `${from.split('-').reverse().join('/')} - ${to.split('-').reverse().join('/')}`
      : 'Periodo';

  return (
    <div className="reports-page">
      <header className="page-header reports-header">
        <div className="page-header-copy">
          <p className="page-breadcrumb">Dashboard / Relatorios</p>
          <h1>Relatorios</h1>
        </div>
        <div className="reports-toolbar">
          <label className="reports-select">
            <Grid2X2 size={14} aria-hidden />
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              aria-label="Selecionar campanha"
            >
              <option value="">Selecione uma campanha</option>
              {(campaigns || []).map((c) => (
                <option key={c.id || c.slug} value={c.id || c.slug}>
                  {c.name || c.slug}
                </option>
              ))}
            </select>
          </label>
          <label className="reports-select reports-dates">
            <Calendar size={14} aria-hidden />
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Data inicial" />
            <span className="reports-date-sep">–</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Data final" />
          </label>
        </div>
      </header>

      <section className="reports-stack">
        <UiCard className="report-card">
          <div className="report-card-head">
            <UiCardHeader
              title="Requisicoes por dia"
              description="Quantidade de requisicoes por dia"
            />
            <div className="report-kpis" aria-label="Resumo do periodo">
              <div className="report-kpi">
                <span>Todas</span>
                <strong className="mono">{needCampaign ? 0 : totals.total}</strong>
              </div>
              <div className="report-kpi ok">
                <span>Aceitas</span>
                <strong className="mono">{needCampaign ? 0 : totals.allow}</strong>
              </div>
              <div className="report-kpi bad">
                <span>Bloqueadas</span>
                <strong className="mono">{needCampaign ? 0 : totals.block}</strong>
              </div>
            </div>
          </div>
          <div className="report-card-body">
            {needCampaign || empty ? (
              <ReportEmpty needCampaign={needCampaign} />
            ) : (
              <>
                <p className="report-period mono">{rangeLabel}</p>
                <MiniBars rows={daily} />
              </>
            )}
          </div>
        </UiCard>

        <UiCard className="report-card">
          <UiCardHeader
            title="Requisicoes por pais"
            description="Quantidade de requisicoes por pais"
          />
          <div className="report-card-body">
            {needCampaign || empty ? (
              <ReportEmpty needCampaign={needCampaign} />
            ) : (
              <RankTable rows={byCountry} nameKey="country" nameHeader="Pais" />
            )}
          </div>
        </UiCard>

        <UiCard className="report-card">
          <UiCardHeader
            title="Requisicoes por pagina"
            description="Quantidade de requisicoes por pagina"
          />
          <div className="report-card-body">
            {needCampaign || empty ? (
              <ReportEmpty needCampaign={needCampaign} />
            ) : (
              <RankTable rows={byPage} nameKey="page" nameHeader="Pagina" />
            )}
          </div>
        </UiCard>
      </section>
    </div>
  );
}
