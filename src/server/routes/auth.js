import { Router } from 'express';
import { createSessionToken, createUserId, hashPassword, verifyPassword } from '../utils/password.js';
import { publicUser } from '../utils/users.js';

const SESSION_TTL_MS = 30 * 24 * 60 * 60_000;

function cleanUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 32);
}

export function createAuthRouter(store, requireAuth) {
  const router = Router();

  router.post('/login', (req, res) => {
    const username = cleanUsername(req.body?.username);
    const password = String(req.body?.password || '');

    if (!username || !password) {
      return res.status(400).json({ errors: ['username_and_password_required'] });
    }

    const user = store.users.find((item) => item.username === username);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ errors: ['invalid_credentials'], message: 'Usuario ou senha invalidos.' });
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

  router.post('/register', (req, res) => {
    const username = cleanUsername(req.body?.username);
    const password = String(req.body?.password || '');
    const displayName = String(req.body?.displayName || username).trim().slice(0, 64);
    const email = String(req.body?.email || '').trim().slice(0, 120);

    if (!username || username.length < 3) {
      return res.status(400).json({ errors: ['username_invalid'], message: 'Usuario deve ter ao menos 3 caracteres.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ errors: ['password_too_short'], message: 'Senha deve ter ao menos 6 caracteres.' });
    }
    if (store.users.some((item) => item.username === username)) {
      return res.status(409).json({ errors: ['username_taken'], message: 'Este usuario ja existe.' });
    }

    const user = {
      id: createUserId(),
      username,
      passwordHash: hashPassword(password),
      role: 'member',
      fullAccess: true,
      displayName,
      email,
      createdAt: new Date().toISOString()
    };

    store.users = [user, ...store.users];
    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    store.sessions.set(token, { token, userId: user.id, expiresAt, createdAt: new Date().toISOString() });
    store.touch();

    return res.status(201).json({
      token,
      expiresAt,
      user: publicUser(user)
    });
  });

  router.get('/me', requireAuth, (req, res) => {
    const user = req.authUser;
    if (!user) return res.status(401).json({ errors: ['unauthorized'] });
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

  return router;
}
