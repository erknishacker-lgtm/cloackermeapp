function countryFlag(code) {
  const c = String(code || '')
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return '';
  const base = 127397;
  return String.fromCodePoint(base + c.charCodeAt(0), base + c.charCodeAt(1));
}

export function EventRow({ event, showReasons = true }) {
  const safeReasons = event.reasons?.join(', ') || 'browser_headers_present';
  const place = [event.city, event.region, event.country].filter(Boolean).join(' · ');
  const flag = countryFlag(event.country);

  return (
    <tr>
      <td>
        <strong>{event.campaignName}</strong>
        <span>
          {event.ip}
          {place ? ` · ${flag ? `${flag} ` : ''}${place}` : ''}
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
