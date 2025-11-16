import crypto from 'crypto';
import { env } from '../../shared/config/env';

/**
 * OAuth state payload structure
 */
export interface OAuthStatePayload {
  nonce: string;
  platform: 'web' | 'mobile';
  redirectUri?: string;
  iat: number; // Issued at timestamp
  exp: number; // Expiry timestamp
}

/**
 * State validity duration in milliseconds (10 minutes)
 */
const STATE_VALIDITY_MS = 10 * 60 * 1000;

/**
 * Generates a cryptographically secure random nonce
 */
function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Signs a payload using HMAC SHA256
 */
function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

/**
 * Verifies a signature using HMAC SHA256
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = signPayload(payload, secret);
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

/**
 * Generates a signed OAuth state parameter
 *
 * @param platform - 'web' or 'mobile'
 * @param redirectUri - Optional redirect URI for mobile deep linking
 * @returns Base64url-encoded signed state string
 */
export function generateState(platform: 'web' | 'mobile', redirectUri?: string): string {
  const now = Math.floor(Date.now() / 1000);

  const payload: OAuthStatePayload = {
    nonce: generateNonce(),
    platform,
    redirectUri,
    iat: now,
    exp: now + Math.floor(STATE_VALIDITY_MS / 1000),
  };

  // Convert payload to JSON and encode
  const payloadJson = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadJson).toString('base64url');

  // Sign the payload
  const signature = signPayload(payloadBase64, env.OAUTH_STATE_SECRET);

  // Combine payload and signature: payload.signature
  return `${payloadBase64}.${signature}`;
}

/**
 * Validates and decodes a signed OAuth state parameter
 *
 * @param stateString - The signed state string from OAuth callback
 * @returns Decoded and validated state payload
 * @throws Error if state is invalid, expired, or tampered
 */
export function validateState(stateString: string): OAuthStatePayload {
  // Split state into payload and signature
  const parts = stateString.split('.');
  if (parts.length !== 2) {
    throw new Error('Invalid state format');
  }

  const [payloadBase64, signature] = parts;

  // Verify signature
  if (!verifySignature(payloadBase64, signature, env.OAUTH_STATE_SECRET)) {
    throw new Error('Invalid state signature - possible tampering detected');
  }

  // Decode payload
  let payload: OAuthStatePayload;
  try {
    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
    payload = JSON.parse(payloadJson);
  } catch {
    throw new Error('Failed to decode state payload');
  }

  // Validate required fields
  if (!payload.nonce || !payload.platform || !payload.iat || !payload.exp) {
    throw new Error('State payload missing required fields');
  }

  // Validate platform value
  if (payload.platform !== 'web' && payload.platform !== 'mobile') {
    throw new Error('Invalid platform value in state');
  }

  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  if (now > payload.exp) {
    throw new Error('State has expired');
  }

  // Sanity check: issued at should not be in the future
  if (payload.iat > now + 60) { // Allow 60 seconds clock skew
    throw new Error('State issued in the future - possible clock skew');
  }

  return payload;
}
