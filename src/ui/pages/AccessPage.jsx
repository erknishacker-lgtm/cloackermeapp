import {
  Activity,
  Filter,
  Globe2,
  ListFilter,
  Map as MapIcon,
  RefreshCw,
  Search
} from '../icons.jsx';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { CountryFlag } from '../components/CountryFlag.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { EventRow } from '../components/EventRow.jsx';
import { UiCard } from '../components/UiCard.jsx';
import { WorldMap } from '../components/WorldMap.jsx';

function countryFlagEmoji(code) {
  const c = String(code || '')
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return '';
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
      flag: countryFlagEmoji(country),
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

  return { total: events.filter((e) => e.country && e.country !== 'XX').length, topCountries, mapPins };
}

export function AccessPage({ events, stats, refreshData }) {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [timeRange, setTimeRange] = useState('1440');
  const [typeFilter, setTypeFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [mapMode, setMapMode] = useState('Mapa 2D');
  const [locations, setLocations] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(() =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  const filteredEvents = useMemo(() => {
    return (events || []).filter((event) => {
      if (typeFilter !== 'all' && event.decision !== typeFilter) return false;
      const eventTime = new Date(event.createdAt).getTime();
      if (Date.now() - eventTime > Number(timeRange) * 60_000) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const hay = `${event.campaignName || ''} ${event.ip || ''} ${event.country || ''} ${event.city || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, typeFilter, timeRange, query]);

  const localAgg = useMemo(() => aggregateFromEvents(filteredEvents), [filteredEvents]);
  const topCountries = locations?.topCountries?.length
    ? locations.topCountries
    : localAgg.topCountries;
  const mapPins = locations?.mapPins?.length ? locations.mapPins : localAgg.mapPins;
  const locationTotal = locations?.total ?? localAgg.total;

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

  function stamp() {
    setLastUpdated(
      new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
  }

  return (
    <div className="cloakup-page wide">
      <header className="cloakup-page-head row">
        <div>
          <p className="page-breadcrumb">Dashboard / Requisicoes</p>
          <h1>Requisicoes</h1>
          <p className="page-kicker">Atualizado as {lastUpdated}</p>
        </div>
        <div className="header-actions">
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              Promise.all([refreshData(), loadLocations()]).then(stamp);
            }}
          >
            <RefreshCw size={16} />
            Recarregar
          </button>
          <button
            className={`ghost-button ${autoRefresh ? 'is-on' : ''}`}
            type="button"
            onClick={() => setAutoRefresh((v) => !v)}
          >
            <Filter size={16} />
            Filtros
          </button>
        </div>
      </header>

      <section className="list-toolbar soft">
        <div className="search-field">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar campanha, IP ou pais"
          />
        </div>
        <label className="filter-select">
          <ListFilter size={16} />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">Todos os status</option>
            <option value="allow">Ok / White</option>
            <option value="fallback">Bloqueados</option>
          </select>
        </label>
        <label className="filter-select">
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            <option value="30">Ultimos 30 min</option>
            <option value="60">Ultima hora</option>
            <option value="1440">Hoje</option>
            <option value="10080">7 dias</option>
          </select>
        </label>
      </section>

      <UiCard className="table-panel">
        <div className="table-wrap">
          <table className="data-table requests-table">
            <thead>
              <tr>
                <th>Criado em</th>
                <th>Status</th>
                <th>Campanha</th>
                <th>Pagina</th>
                <th>Dispositivo</th>
                <th>SO</th>
                <th>Navegador</th>
                <th>Localizacao</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length ? (
                filteredEvents.map((event) => <EventRow event={event} key={event.id} />)
              ) : (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon={Activity}
                      title="Nenhuma requisicao no periodo"
                      description="Abra um link /r/slug (via Cloudflare) para gerar trafego e ver a tabela."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredEvents.length > 0 ? (
          <div className="table-footer">
            <span>
              {filteredEvents.length} registro{filteredEvents.length === 1 ? '' : 's'} · total API:{' '}
              {stats?.total ?? 0}
            </span>
          </div>
        ) : null}
      </UiCard>

      <section className="map-stack">
        <UiCard className="map-panel">
          <div className="panel-title" style={{ padding: '12px 12px 0' }}>
            <h2>
              <MapIcon size={16} />
              Mapa de acessos
            </h2>
            <div className="segmented">
              <button
                className={mapMode === 'Mapa 2D' ? 'selected' : ''}
                onClick={() => setMapMode('Mapa 2D')}
                type="button"
              >
                Mapa
              </button>
              <button
                className={mapMode === 'Globo 3D' ? 'selected' : ''}
                onClick={() => setMapMode('Globo 3D')}
                type="button"
              >
                Ampla
              </button>
            </div>
          </div>
          <div style={{ padding: '8px 12px 12px' }}>
            <WorldMap pins={mapPins} total={locationTotal} mode={mapMode === 'Globo 3D' ? 'globe' : '2d'} />
          </div>
        </UiCard>

        <UiCard className="map-side-card">
          <div className="ui-card-header">
            <div className="ui-card-header-main">
              <div className="ui-card-icon" aria-hidden>
                <Globe2 size={16} />
              </div>
              <h3 className="ui-card-title">Top paises</h3>
            </div>
          </div>
          <div className="ui-card-body">
            {topCountries?.length ? (
              <ul className="rank-list">
                {topCountries.slice(0, 10).map((item) => (
                  <li key={item.country || item.key}>
                    <strong className="rank-country">
                      <CountryFlag code={item.country || item.key} size={14} />
                      {item.country || item.key}
                      {item.city ? <em className="country-city"> · {item.city}</em> : null}
                    </strong>
                    <span className="mono">{item.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="Sem paises ainda"
                description="Gere trafego via Cloudflare para popular o ranking."
              />
            )}
          </div>
        </UiCard>
      </section>
    </div>
  );
}
