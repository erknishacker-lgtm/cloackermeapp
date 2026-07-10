import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

/**
 * Mapa mundi real (OpenStreetMap tiles, grátis) + pinos dos acessos (geo Cloudflare).
 */
export function WorldMap({ pins = [], total = 0, mode = '2d' }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;

    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 1,
      maxZoom: 10,
      worldCopyJump: true,
      zoomControl: true,
      attributionControl: true
    });

    // Tiles gratuitos OpenStreetMap (sem chave de API)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    // Corrige tamanho quando o container ja esta no layout
    const t = window.setTimeout(() => map.invalidateSize(), 80);

    return () => {
      window.clearTimeout(t);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const safePins = Array.isArray(pins) ? pins : [];
    const bounds = [];

    for (const pin of safePins) {
      const lat = Number(pin.lat);
      const lng = Number(pin.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      if (lat === 0 && lng === 0) continue;

      const flag = pin.flag || pin.country || '•';
      const count = pin.count || 1;
      const label = `${flag} ${pin.country || ''}${pin.city ? ` · ${pin.city}` : ''} — ${count}`;

      const icon = L.divIcon({
        className: 'cf-map-marker',
        html: `<div class="cf-map-pin" title="${escapeHtml(label)}"><span class="cf-map-pin-flag">${escapeHtml(
          flag
        )}</span><span class="cf-map-pin-count">${count}</span></div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      const marker = L.marker([lat, lng], { icon });
      marker.bindPopup(
        `<strong>${escapeHtml(flag)} ${escapeHtml(pin.country || '')}</strong><br/>${
          pin.city ? `${escapeHtml(pin.city)}<br/>` : ''
        }${count} acesso(s)`
      );
      layer.addLayer(marker);
      bounds.push([lat, lng]);
    }

    if (bounds.length === 1) {
      map.setView(bounds[0], 4);
    } else if (bounds.length > 1) {
      try {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 5 });
      } catch {
        map.setView([20, 0], 2);
      }
    } else {
      map.setView([20, 0], 2);
    }

    window.setTimeout(() => map.invalidateSize(), 50);
  }, [pins]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const container = map.getContainer();
    if (mode === 'globe') container.classList.add('map-leaflet-globe');
    else container.classList.remove('map-leaflet-globe');
    window.setTimeout(() => map.invalidateSize(), 50);
  }, [mode]);

  return (
    <div className={`map-card map-card-real ${mode === 'globe' ? 'globe' : ''}`}>
      <span className="map-chip">
        {total} localizaç{total === 1 ? 'ão' : 'ões'}
      </span>
      <div ref={containerRef} className="map-leaflet-host" role="img" aria-label="Mapa mundi real de acessos" />
      {!pins?.length ? (
        <div className="map-empty-overlay">
          <p>
            Mapa mundi ativo (OpenStreetMap). Os pinos aparecem quando houver acessos com país (Cloudflare no link
            <code> /r/slug</code>).
          </p>
        </div>
      ) : null}
    </div>
  );
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
