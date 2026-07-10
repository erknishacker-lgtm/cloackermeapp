import { randomBytes } from 'node:crypto';
import { hashPasswordStable } from './password.js';

export const OWNER_USERNAME = 'louzada';
export const OWNER_PASSWORD = 'cuassado';
export const OWNER_ID = 'usr_louzada';

export function createOwnerUser() {
  return {
    id: OWNER_ID,
    username: OWNER_USERNAME,
    passwordHash: hashPasswordStable(OWNER_PASSWORD, 'cloaker.lol-owner'),
    role: 'owner',
    fullAccess: true,
    active: true,
    displayName: 'Louzada',
    email: 'louzada@cloaker.lol',
    createdAt: new Date().toISOString()
  };
}

export function isAdminUser(user) {
  if (!user) return false;
  if (user.role === 'owner' || user.role === 'admin') return true;
  if (user.username === OWNER_USERNAME || user.id === OWNER_ID) return true;
  return false;
}

export function isUserActive(user) {
  return Boolean(user) && user.active !== false;
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    isAdmin: isAdminUser(user),
    fullAccess: isAdminUser(user) || user.fullAccess !== false,
    active: user.active !== false,
    displayName: user.displayName || user.username,
    email: user.email || '',
    createdAt: user.createdAt
  };
}

export function adminListUser(user) {
  if (!user) return null;
  return {
    ...publicUser(user),
    active: user.active !== false
  };
}

/** Garante owner; NAO reseta senha se ja existir hash (permite troca de senha). */
export function ensureOwnerUser(users) {
  const list = Array.isArray(users) ? users.map((u) => normalizeUserRecord(u)) : [];
  const ownerIndex = list.findIndex((u) => u.username === OWNER_USERNAME || u.id === OWNER_ID);

  if (ownerIndex >= 0) {
    const owner = { ...list[ownerIndex] };
    owner.id = OWNER_ID;
    owner.username = OWNER_USERNAME;
    owner.role = 'owner';
    owner.fullAccess = true;
    owner.active = true;
    owner.displayName = owner.displayName || 'Louzada';
    owner.email = owner.email || 'louzada@cloaker.lol';
    if (!owner.passwordHash) {
      owner.passwordHash = hashPasswordStable(OWNER_PASSWORD, 'cloaker.lol-owner');
    }
    if (!owner.createdAt) owner.createdAt = new Date().toISOString();
    const next = [...list];
    next[ownerIndex] = owner;
    return next;
  }

  return [createOwnerUser(), ...list];
}

export function normalizeUserRecord(user = {}) {
  const role = user.role === 'admin' || user.role === 'owner' ? user.role : user.role === 'member' ? 'user' : user.role || 'user';
  return {
    id: user.id || OWNER_ID,
    username: String(user.username || '').toLowerCase(),
    passwordHash: user.passwordHash || '',
    role: user.username === OWNER_USERNAME || user.id === OWNER_ID ? 'owner' : role === 'owner' ? 'user' : role,
    fullAccess: user.fullAccess !== false,
    active: user.active !== false,
    displayName: user.displayName || user.username || '',
    email: String(user.email || '').trim().toLowerCase(),
    createdAt: user.createdAt || new Date().toISOString()
  };
}

export function generateTempPassword(length = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export function usernameFromEmail(email) {
  const local = String(email || '')
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 24);
  return local.length >= 3 ? local : `user${Date.now().toString(36).slice(-5)}`;
}
