import { FastifyRequest } from 'fastify';
import { env } from '../config/env.js';
import { TOKEN_EXPIRY } from '../config/constants.js';
import { createHash } from './crypto.utils.js';

export interface JWTPayload {
  sub: string; // user.id
  githubId: string;
  username: string;
  email?: string;
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
  platform?: 'web' | 'mobile';
  fingerprint?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Generate token fingerprint for additional security
export function generateFingerprint(req: FastifyRequest): string {
  const components = [
    req.headers['user-agent'] || '',
    req.ip || '',
    req.headers['x-platform'] || '',
    req.headers['x-device-id'] || '',
  ].filter(Boolean);

  return createHash(components.join('|'));
}

// Parse token expiry to seconds
export function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid expiry format: ${expiry}`);

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };

  return value * multipliers[unit];
}

// Get secret for token type
export function getSecret(type: 'access' | 'refresh'): string {
  return type === 'access' ? env.JWT_ACCESS_SECRET : env.JWT_REFRESH_SECRET;
}

// Get expiry for token type and platform
export function getExpiry(type: 'access' | 'refresh', platform?: 'web' | 'mobile'): string {
  if (type === 'access') return TOKEN_EXPIRY.ACCESS;
  if (platform === 'web') return TOKEN_EXPIRY.REFRESH;
  return TOKEN_EXPIRY.REMEMBER_ME_REFRESH;
}
