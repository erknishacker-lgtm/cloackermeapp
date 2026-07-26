export function parseUserAgent(ua = '') {
  const s = String(ua || '');
  let os = 'Desconhecido';
  let browser = 'Navegador';

  if (/windows/i.test(s)) os = 'Windows';
  else if (/android/i.test(s)) os = 'Android';
  else if (/iphone|ipad|ios/i.test(s)) os = 'iOS';
  else if (/mac os|macintosh/i.test(s)) os = 'macOS';
  else if (/linux/i.test(s)) os = 'Linux';

  if (/edg\//i.test(s)) browser = 'Edge';
  else if (/chrome|crios/i.test(s) && !/edg/i.test(s)) browser = 'Chrome';
  else if (/safari/i.test(s) && !/chrome|crios/i.test(s)) browser = 'Safari';
  else if (/firefox|fxios/i.test(s)) browser = 'Firefox';
  else if (/opera|opr\//i.test(s)) browser = 'Opera';

  return {
    os,
    browser,
    label: `${os} · ${browser}`,
    userAgent: s.slice(0, 300)
  };
}

export function publicSession(session, { currentToken } = {}) {
  if (!session) return null;
  return {
    id: session.id,
    label: session.label || 'Dispositivo',
    os: session.os || '',
    browser: session.browser || '',
    ip: session.ip || '—',
    createdAt: session.createdAt,
    lastActiveAt: session.lastActiveAt || session.createdAt,
    current: Boolean(currentToken && session.token === currentToken)
  };
}
