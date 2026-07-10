import { Ban, Globe2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { MetricCard } from '../components/MetricCard.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { TrafficChart } from '../components/TrafficChart.jsx';

export function DashboardPage({ stats, events }) {
  const total = stats.total || 0;
  const white = stats.white || stats.allowed || 0;
  const black = stats.black || stats.fallback || 0;
  const blocked = stats.blocked || 0;

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Visao geral do trafego de todas as suas campanhas" />
      <section className="dashboard-metrics">
        <MetricCard label="Total de Acessos" value={total} tone="blue" icon={Globe2} large />
        <MetricCard label="Acessos White" value={white} tone="green" icon={ShieldCheck} large />
        <MetricCard label="Acessos Black" value={black} tone="amber" icon={ShieldAlert} large />
        <MetricCard label="Bloqueios" value={blocked} tone="red" icon={Ban} large />
      </section>
      <TrafficChart events={events} />
    </>
  );
}
