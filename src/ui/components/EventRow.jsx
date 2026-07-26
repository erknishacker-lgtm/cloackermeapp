import { CountryFlag } from './CountryFlag.jsx';

function deviceLabel(event) {
  const d = String(event.device || '').toLowerCase();
  if (d.includes('mobile') || d.includes('phone') || d.includes('android') || d.includes('iphone')) return 'Mobile';
  if (d.includes('tablet') || d.includes('ipad')) return 'Tablet';
  return 'Desktop';
}

function browserFromUa(event) {
  const ua = String(event.userAgent || event.ua || event.browser || '');
  if (/edg\//i.test(ua)) return 'Edge';
  if (/chrome|crios/i.test(ua) && !/edg/i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/opera|opr\//i.test(ua)) return 'Opera';
  return event.browser || '—';
}

function osFromUa(event) {
  const ua = String(event.userAgent || event.ua || event.os || '');
  if (/windows/i.test(ua)) return 'Windows';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ios/i.test(ua)) return 'iOS';
  if (/mac os|macintosh/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  return event.os || '—';
}

function pageUrl(event) {
  return event.pageUrl || event.url || event.path || event.primaryUrl || '—';
}

export function EventRow({ event }) {
  const blocked = event.decision !== 'allow';
  const place = [event.city, event.region || event.country].filter(Boolean).join(', ');
  const when = event.createdAt
    ? new Date(event.createdAt).toLocaleString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '—';

  return (
    <tr className={blocked ? 'row-blocked' : 'row-ok'}>
      <td className="cell-muted mono">{when}</td>
      <td>
        <span className={`status-dot ${blocked ? 'bad' : 'good'}`} title={event.decision}>
          {blocked ? 'Bloqueado' : 'Ok'}
        </span>
      </td>
      <td>
        <strong className="cell-link">{event.campaignName || '—'}</strong>
      </td>
      <td className="cell-url" title={pageUrl(event)}>
        {pageUrl(event)}
      </td>
      <td className="cell-muted">{deviceLabel(event)}</td>
      <td className="cell-muted">{osFromUa(event)}</td>
      <td className="cell-muted">{browserFromUa(event)}</td>
      <td>
        <span className="loc-cell">
          <CountryFlag code={event.country} size={14} />
          <span>{place || event.country || '—'}</span>
        </span>
      </td>
    </tr>
  );
}
