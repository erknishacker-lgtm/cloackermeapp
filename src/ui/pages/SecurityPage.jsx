import {
  Activity,
  AlertTriangle,
  Ban,
  BarChart3,
  Clock3,
  Eye,
  Globe2,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { useState } from 'react';
import { MetricCard } from '../components/MetricCard.jsx';
import { PageHeader } from '../components/PageHeader.jsx';

export function SecurityPage({ events, blockedIps, createBlockedIp, deleteBlockedIp, refreshData, stats }) {
  const [ip, setIp] = useState('');
  const [reason, setReason] = useState('');
  const [securityMessage, setSecurityMessage] = useState('');
  const blocked = events.filter((event) => event.decision === 'fallback');
  const topIps = stats.topIps || [];
  const topReasons = stats.topReasons || [];
  const topCampaigns = stats.topCampaigns || [];

  async function submitBlock(event) {
    event.preventDefault();
    if (!ip.trim()) return;
    const result = await createBlockedIp(ip, reason);
    if (result.ok) {
      setIp('');
      setReason('');
      setSecurityMessage('IP bloqueado.');
    } else {
      setSecurityMessage(result.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Seguranca"
        subtitle="Monitore tentativas de acesso bloqueadas aos seus cloakers"
        action={
          <button className="ghost-button" onClick={refreshData} type="button">
            <RefreshCw size={18} />
            Atualizar
          </button>
        }
      />
      <section className="panel security-banner">
        <h2>
          <ShieldCheck size={22} />
          Protecao Ativa
        </h2>
        <div className="security-tags">
          <span className="red">
            <Ban size={16} />
            Rate limit por campanha
          </span>
          <span className="amber">
            <AlertTriangle size={16} />
            Sem User-Agent
          </span>
          <span className="orange">
            <Globe2 size={16} />
            Bots e datacenters
          </span>
          <span className="purple">
            <Clock3 size={16} />3 violacoes = 15min bloqueio
          </span>
          <span className="green">
            <ShieldCheck size={16} />
            Auto-ban 10/24h = 7 dias
          </span>
        </div>
      </section>
      <section className="security-stats">
        <MetricCard label="Bloqueios Hoje" value={stats.today?.fallback ?? blocked.length} tone="red" icon={ShieldAlert} />
        <MetricCard label="Ultimos 7 dias" value={stats.week?.fallback ?? blocked.length} tone="amber" icon={Activity} />
        <MetricCard label="Ultimos 30 dias" value={stats.month?.fallback ?? blocked.length} tone="blue" icon={BarChart3} />
      </section>
      <section className="panel block-manager">
        <h2>
          <Lock size={22} />
          Gerenciar IPs Bloqueados
        </h2>
        <p>
          Bloqueie IPs manualmente. Violacoes repetidas tambem geram ban automatico temporario (3 em 15 min / 10 em
          24h).
        </p>
        <form className="block-form" onSubmit={submitBlock}>
          <input value={ip} onChange={(event) => setIp(event.target.value)} placeholder="Digite o IP (ex: 192.168.1.1)" />
          <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo (opcional)" />
          <button type="submit">Bloquear</button>
        </form>
        {securityMessage && <div className="message compact-message">{securityMessage}</div>}
        {blockedIps.length ? (
          <div className="blocked-list">
            {blockedIps.map((item) => (
              <div className="blocked-row" key={item.ip}>
                <strong>{item.ip}</strong>
                <span>
                  {item.reason || 'Bloqueio manual'}
                  {item.expiresAt ? ` · expira ${new Date(item.expiresAt).toLocaleString('pt-BR')}` : ''}
                  {item.source === 'auto' ? ' · auto' : ''}
                </span>
                <button type="button" onClick={() => deleteBlockedIp(item.ip)}>
                  Remover
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-security">
            <ShieldCheck size={56} />
            <p>Nenhum IP bloqueado no momento</p>
          </div>
        )}
      </section>
      <section className="security-grid">
        <div className="panel compact">
          <h2>
            <AlertTriangle size={20} />
            IPs com Mais Tentativas
          </h2>
          <p>Clique para bloquear rapidamente</p>
          {topIps.length ? (
            topIps.slice(0, 5).map((item, index) => (
              <button
                key={item.key}
                type="button"
                className="mini-row as-button"
                onClick={() => createBlockedIp(item.key, 'bloqueio rapido do painel')}
              >
                <span>#{index + 1}</span>
                <strong>{item.key}</strong>
                <b>{item.count}</b>
              </button>
            ))
          ) : (
            <div className="empty-mini">Nenhuma tentativa registrada.</div>
          )}
        </div>
        <div className="panel compact">
          <h2>
            <Eye size={20} />
            Motivos de Bloqueio
          </h2>
          {topReasons.length ? (
            topReasons.slice(0, 5).map((item, index) => (
              <div className="mini-row" key={item.key}>
                <span>#{index + 1}</span>
                <strong>{item.key}</strong>
                <b>{item.count}</b>
              </div>
            ))
          ) : (
            <div className="empty-mini">Nenhum motivo registrado.</div>
          )}
        </div>
      </section>
      <section className="panel domains-panel">
        <h2>
          <Globe2 size={22} />
          Bloqueios por Cloaker
        </h2>
        <p>Quantidade de tentativas bloqueadas em cada cloaker</p>
        {topCampaigns.length ? (
          topCampaigns.slice(0, 6).map((item) => (
            <div className="block-card" key={item.key}>
              <strong>{item.key}</strong>
              <span>campanha</span>
              <b>{item.count}</b>
              <small>bloqueios</small>
            </div>
          ))
        ) : (
          <div className="empty-mini">Nenhum bloqueio por campanha registrado.</div>
        )}
      </section>
    </>
  );
}
