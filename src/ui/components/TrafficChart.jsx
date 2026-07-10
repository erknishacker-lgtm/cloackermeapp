import { BarChart3 } from 'lucide-react';
import { useMemo, useState } from 'react';

function linePath(points, index, max = 10) {
  const width = 1280;
  const height = 260;
  const xStep = points.length > 1 ? width / (points.length - 1) : width;
  return points
    .map((point, pointIndex) => {
      const x = pointIndex * xStep;
      const y = height - (point[index] / max) * height;
      return `${pointIndex === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function buildTrafficPoints(events, range) {
  const buckets = range === 'Hoje' ? 24 : range === '7 Dias' ? 7 : 30;
  const rangeMs = range === 'Hoje' ? 24 * 60 * 60_000 : range === '7 Dias' ? 7 * 24 * 60 * 60_000 : 30 * 24 * 60 * 60_000;
  const since = Date.now() - rangeMs;
  const rows = Array.from({ length: buckets }, (_item, index) => [index, 0, 0, 0, 0]);

  events
    .filter((event) => new Date(event.createdAt).getTime() >= since)
    .forEach((event) => {
      const ts = new Date(event.createdAt).getTime();
      let bucket;
      if (range === 'Hoje') {
        bucket = new Date(event.createdAt).getHours();
      } else if (range === '7 Dias') {
        bucket = Math.min(6, Math.floor((ts - since) / (24 * 60 * 60_000)));
      } else {
        bucket = Math.min(29, Math.floor((ts - since) / (24 * 60 * 60_000)));
      }
      if (!rows[bucket]) return;
      rows[bucket][1] += 1;
      if (event.decision === 'allow') rows[bucket][2] += 1;
      if (event.decision === 'fallback') rows[bucket][3] += 1;
      if (event.reasons?.includes('manual_ip_block')) rows[bucket][4] += 1;
    });

  return rows;
}

export function TrafficChart({ events }) {
  const [range, setRange] = useState('Hoje');
  const chartPoints = useMemo(() => buildTrafficPoints(events, range), [events, range]);
  const chartMax = Math.max(10, ...chartPoints.flatMap((point) => point.slice(1)));
  const labels =
    range === 'Hoje'
      ? ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00']
      : range === '7 Dias'
        ? ['D-6', 'D-5', 'D-4', 'D-3', 'D-2', 'D-1', 'Hoje']
        : ['1', '5', '10', '15', '20', '25', '30'];

  return (
    <div className="chart-panel panel">
      <div className="panel-title">
        <div>
          <h2>
            <BarChart3 size={20} />
            Visao Geral de Trafego
          </h2>
          <p>{range === 'Hoje' ? 'Por hora (hoje)' : `Resumo de ${range.toLowerCase()}`}</p>
        </div>
        <div className="range-tabs">
          {['Hoje', '7 Dias', '30 Dias'].map((item) => (
            <button className={range === item ? 'selected' : ''} key={item} onClick={() => setRange(item)} type="button">
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-stage">
        <svg viewBox="0 0 1280 300" role="img" aria-label="Grafico de trafego">
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <g key={tick}>
              <line x1="0" x2="1280" y1={260 - tick * 260} y2={260 - tick * 260} />
              <text x="-10" y={264 - tick * 260}>
                {Math.round(tick * chartMax)}
              </text>
            </g>
          ))}
          {labels.map((label, index) => {
            const x = (index / Math.max(labels.length - 1, 1)) * 1280;
            return (
              <g key={`${label}-${index}`}>
                <line x1={x} x2={x} y1="0" y2="260" />
                <text x={x - 18} y="284">
                  {label}
                </text>
              </g>
            );
          })}
          <path className="line blue" d={linePath(chartPoints, 1, chartMax)} />
          <path className="line green" d={linePath(chartPoints, 2, chartMax)} />
          <path className="line amber" d={linePath(chartPoints, 3, chartMax)} />
          <path className="line red" d={linePath(chartPoints, 4, chartMax)} />
        </svg>
      </div>
      <div className="legend">
        <span className="blue">Total de Acessos</span>
        <span className="green">Acessos White</span>
        <span className="amber">Acessos Black</span>
        <span className="red">Bloqueios</span>
      </div>
    </div>
  );
}
