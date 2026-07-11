import { Ban, Globe2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useMemo } from 'react';
import { MetricCard } from '../components/MetricCard.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { TrafficChart } from '../components/TrafficChart.jsx';

export function DashboardPage({ stats, events }) {
  const metrics = useMemo(() => {
    const list = Array.isArray(events) ? events : [];
    const fromEvents = {
      total: list.length,
      white: list.filter((e) => e.decision === 'allow').length,
      black: list.filter((e) => e.decision === 'fallback').length,
      blocked: list.filter(
        (e) =>
          e.reasons?.includes('manual_ip_block') ||
          e.reasons?.includes('ip_blacklist') ||
          e.reasons?.includes('campaign_ip_block')
      ).length
    };

    // Prefere API; se total da API for 0 mas houver eventos carregados, usa os eventos
    const apiTotal = Number(stats?.total);
    const useEvents = (!Number.isFinite(apiTotal) || apiTotal === 0) && fromEvents.total > 0;

    if (useEvents) {
      return fromEvents;
    }

    return {
      total: Number.isFinite(apiTotal) ? apiTotal : fromEvents.total,
      white: Number(stats?.white ?? stats?.allowed ?? fromEvents.white) || 0,
      black: Number(stats?.black ?? stats?.fallback ?? fromEvents.black) || 0,
      blocked: Number(stats?.blocked ?? fromEvents.blocked) || 0
    };
  }, [stats, events]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Visao geral do trafego das suas campanhas (atualiza ao abrir a pagina ou clicar em Atualizar em Acessos)"
      />
      <section className="dashboard-metrics">
        <MetricCard label="Total de Acessos" value={metrics.total} tone="blue" icon={Globe2} large />
        <MetricCard label="Acessos White" value={metrics.white} tone="green" icon={ShieldCheck} large />
        <MetricCard label="Acessos Black" value={metrics.black} tone="amber" icon={ShieldAlert} large />
        <MetricCard label="Bloqueios" value={metrics.blocked} tone="red" icon={Ban} large />
      </section>
      {metrics.total === 0 ? (
        <div className="panel empty-mini dashboard-empty-hint">
          Ainda sem acessos contados. Abra um link mascarado <code>/r/seu-slug</code> (pelo dominio com Cloudflare) e
          volte ao Dashboard.
        </div>
      ) : null}
      <TrafficChart events={events} />
    </>
  );
}
