import { useMemo, useState } from 'react';
import { UiCard } from './UiCard.jsx';

const RANGES = [
  { id: '90', label: 'Ultimos 3 meses', days: 90 },
  { id: '30', label: 'Ultimos 30 dias', days: 30 },
  { id: '7', label: 'Ultimos 7 dias', days: 7 }
];

const W = 960;
const H = 220;
const PAD = { top: 16, right: 12, bottom: 34, left: 12 };

function dayKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatLabel(ts, days) {
  const d = new Date(ts);
  // 7 dias: "25 jul" · 30/90 dias: "25/07" (mais curto, evita empilhar)
  if (days <= 7) {
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/** Escolhe indices de eixo X com espaco minimo em pixels (sem datas por cima). */
function pickLabelIndices(count, plotW, minPx = 68) {
  if (count <= 1) return [0];
  const maxLabels = Math.max(3, Math.floor(plotW / minPx) + 1);
  const step = Math.max(1, Math.ceil((count - 1) / (maxLabels - 1)));
  const pxPer = plotW / (count - 1);
  const raw = [];
  for (let i = 0; i < count; i += step) raw.push(i);
  if (raw[raw.length - 1] !== count - 1) raw.push(count - 1);

  const out = [];
  for (const i of raw) {
    if (!out.length) {
      out.push(i);
      continue;
    }
    const prev = out[out.length - 1];
    const dist = (i - prev) * pxPer;
    if (dist < minPx * 0.9) {
      // Se for o ultimo ponto, troca o penultimo (evita 25/07 e 26/07 colados)
      if (i === count - 1) {
        out[out.length - 1] = i;
      }
      continue;
    }
    out.push(i);
  }
  return out;
}

/** Buckets diarios com total e white (allow) — dados reais dos eventos. */
function buildSeries(events, days) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = now.getTime() - (days - 1) * 24 * 60 * 60_000;
  const buckets = [];
  for (let i = 0; i < days; i += 1) {
    const t = start + i * 24 * 60 * 60_000;
    buckets.push({ t, total: 0, white: 0 });
  }
  const index = new Map(buckets.map((b, i) => [b.t, i]));

  for (const event of events || []) {
    const ts = new Date(event.createdAt).getTime();
    if (!Number.isFinite(ts) || ts < start) continue;
    const key = dayKey(ts);
    const i = index.get(key);
    if (i == null) continue;
    buckets[i].total += 1;
    if (event.decision === 'allow') buckets[i].white += 1;
  }
  return buckets;
}

function smoothLine(points) {
  if (points.length < 2) return '';
  let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

function areaPath(points, baselineY) {
  if (!points.length) return '';
  const line = smoothLine(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L ${last[0].toFixed(1)} ${baselineY} L ${first[0].toFixed(1)} ${baselineY} Z`;
}

export function VisitorsChart({ events = [] }) {
  const [rangeId, setRangeId] = useState('30');
  const range = RANGES.find((r) => r.id === rangeId) || RANGES[1];

  const series = useMemo(() => buildSeries(events, range.days), [events, range.days]);
  const totalSum = useMemo(() => series.reduce((s, b) => s + b.total, 0), [series]);
  const maxY = Math.max(4, ...series.map((b) => b.total));

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const baseline = PAD.top + plotH;

  const totalPts = series.map((b, i) => {
    const x = PAD.left + (series.length <= 1 ? plotW / 2 : (i / (series.length - 1)) * plotW);
    const y = PAD.top + plotH - (b.total / maxY) * plotH;
    return [x, y];
  });
  const whitePts = series.map((b, i) => {
    const x = PAD.left + (series.length <= 1 ? plotW / 2 : (i / (series.length - 1)) * plotW);
    const y = PAD.top + plotH - (b.white / maxY) * plotH;
    return [x, y];
  });

  const labelIndices = pickLabelIndices(series.length, plotW, range.days <= 7 ? 56 : 72);
  const xLabels = labelIndices.map((i) => ({
    i,
    t: series[i].t,
    label: formatLabel(series[i].t, range.days)
  }));

  return (
    <UiCard className="visitors-chart">
      <div className="visitors-chart-head">
        <div>
          <h2 className="visitors-chart-title">Total de visitantes</h2>
          <p className="visitors-chart-sub">
            {range.label} · <strong className="mono">{totalSum}</strong> acessos reais na conta
          </p>
        </div>
        <div className="visitors-range" role="tablist" aria-label="Periodo">
          {RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={rangeId === item.id}
              className={rangeId === item.id ? 'selected' : ''}
              onClick={() => setRangeId(item.id)}
            >
              {item.id === '90' ? '3 meses' : item.id === '30' ? '30 dias' : '7 dias'}
            </button>
          ))}
        </div>
      </div>

      <div className="visitors-chart-body">
        <svg viewBox={`0 0 ${W} ${H}`} className="visitors-svg" role="img" aria-label="Grafico de visitantes">
          <defs>
            <linearGradient id="visitorsGold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.81 0.17 75.35)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="oklch(0.81 0.17 75.35)" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="visitorsBlue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.58 0.21 260.84)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="oklch(0.58 0.21 260.84)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((tick) => (
            <line
              key={tick}
              className="visitors-grid"
              x1={PAD.left}
              x2={W - PAD.right}
              y1={PAD.top + plotH * (1 - tick)}
              y2={PAD.top + plotH * (1 - tick)}
            />
          ))}

          <path className="visitors-area gold" d={areaPath(totalPts, baseline)} fill="url(#visitorsGold)" />
          <path className="visitors-area blue" d={areaPath(whitePts, baseline)} fill="url(#visitorsBlue)" />
          <path className="visitors-line gold" d={smoothLine(totalPts)} fill="none" />
          <path className="visitors-line blue" d={smoothLine(whitePts)} fill="none" />

          {xLabels.map(({ i, label, t }) => {
            const x = PAD.left + (series.length <= 1 ? plotW / 2 : (i / (series.length - 1)) * plotW);
            return (
              <text key={t} className="visitors-xlabel" x={x} y={H - 6} textAnchor="middle">
                {label}
              </text>
            );
          })}
        </svg>
      </div>

      <div className="visitors-legend">
        <span className="gold">Total de visitas</span>
        <span className="blue">White (aprovados)</span>
      </div>
    </UiCard>
  );
}
