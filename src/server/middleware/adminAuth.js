import { config } from '../config.js';

function extractToken(req) {
  const header = req.headers['x-admin-token'];
  if (header) return String(header);

  const auth = req.headers.authorization || '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }

  const cookie = req.headers.cookie || '';
  const match = cookie.match(/(?:^|;\s*)admin_token=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);

  return '';
}

/**
 * Protege /api/* quando ADMIN_TOKEN estiver definido.
 * /health e /r/* permanecem públicos.
 */
export function adminAuth(req, res, next) {
  const expected = config.adminToken;
  if (!expected) return next();

  const provided = extractToken(req);
  if (provided && provided === expected) return next();

  return res.status(401).json({
    errors: ['unauthorized'],
    message: 'Informe o ADMIN_TOKEN (header x-admin-token ou Authorization Bearer).'
  });
}
