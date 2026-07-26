import { Router } from 'express';
import { requireAdmin, requireActiveUser } from '../utils/access.js';
import { getClientIp } from '../utils/ip.js';
import { createSessionToken, createUserId, hashPassword, verifyPassword } from '../utils/password.js';
import { parseUserAgent, publicSession } from '../utils/sessionMeta.js';
import { buildOtpAuthUrl, generateTotpSecret, verifyTotp } from '../utils/totp.js';
import {
  adminListUser,
  generateTempPassword,
  isAdminUser,
  publicUser,
  usernameFromEmail
} from '../utils/users.js';

const SESSION_TTL_MS = 30 * 24 * 60 * 60_000;
const CHALLENGE_TTL_MS = 5 * 60_000;

function cleanUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 32);
}

function cleanEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .slice(0, 120);
}

function findUserByLogin(store, login) {
  const value = String(login || '')
    .trim()
    .toLowerCase();
  if (!value) return null;
  return (
    store.users.find((item) => item.username === value) ||
    store.users.find((item) => (item.email || '').toLowerCase() === value) ||
    null
  );
}

function createLoginSession(store, user, req) {
  const token = createSessionToken();
  const meta = parseUserAgent(req.headers['user-agent'] || '');
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const session = {
    id: createUserId('ses'),
    token,
    userId: user.id,
    expiresAt,
    createdAt: now,
    lastActiveAt: now,
    ip: getClientIp(req),
    label: meta.label,
    os: meta.os,
    browser: meta.browser,
    userAgent: meta.userAgent
  };
  store.sessions.set(token, session);
  store.touch();
  return session;
}

function prunePending2fa(store) {
  const now = Date.now();
  for (const [token, pending] of store.pending2fa.entries()) {
    if (pending.expiresAt && new Date(pending.expiresAt).getTime() <= now) {
      store.pending2fa.delete(token);
    }
  }
}

