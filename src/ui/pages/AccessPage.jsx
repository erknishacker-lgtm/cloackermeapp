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
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { EventRow } from '../components/EventRow.jsx';
import { MetricCard } from '../components/MetricCard.jsx';
import { PageHeader } from '../components/PageHeader.jsx';

const MAP_W = 880;
const MAP_H = 390;

function project(lat, lng) {
  const x = ((Number(lng) + 180) / 360) * MAP_W;
  const y = ((90 - Number(lat)) / 180) * MAP_H;
  return { x, y };
}

function countryFlag(code) {
  const c = String(code || '')
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return '🌐';
  const base = 127397;
  return String.fromCodePoint(base + c.charCodeAt(0), base + c.charCodeAt(1));
}

function LocationMap({ pins, total, mapMode, zoom, setZoom }) {
  const maxCount = Math.max(1, ...pins.map((p) => p.count || 1));

  return (
    <div className={`map-card ${mapMode === 'Globo 3D' ? 'globe' : ''}`}>
      <span className="map-chip">
        {total} localizaç{total === 1 ? 'ão' : 'ões'}
      </span>
      <div className="map-viewport">
        <svg
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          aria-label="Mapa mundial de acessos"
          className="map-svg"
          style={{ transform: `scale(${zoom})` }}
        >
          <defs>
            <pattern id="mapGrid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            </pattern>
            <radialGradient id="pinGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(61,156,253,0.55)" />
              <stop offset="100%" stopColor="rgba(61,156,253,0)" />
            </radialGradient>
          </defs>
          <rect width={MAP_W} height={MAP_H} fill="url(#mapGrid)" />
          {/* Silhuetas simplificadas (contexto visual) */}
          <g className="map-land" fill="rgba(148,163,184,0.12)" stroke="rgba(148,163,184,0.18)" strokeWidth="1">
            <path d="M72 162 111 132l57 14 28 41-10 54-56 21-58-28-22-36z" />
            <path d="M212 102l44-42 86 12 43 45-21 45-81 3-48-22z" />
            <path d="M284 208l62 18 36 62-17 69-56-34-38-68z" />
            <path d="M414 118l72-30 90 20 74 64-39 60-111-8-80-43z" />
            <path d="M526 212l78-6 92 46 44 66-106 20-86-38z" />
            <path d="M690 145l74-48 75 24 2 58-64 47-76-18z" />
            <path d="M730 292l58 10 34 44-43 26-58-18z" />
          </g>
          {pins.map((pin) => {
            const { x, y } = project(pin.lat, pin.lng);
            if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
            const r = 6 + (pin.count / maxCount) * 14;
            return (
              <g key={`${pin.country}-${pin.lat}-${pin.lng}`} className="map-pin" transform={`translate(${x} ${y})`}>
                <circle r={r * 2.2} fill="url(#pinGlow)" opacity="0.7" />
                <circle r={Math.max(5, r * 0.45)} className="map-pin-dot" />
                <title>
                  {pin.flag || ''} {pin.country}
                  {pin.city ? ` · ${pin.city}` : ''} — {pin.count} acesso(s)
                </title>
                <text y={-r - 4} textAnchor="middle" className="map-pin-label">
                  {pin.flag || pin.country} {pin.count}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
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
  const [timeRange, setTimeRange] = useState('30');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showReasons, setShowReasons] = useState(true);
  const [mapMode, setMapMode] = useState('Mapa 2D');
  const [zoom, setZoom] = useState(1);
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

  // Prefer API agregada; fallback para eventos ja carregados
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
                <Map size={18} />
                Mapa 2D
              </button>
              <button
                className={mapMode === 'Globo 3D' ? 'selected' : ''}
                onClick={() => setMapMode('Globo 3D')}
                type="button"
              >
                <Globe2 size={18} />
                Globo 3D
              </button>
            </div>
          </div>
          <LocationMap pins={mapPins} total={locationTotal} mapMode={mapMode} zoom={zoom} setZoom={setZoom} />
          <p className="map-hint">
            Pinos por pais (Cloudflare). Pais via <code>cf-ipcountry</code>. Cidade/lat/lng se os headers de geo estiverem
            ativos na Cloudflare; senao usa centro do pais.
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
