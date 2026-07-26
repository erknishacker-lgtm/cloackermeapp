/**
 * Metric widget compacto (sem grafico) — padrao shadcn card.
 */
export function MetricCard({ label, value, tone, icon: Icon, large }) {
  return (
    <div className={`ui-card metric-card ${tone || ''} ${large ? 'large' : ''}`}>
      <div className="metric-card-body">
        <span className="metric-card-label">{label}</span>
        <strong className="metric-card-value mono">{value ?? 0}</strong>
      </div>
      {Icon ? (
        <div className="metric-card-icon ui-card-icon" aria-hidden>
          <Icon size={large ? 18 : 16} />
        </div>
      ) : null}
    </div>
  );
}
