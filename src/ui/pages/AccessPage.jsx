import {
  Activity,
  Ban,
  CheckCircle2,
  Clock3,
  Eye,
  Filter,
  Globe2,
  ListFilter,
  Map,
  Monitor,
  RefreshCw,
  ToggleRight,
  Users,
  XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { EventRow } from '../components/EventRow.jsx';
import { MetricCard } from '../components/MetricCard.jsx';
import { PageHeader } from '../components/PageHeader.jsx';

function WorldMapMock({ total, mapMode, zoom, setZoom }) {
  return (
    <div className={`map-card ${mapMode === 'Globo 3D' ? 'globe' : ''}`}>
      <span className="map-chip">{total} localizacoes</span>
      <svg viewBox="0 0 880 390" aria-label="Mapa mundial" style={{ transform: `scale(${zoom})` }}>
        <defs>
          <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#151a2a" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="880" height="390" fill="url(#grid)" />
        <path d="M72 162 111 132l57 14 28 41-10 54-56 21-58-28-22-36z" />
        <path d="M212 102l44-42 86 12 43 45-21 45-81 3-48-22z" />
        <path d="M284 208l62 18 36 62-17 69-56-34-38-68z" />
        <path d="M414 118l72-30 90 20 74 64-39 60-111-8-80-43z" />
        <path d="M526 212l78-6 92 46 44 66-106 20-86-38z" />
        <path d="M690 145l74-48 75 24 2 58-64 47-76-18z" />
        <path d="M730 292l58 10 34 44-43 26-58-18z" />
      </svg>
      <div className="map-controls">
        <button type="button" onClick={() => setZoom((current) => Math.min(current + 0.15, 1.6))}>
          +
        </button>
        <button type="button" onClick={() => setZoom((current) => Math.max(current - 0.15, 0.75))}>
          -
        </button>
        <button type="button" onClick={() => setZoom(1)}>
          Reset
        </button>
      </div>
    </div>
  );
}

export function AccessPage({ events, stats, refreshData }) {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [timeRange, setTimeRange] = useState('30');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showReasons, setShowReasons] = useState(true);
  const [mapMode, setMapMode] = useState('Mapa 2D');
  const [zoom, setZoom] = useState(1);
  const [lastUpdated, setLastUpdated] = useState(() =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  const filteredEvents = events.filter((event) => {
    if (typeFilter !== 'all' && event.decision !== typeFilter) return false;
    const eventTime = new Date(event.createdAt).getTime();
    return Date.now() - eventTime <= Number(timeRange) * 60_000;
  });

  const white = stats.white || stats.allowed || 0;
  const black = stats.black || stats.fallback || 0;
  const topCountries = stats.topCountries || [];
  const mobileCount = filteredEvents.filter((e) => e.device === 'mobile').length;
  const desktopCount = filteredEvents.length - mobileCount;

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = window.setInterval(() => {
      refreshData().then(() => {
        setLastUpdated(
          new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, refreshData]);

  return (
    <>
      <PageHeader
        title="Acessos em Tempo Real"
        subtitle={`Ultima atualizacao: ${lastUpdated}`}
        icon={Activity}
        action={
          <div className="header-actions">
            <button
              className={`toggle-button ${autoRefresh ? 'enabled' : ''}`}
              onClick={() => setAutoRefresh((current) => !current)}
              type="button"
            >
              <ToggleRight size={36} />
              Auto (30s)
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                refreshData().then(() =>
                  setLastUpdated(
                    new Date().toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })
                  )
                );
              }}
            >
              <RefreshCw size={18} />
              Atualizar
            </button>
          </div>
        }
      />
      <section className="live-metrics">
        <MetricCard label="Total de Acessos" value={stats.total || 0} icon={Users} />
        <MetricCard label="White (aprovados)" value={white} tone="green" icon={CheckCircle2} />
        <MetricCard label="Black (fallback)" value={black} tone="purple" icon={XCircle} />
        <MetricCard label="Bloqueados" value={stats.blocked || 0} tone="red" icon={Ban} />
      </section>
      <section className="panel filters-panel">
        <Filter size={24} />
        <span>Filtros:</span>
        <label className="filter-select">
          <Clock3 size={20} />
          <select value={timeRange} onChange={(event) => setTimeRange(event.target.value)}>
            <option value="30">Ultimos 30 min</option>
            <option value="60">Ultima hora</option>
            <option value="1440">Hoje</option>
          </select>
        </label>
        <label className="filter-select">
          <ListFilter size={20} />
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">Todos os tipos</option>
            <option value="allow">White (aprovados)</option>
            <option value="fallback">Black (fallback)</option>
          </select>
        </label>
        <button type="button" onClick={() => setShowReasons((current) => !current)}>
          <Eye size={20} />
          {showReasons ? 'Ocultar motivos' : 'Mostrar motivos'}
        </button>
      </section>
      <section className="access-grid">
        <div className="panel map-panel">
          <div className="panel-title">
            <h2>Localizacao dos Acessos</h2>
            <div className="segmented">
              <button className={mapMode === 'Mapa 2D' ? 'selected' : ''} onClick={() => setMapMode('Mapa 2D')} type="button">
                <Map size={19} />
                Mapa 2D
              </button>
              <button
                className={mapMode === 'Globo 3D' ? 'selected' : ''}
                onClick={() => setMapMode('Globo 3D')}
                type="button"
              >
                <Globe2 size={19} />
                Globo 3D
              </button>
            </div>
          </div>
          <WorldMapMock total={filteredEvents.length} mapMode={mapMode} zoom={zoom} setZoom={setZoom} />
          <p className="map-hint">
            Mapa ilustrativo. Pais real vem de headers Cloudflare (`cf-ipcountry`) ou `x-country-code`.
          </p>
        </div>
        <aside className="access-side">
          <div className="panel compact tall">
            <h2>
              <Globe2 size={24} />
              Top Paises
            </h2>
            {topCountries.length ? (
              <ul className="rank-list">
                {topCountries.slice(0, 5).map((item) => (
                  <li key={item.key}>
                    <strong>{item.key}</strong>
                    <span>{item.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nenhum acesso registrado</p>
            )}
          </div>
          <div className="panel compact tall">
            <h2>
              <Monitor size={24} />
              Dispositivos
            </h2>
            <p>
              {filteredEvents.length
                ? `${mobileCount} mobile / ${desktopCount} desktop`
                : 'Nenhum acesso registrado'}
            </p>
          </div>
        </aside>
      </section>
      <section className="panel recent-access-panel">
        <h2>
          <Activity size={24} />
          Acessos Recentes
          <span>{filteredEvents.length}</span>
        </h2>
        {filteredEvents.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Campanha</th>
                  <th>Decisao</th>
                  <th>Device</th>
                  <th>Risco</th>
                  {showReasons && <th>Motivos</th>}
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <EventRow event={event} key={event.id} showReasons={showReasons} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-access">
            <Users size={68} />
            <p>Nenhum acesso registrado no periodo selecionado</p>
          </div>
        )}
      </section>
    </>
  );
}
