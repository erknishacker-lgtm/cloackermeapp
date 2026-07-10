import { config } from '../config.js';

function extractToken(req) {
  const header = req.headers['x-admin-token'] || req.headers['x-session-token'];
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
 * Protege /api/* (exceto rotas publicas de auth).
 * Aceita:
 * - sessao de usuario (login/senha)
 * - ADMIN_TOKEN de ambiente (override opcional)
 */
export function adminAuth(store) {
  return function adminAuthMiddleware(req, res, next) {
    store.pruneExpiredBlocks?.();
    const provided = extractToken(req);

    if (provided && config.adminToken && provided === config.adminToken) {
      req.authUser = {
        id: 'env_admin',
        username: 'admin',
        role: 'owner',
        fullAccess: true,
        displayName: 'Admin'
      };
      req.authToken = provided;
      return next();
    }

    if (provided && store.sessions?.has(provided)) {
      const session = store.sessions.get(provided);
      if (session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) {
        store.sessions.delete(provided);
        store.touch();
      } else {
        const user = store.users.find((item) => item.id === session.userId);
        if (user) {
          if (user.active === false && user.role !== 'owner' && user.username !== 'louzada') {
            return res.status(403).json({
              errors: ['user_disabled'],
              message: 'Usuario desativado. Contate o admin.'
            });
          }
          req.authUser = user;
          req.authToken = provided;
          return next();
        }
      }
    }

    // Sem token: se existir ao menos 1 usuario, exige login
    if ((store.users || []).length > 0) {
      return res.status(401).json({
        errors: ['unauthorized'],
        message: 'Faca login com usuario e senha.'
      });
    }

    // Fallback legado: ADMIN_TOKEN obrigatorio se configurado e sem usuarios
    if (config.adminToken) {
      return res.status(401).json({
        errors: ['unauthorized'],
        message: 'Informe o ADMIN_TOKEN ou faca login.'
      });
    }

    return next();
  };
}
