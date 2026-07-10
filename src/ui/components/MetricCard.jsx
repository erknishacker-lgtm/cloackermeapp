export function MetricCard({ label, value, tone, icon: Icon, large }) {
  return (
    <div className={`metric-card ${tone || ''} ${large ? 'large' : ''}`}>
      <div>
        <span>{label}</span>
        <strong>{value ?? 0}</strong>
      </div>
      {Icon && <Icon size={large ? 22 : 20} strokeWidth={1.75} aria-hidden />}
    </div>
  );
}