export function createAuthRouter(store, requireAuth) {
  const router = Router();

  router.post('/login', (req, res) => {
    const login = String(req.body?.username || req.body?.email || '').trim();
    const password = String(req.body?.password || '');

    if (!login || !password) {
      return res.status(400).json({ errors: ['username_and_password_required'] });
    }

    const user = findUserByLogin(store, login);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ errors: ['invalid_credentials'], message: 'Usuario ou senha invalidos.' });
    }
    if (user.active === false && !isAdminUser(user)) {
      return res.status(403).json({ errors: ['user_disabled'], message: 'Usuario desativado. Contate o admin.' });
    }

    if (user.totpEnabled && user.totpSecret) {
      prunePending2fa(store);
      const challengeToken = createSessionToken();
      store.pending2fa.set(challengeToken, {
        userId: user.id,
        expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'] || ''
      });
      store.touch();
      return res.json({
        requires2fa: true,
        challengeToken,
        message: 'Informe o codigo do autenticador.'
      });
    }

    const session = createLoginSession(store, user, req);
    return res.json({
      token: session.token,
      expiresAt: session.expiresAt,
      user: publicUser(user)
    });
  });

  router.post('/2fa/verify-login', (req, res) => {
    prunePending2fa(store);
    const challengeToken = String(req.body?.challengeToken || '');
    const code = String(req.body?.code || '');
    const pending = store.pending2fa.get(challengeToken);

    if (!pending) {
      return res.status(401).json({
        errors: ['challenge_expired'],
        message: 'Codigo expirado. Faca login de novo.'
      });
    }

    const user = store.users.find((item) => item.id === pending.userId);
    if (!user?.totpEnabled || !user.totpSecret || !verifyTotp(user.totpSecret, code)) {
      return res.status(401).json({
        errors: ['invalid_totp'],
        message: 'Codigo 2FA invalido.'
      });
    }

    store.pending2fa.delete(challengeToken);
    // reconstroi req-like com UA/IP do desafio se necessario
    const fakeReq = {
      headers: { 'user-agent': pending.userAgent || req.headers['user-agent'] },
      socket: req.socket
    };
    // prefer current request IP
    const session = createLoginSession(store, user, req.headers['user-agent'] ? req : fakeReq);
    return res.json({
      token: session.token,
      expiresAt: session.expiresAt,
      user: publicUser(user)
    });
  });

  // Cadastro publico DESATIVADO — apenas admin cria contas
  router.post('/register', (_req, res) => {
    return res.status(403).json({
      errors: ['registration_closed'],
      message: 'Cadastro publico fechado. Solicite acesso ao administrador.'
    });
  });

  router.get('/me', requireAuth, (req, res) => {
    const user = requireActiveUser(req, res);
    if (!user) return undefined;
    return res.json({ user: publicUser(user) });
  });

  router.post('/logout', requireAuth, (req, res) => {
    const token = req.authToken;
    if (token && store.sessions.has(token)) {
      store.sessions.delete(token);
      store.touch();
    }
    return res.status(204).send();
  });

  router.post('/change-password', requireAuth, (req, res) => {
    const authUser = requireActiveUser(req, res);
    if (!authUser) return undefined;

    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    const confirmPassword = String(req.body?.confirmPassword || '');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        errors: ['password_fields_required'],
        message: 'Informe senha atual e nova senha.'
      });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({
        errors: ['password_too_short'],
        message: 'Nova senha deve ter ao menos 6 caracteres.'
      });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        errors: ['password_mismatch'],
        message: 'Confirmacao de senha nao confere.'
      });
    }

    const user = store.users.find((item) => item.id === authUser.id);
    if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
      return res.status(401).json({
        errors: ['invalid_current_password'],
        message: 'Senha atual incorreta.'
      });
    }

    user.passwordHash = hashPassword(newPassword);
    store.users = store.users.map((item) => (item.id === user.id ? user : item));
    store.touch();

    return res.json({ ok: true, message: 'Senha atualizada.', user: publicUser(user) });
  });

  // ---- 2FA setup ----
  router.get('/2fa/status', requireAuth, (req, res) => {
    const authUser = requireActiveUser(req, res);
    if (!authUser) return undefined;
    const user = store.users.find((item) => item.id === authUser.id);
    return res.json({
      enabled: Boolean(user?.totpEnabled),
      pending: Boolean(user?.totpPendingSecret)
    });
  });

  router.post('/2fa/setup', requireAuth, (req, res) => {
    const authUser = requireActiveUser(req, res);
    if (!authUser) return undefined;

    const index = store.users.findIndex((item) => item.id === authUser.id);
    if (index === -1) return res.status(404).json({ errors: ['user_not_found'] });

    const user = { ...store.users[index] };
    if (user.totpEnabled) {
      return res.status(400).json({
        errors: ['already_enabled'],
        message: '2FA ja esta ativo. Desative antes de reconfigurar.'
      });
    }

    const secret = generateTotpSecret();
    user.totpPendingSecret = secret;
    const list = [...store.users];
    list[index] = user;
    store.users = list;
    store.touch();

    const account = user.email || user.username;
    const otpauthUrl = buildOtpAuthUrl({ secret, accountName: account, issuer: 'zGhost' });
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;

    return res.json({
      secret,
      otpauthUrl,
      qrUrl,
      message: 'Escaneie o QR no app autenticador e confirme com o codigo de 6 digitos.'
    });
  });

  router.post('/2fa/enable', requireAuth, (req, res) => {
    const authUser = requireActiveUser(req, res);
    if (!authUser) return undefined;

    const code = String(req.body?.code || '');
    const index = store.users.findIndex((item) => item.id === authUser.id);
    if (index === -1) return res.status(404).json({ errors: ['user_not_found'] });

    const user = { ...store.users[index] };
    const secret = user.totpPendingSecret;
    if (!secret) {
      return res.status(400).json({
        errors: ['setup_required'],
        message: 'Inicie a configuracao do 2FA primeiro.'
      });
    }
    if (!verifyTotp(secret, code)) {
      return res.status(400).json({
        errors: ['invalid_totp'],
        message: 'Codigo invalido. Confira o app e tente de novo.'
      });
    }

    user.totpSecret = secret;
    user.totpEnabled = true;
    delete user.totpPendingSecret;
    const list = [...store.users];
    list[index] = user;
    store.users = list;
    store.touch();

    return res.json({
      ok: true,
      message: '2FA ativado com sucesso.',
      user: publicUser(user)
    });
  });

  router.post('/2fa/disable', requireAuth, (req, res) => {
    const authUser = requireActiveUser(req, res);
    if (!authUser) return undefined;

    const password = String(req.body?.password || '');
    const code = String(req.body?.code || '');
    const index = store.users.findIndex((item) => item.id === authUser.id);
    if (index === -1) return res.status(404).json({ errors: ['user_not_found'] });

    const user = { ...store.users[index] };
    if (!user.totpEnabled) {
      return res.json({ ok: true, message: '2FA ja estava desativado.', user: publicUser(user) });
    }
    if (!verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({
        errors: ['invalid_password'],
        message: 'Senha incorreta.'
      });
    }
    if (!verifyTotp(user.totpSecret, code)) {
      return res.status(400).json({
        errors: ['invalid_totp'],
        message: 'Codigo 2FA invalido.'
      });
    }

    user.totpEnabled = false;
    delete user.totpSecret;
    delete user.totpPendingSecret;
    const list = [...store.users];
    list[index] = user;
    store.users = list;
    store.touch();

    return res.json({
      ok: true,
      message: '2FA desativado.',
      user: publicUser(user)
    });
  });

  // ---- Sessions / dispositivos ----
  router.get('/sessions', requireAuth, (req, res) => {
    const authUser = requireActiveUser(req, res);
    if (!authUser) return undefined;
    store.pruneExpiredBlocks?.();

    const sessions = [];
    for (const [token, s] of store.sessions.entries()) {
      if (s.userId !== authUser.id) continue;
      // Sessões antigas (antes do id/meta): completa na hora
      if (!s.id) s.id = createUserId('ses');
      if (!s.label) {
        const meta = parseUserAgent(s.userAgent || '');
        s.label = meta.label;
        s.os = s.os || meta.os;
        s.browser = s.browser || meta.browser;
      }
      if (!s.lastActiveAt) s.lastActiveAt = s.createdAt || new Date().toISOString();
      sessions.push(publicSession(s, { currentToken: req.authToken }));
      void token;
    }
    sessions.sort((a, b) =>
      String(b.lastActiveAt || b.createdAt).localeCompare(String(a.lastActiveAt || a.createdAt))
    );
    store.touch();

    return res.json({ sessions });
  });

  router.delete('/sessions/:id', requireAuth, (req, res) => {
    const authUser = requireActiveUser(req, res);
    if (!authUser) return undefined;

    const id = String(req.params.id || '');
    let removed = false;
    for (const [token, session] of store.sessions.entries()) {
      if (session.userId === authUser.id && session.id === id) {
        if (token === req.authToken) {
          return res.status(400).json({
            errors: ['cannot_revoke_current'],
            message: 'Use Sair para encerrar este dispositivo.'
          });
        }
        store.sessions.delete(token);
        removed = true;
        break;
      }
    }
    if (!removed) return res.status(404).json({ errors: ['session_not_found'] });
    store.touch();
    return res.status(204).send();
  });

  router.post('/sessions/revoke-others', requireAuth, (req, res) => {
    const authUser = requireActiveUser(req, res);
    if (!authUser) return undefined;

    let count = 0;
    for (const [token, session] of store.sessions.entries()) {
      if (session.userId === authUser.id && token !== req.authToken) {
        store.sessions.delete(token);
        count += 1;
      }
    }
    store.touch();
    return res.json({ ok: true, revoked: count });
  });

  router.post('/sessions/revoke-all', requireAuth, (req, res) => {
    const authUser = requireActiveUser(req, res);
    if (!authUser) return undefined;

    let count = 0;
    for (const [token, session] of store.sessions.entries()) {
      if (session.userId === authUser.id) {
        store.sessions.delete(token);
        count += 1;
      }
    }
    store.touch();
    return res.json({ ok: true, revoked: count, loggedOut: true });
  });

  // ---- Admin: gerenciar usuarios ----
  router.get('/users', requireAuth, (req, res) => {
    if (!requireAdmin(req, res)) return undefined;
    const users = store.users.map(adminListUser).sort((a, b) => {
      if (a.role === 'owner') return -1;
      if (b.role === 'owner') return 1;
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
    return res.json(users);
  });

  router.post('/users', requireAuth, (req, res) => {
    if (!requireAdmin(req, res)) return undefined;

    const email = cleanEmail(req.body?.email);
    let username = cleanUsername(req.body?.username || usernameFromEmail(email));
    const displayName = String(req.body?.displayName || username).trim().slice(0, 64);
    const tempPassword = String(req.body?.password || generateTempPassword(8));

    if (!email || !email.includes('@')) {
      return res.status(400).json({ errors: ['email_invalid'], message: 'Informe um e-mail valido.' });
    }
    if (store.users.some((item) => (item.email || '').toLowerCase() === email)) {
      return res.status(409).json({ errors: ['email_taken'], message: 'Este e-mail ja existe.' });
    }
    if (!username || username.length < 3) {
      return res.status(400).json({ errors: ['username_invalid'], message: 'Usuario invalido.' });
    }
    if (store.users.some((item) => item.username === username)) {
      username = `${username}${Math.floor(Math.random() * 90 + 10)}`;
    }
    if (tempPassword.length < 6) {
      return res.status(400).json({ errors: ['password_too_short'] });
    }

    const user = {
      id: createUserId(),
      username,
      passwordHash: hashPassword(tempPassword),
      role: 'user',
      fullAccess: true,
      active: true,
      displayName,
      email,
      createdAt: new Date().toISOString()
    };

    store.users = [user, ...store.users];
    store.touch();

    return res.status(201).json({
      user: adminListUser(user),
      temporaryPassword: tempPassword,
      message: 'Usuario criado. Repasse a senha temporaria ao cliente.'
    });
  });

  router.patch('/users/:id', requireAuth, (req, res) => {
    if (!requireAdmin(req, res)) return undefined;

    const index = store.users.findIndex((item) => item.id === req.params.id);
    if (index === -1) return res.status(404).json({ errors: ['user_not_found'] });

    const current = store.users[index];
    if (isAdminUser(current) && req.body?.active === false) {
      return res.status(400).json({
        errors: ['cannot_disable_owner'],
        message: 'Nao e permitido desativar o admin principal.'
      });
    }

    const next = { ...current };
    if (req.body?.active !== undefined) next.active = Boolean(req.body.active);
    if (req.body?.displayName !== undefined) next.displayName = String(req.body.displayName).trim().slice(0, 64);
    if (req.body?.email !== undefined) {
      const email = cleanEmail(req.body.email);
      if (!email.includes('@')) {
        return res.status(400).json({ errors: ['email_invalid'] });
      }
      if (store.users.some((item, i) => i !== index && (item.email || '').toLowerCase() === email)) {
        return res.status(409).json({ errors: ['email_taken'], message: 'Este e-mail ja existe.' });
      }
      next.email = email;
    }

    const list = [...store.users];
    list[index] = next;
    store.users = list;
    store.touch();
    return res.json(adminListUser(next));
  });

  router.delete('/users/:id', requireAuth, (req, res) => {
    if (!requireAdmin(req, res)) return undefined;

    const user = store.users.find((item) => item.id === req.params.id);
    if (!user) return res.status(404).json({ errors: ['user_not_found'] });
    if (isAdminUser(user)) {
      return res.status(400).json({
        errors: ['cannot_delete_owner'],
        message: 'Nao e permitido excluir o admin principal.'
      });
    }

    store.users = store.users.filter((item) => item.id !== user.id);
    for (const [token, session] of store.sessions.entries()) {
      if (session.userId === user.id) store.sessions.delete(token);
    }
    store.touch();
    return res.status(204).send();
  });

  return router;
}
