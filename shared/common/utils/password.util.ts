import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

/**
 * Hashing de passwords sin dependencias externas (scrypt, nativo de Node).
 * Formato almacenado: "<salt-hex>:<hash-hex>".
 */
const KEY_LENGTH = 64;

export function hashPassword(plainPassword: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plainPassword, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(plainPassword: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || !plainPassword) return false;
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;

  const hashBuffer = Buffer.from(hash, 'hex');
  const derivedBuffer = scryptSync(plainPassword, salt, KEY_LENGTH);
  if (hashBuffer.length !== derivedBuffer.length) return false;

  return timingSafeEqual(hashBuffer, derivedBuffer);
}
