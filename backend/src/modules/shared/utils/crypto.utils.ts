import { createHash as cryptoCreateHash, randomBytes } from 'crypto';

/**
 * Create SHA-256 hash of a string
 */
export function createHash(data: string): string {
  return cryptoCreateHash('sha256').update(data).digest('hex');
}

/**
 * Generate a random token
 */
export function generateRandomToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Hash a token for storage (e.g., refresh token)
 */
export function hashToken(token: string): string {
  return createHash(token);
}

/**
 * Verify a token against a hash
 */
export function verifyToken(token: string, hash: string): boolean {
  return hashToken(token) === hash;
}
