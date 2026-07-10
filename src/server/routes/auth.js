import { Router } from 'express';
import { requireAdmin, requireActiveUser } from '../utils/access.js';
import { createSessionToken, createUserId, hashPassword, verifyPassword } from '../utils/password.js';
import {
  adminListUser,
  generateTempPassword,
  isAdminUser,
  publicUser,
  usernameFromEmail
} from '../utils/users.js';

const SESSION_TTL_MS = 30 * 24 * 60 * 60_000;

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

    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    store.sessions.set(token, { token, userId: user.id, expiresAt, createdAt: new Date().toISOString() });
    store.touch();

    return res.json({
      token,
      expiresAt,
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
