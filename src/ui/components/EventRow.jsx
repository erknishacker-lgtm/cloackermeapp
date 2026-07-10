export function EventRow({ event, showReasons = true }) {
  const safeReasons = event.reasons?.join(', ') || 'browser_headers_present';
  return (
    <tr>
      <td>
        <strong>{event.campaignName}</strong>
        <span>
          {event.ip}
          {event.country ? ` · ${event.country}` : ''}
        </span>
      </td>
      <td>
        <span className={`decision ${event.decision}`}>{event.decision === 'allow' ? 'white' : 'black'}</span>
      </td>
      <td>{event.device}</td>
      <td>{event.riskScore}</td>
      {showReasons && <td title={safeReasons}>{safeReasons}</td>}
    </tr>
  );
}
