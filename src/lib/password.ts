import { createHash, randomBytes } from 'crypto';

/**
 * Hash a password using SHA-256 with salt
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256')
    .update(password + salt)
    .digest('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const computedHash = createHash('sha256')
    .update(password + salt)
    .digest('hex');
  return computedHash === hash;
}
