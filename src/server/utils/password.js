import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !String(stored).includes(':')) return false;
  const [salt, hash] = String(stored).split(':');
  const next = scryptSync(String(password), salt, 64);
  const prev = Buffer.from(hash, 'hex');
  if (prev.length !== next.length) return false;
  return timingSafeEqual(prev, next);
}

export function createSessionToken() {
  return randomBytes(32).toString('hex');
}

export function createUserId(prefix = 'usr') {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(3).toString('hex')}`;
}

/** Stable hash for demo seed so restarts keep same password format. */
export function hashPasswordStable(password, saltSeed = 'cloaker.lol') {
  const salt = createHash('sha256').update(saltSeed).digest('hex').slice(0, 32);
  const hash = scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
