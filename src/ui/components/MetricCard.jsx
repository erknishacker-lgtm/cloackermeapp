export function MetricCard({ label, value, tone, icon: Icon, large }) {
  return (
    <div className={`metric-card ${tone || ''} ${large ? 'large' : ''}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      {Icon && <Icon size={large ? 24 : 32} />}
    </div>
  );
}
