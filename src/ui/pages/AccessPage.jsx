import {
  Activity,
  CheckCircle2,
  Clock3,
  Eye,
  Filter,
  Globe2,
  ListFilter,
  Map as MapIcon,
  Monitor,
  RefreshCw,
  ToggleRight,
  Users,
  XCircle
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { EventRow } from '../components/EventRow.jsx';
import { MetricCard } from '../components/MetricCard.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { WorldMap } from '../components/WorldMap.jsx';

function countryFlag(code) {
  const c = String(code || '')
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return '🌐';
  const base = 127397;
  return String.fromCodePoint(base + c.charCodeAt(0), base + c.charCodeAt(1));
}

function aggregateFromEvents(events) {
  const map = new Map();
  for (const event of events) {
    const country = String(event.country || '')
      .trim()
      .toUpperCase();
    if (!country || country === 'XX' || country === 'T1' || country === '??') continue;
    const prev = map.get(country) || {
      country,
      flag: countryFlag(country),
      count: 0,
      city: event.city || '',
      lat: event.latitude,
      lng: event.longitude
    };
    prev.count += 1;
    if (!prev.city && event.city) prev.city = event.city;
    if ((prev.lat == null || prev.lng == null) && event.latitude != null && event.longitude != null) {
      prev.lat = event.latitude;
      prev.lng = event.longitude;
    }
    map.set(country, prev);
  }

  const topCountries = [...map.values()].sort((a, b) => b.count - a.count);
  const mapPins = topCountries
    .filter((item) => item.lat != null && item.lng != null && !(Number(item.lat) === 0 && Number(item.lng) === 0))
    .map((item) => ({
      lat: Number(item.lat),
      lng: Number(item.lng),
      country: item.country,
      flag: item.flag,
      city: item.city || '—',
      count: item.count
    }));

  return {
    total: events.filter((e) => e.country && e.country !== 'XX').length,
    topCountries,
    mapPins
  };
}

export function AccessPage({ events, stats, refreshData }) {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [timeRange, setTimeRange] = useState('1440');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showReasons, setShowReasons] = useState(true);
  const [mapMode, setMapMode] = useState('Mapa 2D');
  const [locations, setLocations] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(() =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  const filteredEvents = events.filter((event) => {
    if (typeFilter !== 'all' && event.decision !== typeFilter) return false;
    const eventTime = new Date(event.createdAt).getTime();
    return Date.now() - eventTime <= Number(timeRange) * 60_000;
  });

  const localAgg = useMemo(() => aggregateFromEvents(filteredEvents), [filteredEvents]);

  const topCountries = locations?.topCountries?.length
    ? locations.topCountries
    : localAgg.topCountries.map((item) => ({
        country: item.country,
        flag: item.flag,
        count: item.count,
        city: item.city
      }));

  const mapPins = locations?.mapPins?.length ? locations.mapPins : localAgg.mapPins;
  const locationTotal = locations?.total ?? localAgg.total;

  const white = stats.white || stats.allowed || 0;
  const black = stats.black || stats.fallback || 0;
  const mobileCount = filteredEvents.filter((e) => e.device === 'mobile').length;
  const desktopCount = filteredEvents.length - mobileCount;

  async function loadLocations() {
    try {
      const { ok, payload } = await api.getLocations({ limit: 800 });
      if (ok && payload) setLocations(payload);
    } catch {
      // fallback local
    }
  }

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = window.setInterval(() => {
      Promise.all([refreshData(), loadLocations()]).then(() => {
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
              <ToggleRight size={22} />
              Auto (30s)
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                Promise.all([refreshData(), loadLocations()]).then(() =>
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
        <MetricCard label="Black (fallback)" value={black} tone="amber" icon={XCircle} />
        <MetricCard label="Com pais" value={locationTotal} tone="blue" icon={Globe2} />
      </section>
      <section className="panel filters-panel">
        <Filter size={20} />
        <span>Filtros:</span>
        <label className="filter-select">
          <Clock3 size={18} />
          <select value={timeRange} onChange={(event) => setTimeRange(event.target.value)}>
            <option value="30">Ultimos 30 min</option>
            <option value="60">Ultima hora</option>
            <option value="1440">Hoje</option>
            <option value="10080">7 dias</option>
          </select>
        </label>
        <label className="filter-select">
          <ListFilter size={18} />
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">Todos os tipos</option>
            <option value="allow">White (aprovados)</option>
            <option value="fallback">Black (fallback)</option>
          </select>
        </label>
        <button type="button" onClick={() => setShowReasons((current) => !current)}>
          <Eye size={18} />
          {showReasons ? 'Ocultar motivos' : 'Mostrar motivos'}
        </button>
      </section>
      <section className="access-grid">
        <div className="panel map-panel">
          <div className="panel-title">
            <h2>Localizacao dos Acessos</h2>
            <div className="segmented">
              <button className={mapMode === 'Mapa 2D' ? 'selected' : ''} onClick={() => setMapMode('Mapa 2D')} type="button">
                <MapIcon size={18} />
                Mapa 2D
              </button>
              <button
                className={mapMode === 'Globo 3D' ? 'selected' : ''}
                onClick={() => setMapMode('Globo 3D')}
                type="button"
              >
                <Globe2 size={18} />
                Vista ampla
              </button>
            </div>
          </div>
          <WorldMap
            pins={mapPins}
            total={locationTotal}
            mode={mapMode === 'Globo 3D' ? 'globe' : '2d'}
          />
          <p className="map-hint">
            Mapa real: OpenStreetMap (grátis). Pinos: país/cidade da <strong>Cloudflare</strong> (
            <code>cf-ipcountry</code> etc.) em cada clique em <code>/r/slug</code>.
          </p>
        </div>
        <aside className="access-side">
          <div className="panel compact tall">
            <h2>
              <Globe2 size={20} />
              Top Paises
            </h2>
            {topCountries.length ? (
              <ul className="rank-list">
                {topCountries.slice(0, 8).map((item) => (
                  <li key={item.country || item.key}>
                    <strong>
                      <span className="country-flag">{item.flag || countryFlag(item.country || item.key)}</span>
                      {item.country || item.key}
                      {item.city ? <em className="country-city"> · {item.city}</em> : null}
                    </strong>
                    <span>{item.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-mini">Nenhum pais ainda. Gere trafego no /r/slug atras da Cloudflare.</p>
            )}
          </div>
          <div className="panel compact tall">
            <h2>
              <Monitor size={20} />
              Dispositivos
            </h2>
            <p>
              {filteredEvents.length
                ? `${mobileCount} mobile / ${desktopCount} desktop`
                : 'Nenhum acesso no periodo'}
            </p>
          </div>
        </aside>
      </section>
      <section className="panel recent-access-panel">
        <h2>
          <Activity size={20} />
          Acessos Recentes
          <span>{filteredEvents.length}</span>
        </h2>
        {filteredEvents.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Campanha / Local</th>
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
            <Users size={56} />
            <p>Nenhum acesso registrado no periodo selecionado</p>
          </div>
        )}
      </section>
    </>
  );
}
