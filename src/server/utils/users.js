import { hashPasswordStable } from './password.js';

export const OWNER_USERNAME = 'louzada';
export const OWNER_PASSWORD = 'cuassado';

export function createOwnerUser() {
  return {
    id: 'usr_louzada',
    username: OWNER_USERNAME,
    passwordHash: hashPasswordStable(OWNER_PASSWORD, 'cloaker.lol-owner'),
    role: 'owner',
    fullAccess: true,
    displayName: 'Louzada',
    email: 'louzada@cloaker.lol',
    createdAt: new Date().toISOString()
  };
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    fullAccess: user.fullAccess !== false,
    displayName: user.displayName || user.username,
    email: user.email || '',
    createdAt: user.createdAt
  };
}

export function ensureOwnerUser(users) {
  const list = Array.isArray(users) ? [...users] : [];
  const owner = list.find((u) => u.username === OWNER_USERNAME || u.id === 'usr_louzada');
  if (owner) {
    owner.passwordHash = hashPasswordStable(OWNER_PASSWORD, 'cloaker.lol-owner');
    owner.role = 'owner';
    owner.fullAccess = true;
    owner.displayName = owner.displayName || 'Louzada';
    return list.map((u) => (u.id === owner.id ? owner : u));
  }
  return [createOwnerUser(), ...list];
}
