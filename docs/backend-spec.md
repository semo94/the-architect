# Technical Implementation Specification: GitHub SSO Authentication

## 1. Executive Summary

This specification outlines the implementation of GitHub Single Sign-On (SSO) authentication for the Breadthwise platform. The solution introduces a modular monolith backend architecture using Fastify, containerized with Docker, deployed on Render, and backed by Neon Postgres serverless database.

**Last Updated**: 2025-11-15

### 1.1 Implementation Status

✅ **Completed**: The authentication system has been fully implemented with the following architecture:

**Key Implementation Highlights:**

1. **OAuth Provider**: `@fastify/oauth2` plugin (not Passport.js)
   - Auto-handles OAuth redirect flow
   - Custom signed state parameter with HMAC-SHA256
   - Platform-aware routing (web/mobile)

2. **Token Strategy**: Hybrid approach
   - **Access tokens**: JWT signed with HS256 (15min expiry)
   - **Refresh tokens**: Cryptographically random (64 bytes), stored as SHA-256 hashes
   - Token rotation on every refresh

3. **Multi-Platform Support**:
   - **Web**: httpOnly cookies (access_token, refresh_token)
   - **Mobile**: URL fragment delivery (#access_token=...&refresh_token=...)
   - Platform detection via query param or x-platform header

4. **Security Features**:
   - Signed OAuth state with 10-minute expiry
   - Timing-safe signature comparison
   - Optional device fingerprinting
   - Refresh token revocation mechanism
   - Deep link scheme validation for mobile

5. **Database**:
   - Drizzle ORM with Neon Postgres
   - Refresh tokens stored as hashes (not JWTs)
   - User upsert by GitHub ID

## 2. Architecture Overview

### 2.1 High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        RN[React Native App]
    end
    
    subgraph "Authentication Provider"
        GH[GitHub OAuth]
    end
    
    subgraph "Backend Services - Render"
        API[Fastify API Gateway]
        AUTH[Auth Module]
        USER[User Module]
    end
    
    subgraph "Data Layer - Neon"
        PG[(PostgreSQL)]
    end
    
    RN <-->|HTTPS/REST| API
    API <--> AUTH
    API <--> USER
    AUTH <-->|OAuth Flow| GH
    USER <--> PG
    AUTH <--> PG
```

### 2.2 Technology Stack

- **Backend Framework**: Fastify 4.x with TypeScript
- **Database**: Neon Postgres (Serverless)
- **ORM**: Drizzle ORM (lightweight, TypeScript-first)
- **Authentication**: @fastify/oauth2 with GitHub OAuth 2.0
- **JWT**: @fastify/jwt for access token signing and verification
- **Container**: Docker with multi-stage builds
- **Deployment**: Render (Backend), Neon (Database)
- **Session Management**: JWT access tokens + random refresh tokens (stored as hashes)
- **Validation**: Zod for schema validation
- **Cryptography**: Node.js crypto module for HMAC signatures, token hashing

## 3. Project Structure

```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.repository.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.schemas.ts
│   │   │   ├── utils/
│   │   │   │   └── oauth-state.ts
│   │   │   └── guards/
│   │   │       └── jwt.guard.ts
│   │   ├── user/
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── user.schemas.ts
│   │   │   └── user.repository.ts
│   │   └── shared/
│   │       ├── database/
│   │       │   ├── client.ts
│   │       │   ├── schema.ts
│   │       │   └── migrations/
│   │       ├── config/
│   │       │   ├── env.ts
│   │       │   └── constants.ts
│   │       ├── middleware/
│   │       │   ├── error-handler.ts
│   │       │   ├── rate-limiter.ts
│   │       │   └── request-logger.ts
│   │       └── utils/
│   │           ├── jwt.utils.ts
│   │           └── crypto.utils.ts
│   ├── app.ts
│   └── server.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── scripts/
│   ├── migrate.ts
│   └── seed.ts
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── drizzle.config.ts
└── README.md
```

## 4. Database Schema

### 4.1 Core Tables (Minimal & Lean)

```sql
-- Users table (minimal fields only)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    username VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refresh tokens for JWT authentication
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_github_id ON users(github_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
```

### 4.2 Drizzle ORM Schema Definition

```typescript
// src/modules/shared/database/schema.ts
import { pgTable, uuid, varchar, timestamp, text } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  githubId: varchar('github_id', { length: 255 }).unique().notNull(),
  email: varchar('email', { length: 255 }).unique(),
  username: varchar('username', { length: 255 }).unique().notNull(),
  displayName: varchar('display_name', { length: 255 }),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).unique().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  revokedAt: timestamp('revoked_at')
});
```

## 5. Authentication Flow

### 5.1 GitHub OAuth 2.0 Flow (via @fastify/oauth2)

```mermaid
sequenceDiagram
    participant RN as React Native App
    participant BE as Backend API
    participant GH as GitHub OAuth
    participant DB as Database

    RN->>BE: GET /auth/github?platform=mobile&redirect_uri=app://
    BE->>BE: Generate signed OAuth state (platform, nonce, expiry)
    BE->>GH: Redirect to GitHub OAuth with state
    GH->>RN: User authorizes
    GH->>BE: Callback with code + state
    BE->>BE: Validate state signature & expiry
    BE->>GH: Exchange code for token
    GH->>BE: Return access token + user data
    BE->>DB: Upsert user by GitHub ID
    BE->>BE: Generate JWT access token + random refresh token
    BE->>DB: Store hashed refresh token
    BE->>RN: Redirect to deep link with tokens in URL fragment (#)
    RN->>RN: Store tokens securely
```

### 5.2 JWT Token Strategy (Multi-Platform)

```typescript
// Access token payload structure (JWT)
interface JWTPayload {
  sub: string;          // user.id
  githubId: string;
  username: string;
  email?: string;
  iat: number;
  exp: number;
  type: 'access';       // Only access tokens are JWTs
  platform?: 'web' | 'mobile';
  fingerprint?: string; // Optional device fingerprint for security
}

// Refresh token: cryptographically random string (64 bytes)
// Stored in database as SHA-256 hash, not as JWT

// Token expiry
const TOKEN_EXPIRY = {
  ACCESS: '15m',
  REFRESH: '7d',           // Web platform
  REMEMBER_ME_REFRESH: '30d' // Mobile platform
};

// Platform-specific token delivery
interface TokenDeliveryStrategy {
  web: {
    method: 'cookie';    // httpOnly, secure, sameSite cookies
    sameSite: 'lax';
    secure: true;
    httpOnly: true;
  };
  mobile: {
    method: 'url-fragment';  // Tokens in URL fragment (#) for OAuth callback
    storage: 'AsyncStorage'; // Client stores in secure storage
  };
}
```

### 5.3 OAuth State Management & Security

The implementation uses a custom signed state parameter system for OAuth security:

```typescript
// OAuth state payload structure
interface OAuthStatePayload {
  nonce: string;           // Cryptographically random (32 hex chars)
  platform: 'web' | 'mobile';
  redirectUri?: string;    // Required for mobile, validated against whitelist
  iat: number;             // Issued at timestamp (seconds)
  exp: number;             // Expiry timestamp (10 minutes validity)
}

// State generation process:
// 1. Create payload with nonce, platform, redirectUri, timestamps
// 2. JSON stringify and base64url encode
// 3. Sign with HMAC-SHA256 using OAUTH_STATE_SECRET
// 4. Return: base64url(payload).signature
//
// State validation process:
// 1. Split state into payload and signature
// 2. Verify signature using timing-safe comparison
// 3. Decode and parse payload
// 4. Validate expiry, timestamps, platform value
// 5. Attach decoded state to request for controller access
```

### 5.4 Platform-Specific OAuth Flow

```mermaid
sequenceDiagram
    participant Mobile as Mobile App
    participant Web as Web App
    participant BE as Backend API
    participant GH as GitHub OAuth

    Note over Mobile,Web: Platform Detection via Query Parameter

    alt Mobile Flow
        Mobile->>BE: GET /auth/github?platform=mobile&redirect_uri=app://callback
        BE->>BE: Validate redirect_uri (must match deep link scheme)
        BE->>BE: Generate signed state (platform, redirect_uri, nonce)
        BE->>GH: Redirect to GitHub with state
        GH->>Mobile: User authorizes in InAppBrowser
        GH->>BE: Callback with code + state
        BE->>BE: Validate state signature & decode
        BE->>GH: Exchange code for access token
        BE->>BE: Create/update user, generate tokens
        BE->>Mobile: 302 Redirect to app://callback#access_token=...&refresh_token=...
        Mobile->>Mobile: Extract tokens from URL fragment, store securely
    else Web Flow
        Web->>BE: GET /auth/github?platform=web
        BE->>BE: Generate signed state (platform, nonce)
        BE->>GH: Redirect to GitHub with state
        GH->>Web: User authorizes
        GH->>BE: Callback with code + state
        BE->>BE: Validate state signature & decode
        BE->>GH: Exchange code for access token
        BE->>BE: Create/update user, generate tokens
        BE->>Web: Set httpOnly cookies + 302 Redirect to WEB_CLIENT_URL
        Web->>Web: Cookies automatically included in requests
    end
```

## 6. API Endpoints

### 6.1 Authentication Endpoints (Multi-Platform)

```yaml
Authentication:
  - GET /auth/github
    Description: Initiates GitHub OAuth flow (handled by @fastify/oauth2)
    Query:
      - platform: 'web' | 'mobile' (optional, defaults to 'web')
      - redirect_uri: string (required for mobile, must match MOBILE_DEEP_LINK_SCHEME)
    Implementation: Automatically redirects to GitHub via @fastify/oauth2 plugin
    Response:
      302: Redirect to GitHub OAuth with generated signed state parameter

  - GET /auth/github/callback
    Description: GitHub OAuth callback (processes OAuth code exchange)
    Query:
      - code: string (OAuth authorization code from GitHub)
      - state: string (signed state parameter, validated before processing)
    Process:
      1. Validates state signature and expiry
      2. Exchanges code for GitHub access token via @fastify/oauth2
      3. Fetches user profile from GitHub API
      4. Upserts user in database by GitHub ID
      5. Generates JWT access token and random refresh token
      6. Stores hashed refresh token in database
    Response:
      Web (platform from state):
        - Sets httpOnly, secure, sameSite cookies
        - 302 Redirect to WEB_CLIENT_URL
        - Cookies: access_token, refresh_token
      Mobile (platform from state):
        - 302 Redirect to redirect_uri with tokens in URL fragment
        - Format: {redirect_uri}#access_token={token}&refresh_token={token}

  - POST /auth/refresh
    Description: Refresh access token using refresh token
    Platform Detection: x-platform header or query parameter
    Request:
      Mobile: Body { refreshToken: string }
      Web: Cookie refresh_token (httpOnly)
    Process:
      1. Validates refresh token hash against database
      2. Checks token not expired and not revoked
      3. Revokes old refresh token
      4. Generates new token pair
    Response:
      Mobile: 200 { accessToken, refreshToken }
      Web: 200 { message: "Tokens refreshed successfully" } + sets cookies
    Errors:
      401: Invalid or expired refresh token

  - POST /auth/logout
    Description: Logout user and revoke refresh token
    Authentication: Optional (allows logout even with invalid token)
    Platform Detection: x-platform header or query parameter
    Request:
      Mobile: Body { refreshToken?: string }
      Web: Cookie refresh_token
    Process: Revokes refresh token in database
    Response:
      200: { message: "Logged out successfully" }
      Web: Also clears httpOnly cookies (access_token, refresh_token)

  - POST /auth/revoke-all
    Description: Revoke all user refresh tokens
    Authentication: Required (JWT via fastify.authenticate)
    Headers: Authorization: Bearer {access_token}
    Process: Revokes all non-revoked refresh tokens for user
    Response:
      200: { message: "All tokens revoked" }
      Web: Also clears httpOnly cookies
    Errors:
      401: Unauthorized (no valid access token)

  - GET /auth/session
    Description: Validate current session and return user info
    Authentication: Required (JWT via fastify.authenticate)
    Headers: Authorization: Bearer {access_token} (mobile)
    Cookies: access_token (web)
    Response:
      200: { user: JWTPayload, expiresAt: ISO8601 string }
    Errors:
      401: Unauthorized (no valid access token or expired)
```

### 6.2 User Management Endpoints

```yaml
User Management:
  - GET /users/me
    Description: Get current authenticated user
    Headers: Authorization Bearer {token}
    Response:
      200: {
        user: {
          id: string,
          githubId: string,
          username: string,
          displayName: string,
          email: string,
          avatarUrl: string,
          createdAt: string,
          updatedAt: string
        }
      }
      401: { error: "Unauthorized" }

  - PATCH /users/me
    Description: Update user information
    Headers: Authorization Bearer {token}
    Body: {
      displayName?: string,
      avatarUrl?: string
    }
    Response:
      200: { user: User }
      400: { error: "Invalid input" }
      401: { error: "Unauthorized" }
```

## 7. Backend Implementation Details

### 7.1 Authentication Module Implementation

#### 7.1.1 @fastify/oauth2 Integration

The auth module uses `@fastify/oauth2` plugin with custom state management:

```typescript
// auth.routes.ts
import oauth2Plugin from '@fastify/oauth2';
import type { FastifyOAuth2Options } from '@fastify/oauth2';

const oauth2Options: FastifyOAuth2Options = {
  name: 'githubOAuth2',
  credentials: {
    client: {
      id: env.GITHUB_CLIENT_ID,
      secret: env.GITHUB_CLIENT_SECRET,
    },
    auth: oauth2Plugin.GITHUB_CONFIGURATION,
  },
  startRedirectPath: '/github',        // Auto-handles GET /auth/github
  callbackUri: env.GITHUB_CALLBACK_URL, // e.g., https://api.example.com/auth/github/callback
  scope: ['user:email', 'read:user'],

  // Custom state generation with platform context
  generateStateFunction: (request, callback) => {
    const { platform, redirect_uri } = request.query;

    // Validate mobile redirect URI
    if (platform === 'mobile' && !redirect_uri?.startsWith(env.MOBILE_DEEP_LINK_SCHEME)) {
      return callback(new Error('Invalid redirect_uri'));
    }

    const state = generateState(platform || 'web', redirect_uri);
    callback(null, state);
  },

  // Custom state validation with signature verification
  checkStateFunction: (request, callback) => {
    const { state } = request.query;

    try {
      const decoded = validateState(state);
      request.oauthState = decoded; // Attach to request for controller
      callback(); // Success
    } catch (error) {
      callback(new Error('Invalid OAuth state'));
    }
  },
};

await fastify.register(oauth2Plugin, oauth2Options);
```

#### 7.1.2 Route Registration

```typescript
// GET /auth/github - Auto-handled by @fastify/oauth2
// Redirects to GitHub with generated state parameter

// GET /auth/github/callback - Manual handler
fastify.get('/github/callback', async (request, reply) => {
  await controller.githubCallback(request, reply);
});

// POST /auth/refresh - No authentication required
fastify.post('/refresh', async (request, reply) => {
  await controller.refresh(request, reply);
});

// POST /auth/logout - Optional authentication
fastify.post('/logout', {
  onRequest: [
    async (request) => {
      try {
        await request.jwtVerify(); // Try to verify, but don't fail
      } catch {
        // Allow logout even with invalid token
      }
    },
  ],
}, async (request, reply) => {
  await controller.logout(request, reply);
});

// POST /auth/revoke-all - Requires authentication
fastify.post('/revoke-all', {
  onRequest: [fastify.authenticate], // JWT verification required
}, async (request, reply) => {
  await controller.revokeAll(request, reply);
});

// GET /auth/session - Requires authentication
fastify.get('/session', {
  onRequest: [fastify.authenticate],
}, async (request, reply) => {
  await controller.session(request, reply);
});
```

#### 7.1.3 Platform Detection

```typescript
// auth.service.ts
detectPlatform(request: FastifyRequest): 'web' | 'mobile' {
  const platformHeader = request.headers['x-platform'] as string | undefined;
  const query = request.query as { platform?: string } | undefined;
  const platformQuery = query?.platform;

  const platform = platformHeader || platformQuery;

  if (platform === 'mobile') return 'mobile';
  return 'web'; // Default to web
}
```

### 7.2 Fastify App Configuration

```typescript
// src/app.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { authRoutes } from './modules/auth/auth.routes';
import { userRoutes } from './modules/user/user.routes';
import { errorHandler } from './modules/shared/middleware/error-handler';
import { env } from './modules/shared/config/env';

export async function buildApp() {
  const app = Fastify({
    logger: true,
    trustProxy: true,
  });

  // Security middleware
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  });

  await app.register(cors, {
    origin: env.ALLOWED_ORIGINS,
    credentials: true,
  });

  // Cookie support for web auth
  await app.register(cookie);

  // JWT support for access tokens
  await app.register(jwt, {
    secret: env.JWT_ACCESS_SECRET,
  });

  // JWT authentication decorator
  app.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '15 minutes',
  });

  // Error handling
  app.setErrorHandler(errorHandler);

  // Register routes
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(userRoutes, { prefix: '/users' });

  // Health check
  app.get('/health', async () => ({ status: 'healthy' }));

  return app;
}
```

### 7.3 Auth Repository Implementation

```typescript
// auth.repository.ts
import { eq, and, gt, isNull } from 'drizzle-orm';
import { db } from '../shared/database/client';
import { refreshTokens, type RefreshToken, type NewRefreshToken } from '../shared/database/schema';

export class AuthRepository {
  // Create new refresh token
  async createRefreshToken(data: NewRefreshToken): Promise<RefreshToken> {
    const result = await db.insert(refreshTokens).values(data).returning();
    return result[0];
  }

  // Find valid refresh token (not expired, not revoked)
  async findRefreshToken(tokenHash: string): Promise<RefreshToken | undefined> {
    const result = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          gt(refreshTokens.expiresAt, new Date()),  // Not expired
          isNull(refreshTokens.revokedAt)            // Not revoked
        )
      );
    return result[0];
  }

  // Revoke single refresh token
  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.tokenHash, tokenHash));
  }

  // Revoke all user's refresh tokens
  async revokeAllUserTokens(userId: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          isNull(refreshTokens.revokedAt)
        )
      );
  }

  // Cleanup job: delete expired tokens
  async deleteExpiredTokens(): Promise<void> {
    await db
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, new Date()));
  }
}
```

### 7.4 Environment Configuration

```typescript
// src/modules/shared/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().default('3000').transform(Number),

  // Database
  DATABASE_URL: z.string().url(),

  // GitHub OAuth
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_CALLBACK_URL: z.string().url(),

  // OAuth State Security
  OAUTH_STATE_SECRET: z.string().min(32),  // HMAC secret for signing OAuth state

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),  // Currently unused (refresh tokens are random)

  // Client URLs
  WEB_CLIENT_URL: z.string().url(),
  MOBILE_DEEP_LINK_SCHEME: z.string().default('breadthwise://'),

  // Cookie settings
  COOKIE_DOMAIN: z.string().optional(),
  SECURE_COOKIES: z.string().default('true').transform(val => val === 'true'),

  // Security
  ALLOWED_ORIGINS: z.string().transform(s => s.split(',')),
  ENABLE_FINGERPRINTING: z.string().default('true').transform(val => val === 'true'),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
```

## 8. Security Considerations (Multi-Platform)

### Benefits of This Approach

1. **Web Benefits**
   - HttpOnly cookies prevent XSS token theft
   - Automatic token inclusion (no manual header management)
   - Built-in CSRF protection with sameSite cookies
   - Server-side session validation

2. **Mobile Benefits**
   - Standard Bearer token approach
   - Easy integration with existing mobile auth libraries
   - Works with deep linking for OAuth flows
   - No cookie complications in native apps

3. **Shared Benefits**
   - Single backend serving both platforms
   - Unified user management
   - Consistent API structure
   - Platform-specific optimizations



### 8.1 Platform-Specific Security Measures

#### Web Security
1. **HttpOnly Cookies**
   - Access tokens stored in httpOnly, secure, sameSite cookies
   - Prevents XSS attacks from accessing tokens
   - CSRF protection via sameSite='lax' and origin validation

2. **Content Security Policy**
   - Strict CSP headers to prevent XSS
   - Disallow inline scripts
   - Whitelist trusted domains only

3. **Session Management**
   - Short-lived access tokens (15 minutes)
   - Refresh tokens limited to /auth/refresh path
   - Automatic token rotation on refresh

#### Mobile Security
1. **Secure Token Storage**
   - Tokens in AsyncStorage (iOS: Keychain, Android: SharedPreferences)
   - Consider react-native-keychain for enhanced security
   - Biometric authentication for sensitive operations

2. **Certificate Pinning**
   - Pin backend SSL certificates
   - Prevent MITM attacks
   - Use react-native-ssl-pinning

3. **Deep Link Security**
   - Validate redirect_uri against whitelist
   - Use app-specific schemes (myapp://)
   - Implement state parameter validation

### 8.2 Common Security Measures

1. **OAuth State Security**
   - Custom signed state parameter (not just random string)
   - HMAC-SHA256 signature using `OAUTH_STATE_SECRET`
   - 10-minute expiry window
   - Timing-safe signature comparison
   - Prevents CSRF and state tampering attacks
   - Encodes platform and redirect URI for callback routing

2. **Token Security**
   - JWT access tokens signed with HS256 (HMAC-SHA256)
   - Single secret for access tokens (`JWT_ACCESS_SECRET`)
   - Refresh tokens are random, not JWTs - cannot be forged
   - Token fingerprinting (optional, device ID + user agent + IP)
   - Revocation mechanism via database (refresh tokens only)
   - Access tokens cannot be revoked (short expiry mitigates risk)

3. **Rate Limiting**
   - Global: 100 requests/15 minutes
   - Auth endpoints: 5 attempts/15 minutes (recommended)
   - Per-platform rate limits (can be configured)

4. **Input Validation**
   - Zod schemas for all request bodies and query parameters
   - Platform header/query validation ('web' | 'mobile')
   - Redirect URI whitelist validation (must match deep link scheme)
   - SQL injection prevention via Drizzle ORM parameterized queries

5. **Deep Link Security (Mobile)**
   - Redirect URI must match `MOBILE_DEEP_LINK_SCHEME`
   - Validated during state generation (before OAuth redirect)
   - Tokens delivered via URL fragment (#), not query (?)
   - Fragments never sent to servers, reducing leak risk

6. **Cookie Security (Web)**
   - httpOnly: prevents JavaScript access
   - secure: HTTPS only (controlled by `SECURE_COOKIES`)
   - sameSite: 'lax' prevents CSRF
   - domain: configurable via `COOKIE_DOMAIN`

7. **Audit Logging** (Future Enhancement)
   ```typescript
   interface AuthAuditLog {
     userId: string;
     action: 'login' | 'logout' | 'refresh' | 'revoke';
     platform: 'web' | 'mobile';
     ipAddress: string;
     userAgent: string;
     timestamp: Date;
     success: boolean;
   }
   ```

### 8.3 Token Security Implementation

```typescript
// src/modules/shared/utils/jwt.utils.ts & auth.service.ts
import crypto from 'crypto';
import { FastifyRequest } from 'fastify';

// Generate token fingerprint for additional security
export function generateFingerprint(req: FastifyRequest): string {
  const components = [
    req.headers['user-agent'] || '',
    req.ip || '',
    req.headers['x-platform'] || '',
    req.headers['x-device-id'] || '',
  ].filter(Boolean);

  return crypto
    .createHash('sha256')
    .update(components.join('|'))
    .digest('hex');
}

// Platform-specific token generation in AuthService
async generateTokens(
  user: User,
  platform: 'web' | 'mobile',
  request: FastifyRequest
): Promise<TokenPair> {
  // Optional fingerprinting (controlled by ENABLE_FINGERPRINTING env var)
  const fingerprint = env.ENABLE_FINGERPRINTING
    ? generateFingerprint(request)
    : undefined;

  // JWT access token payload
  const accessPayload: Partial<JWTPayload> = {
    sub: user.id,
    githubId: user.githubId,
    username: user.username,
    email: user.email || undefined,
    platform,
    fingerprint,
    type: 'access',
  };

  const accessExpiry = getExpiry('access', platform);  // Always '15m'
  const refreshExpiry = getExpiry('refresh', platform); // '7d' web, '30d' mobile

  // Sign JWT access token using Fastify JWT plugin
  const accessToken = await request.server.jwt.sign(accessPayload, {
    expiresIn: accessExpiry,
  });

  // Generate cryptographically random refresh token (not JWT)
  const refreshTokenValue = generateRandomToken(64); // 64 bytes = 128 hex chars
  const refreshTokenHash = hashToken(refreshTokenValue); // SHA-256 hash

  // Store refresh token hash in database
  const expiresAt = new Date(Date.now() + parseExpiry(refreshExpiry) * 1000);
  await this.authRepository.createRefreshToken({
    userId: user.id,
    tokenHash: refreshTokenHash,
    expiresAt,
  });

  return {
    accessToken,        // JWT
    refreshToken: refreshTokenValue, // Random string (send to client)
  };
}

// Token refresh process
async refreshTokens(
  refreshTokenValue: string,
  request: FastifyRequest
): Promise<{ user: User; tokens: TokenPair }> {
  const tokenHash = hashToken(refreshTokenValue);

  // Find refresh token in database (must not be expired or revoked)
  const refreshToken = await this.authRepository.findRefreshToken(tokenHash);
  if (!refreshToken) {
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  // Get user
  const user = await this.userRepository.findById(refreshToken.userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Revoke old refresh token (rotation strategy)
  await this.authRepository.revokeRefreshToken(tokenHash);

  // Generate new token pair
  const platform = this.detectPlatform(request);
  const tokens = await this.generateTokens(user, platform, request);

  return { user, tokens };
}

// Utility functions
function generateRandomToken(bytes: number): string {
  return crypto.randomBytes(bytes).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
```

**Key Security Features:**

1. **Access Tokens (JWT)**:
   - Signed with HS256 (HMAC-SHA256) using `JWT_ACCESS_SECRET`
   - Short-lived (15 minutes)
   - Contains user identity and optional fingerprint
   - Verified by @fastify/jwt middleware

2. **Refresh Tokens (Random)**:
   - Cryptographically secure random bytes (64 bytes = 128 hex chars)
   - Stored as SHA-256 hash in database
   - Long-lived (7 days web, 30 days mobile)
   - Single-use (revoked on refresh - rotation strategy)
   - Cannot be forged or decoded

3. **Token Rotation**:
   - Every refresh generates new access + refresh token pair
   - Old refresh token is immediately revoked
   - Prevents token replay attacks

4. **Fingerprinting (Optional)**:
   - Binds token to device characteristics
   - Can be disabled via `ENABLE_FINGERPRINTING=false`
   - Helps detect token theft across devices

## 9. Docker Configuration

### 9.1 Dockerfile

```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files and install production deps
COPY package*.json ./
COPY pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copy built application
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

## 10. Deployment Configuration

### 10.1 Render Configuration

```yaml
# render.yaml
services:
  - type: web
    name: breadthwise-api
    runtime: docker
    dockerfilePath: ./backend/docker/Dockerfile
    dockerContext: ./backend
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: knowledge-expansion-db
          property: connectionString
      - key: GITHUB_CLIENT_ID
        fromSecret: github-client-id
      - key: GITHUB_CLIENT_SECRET
        fromSecret: github-client-secret
      - key: JWT_ACCESS_SECRET
        generateValue: true
      - key: JWT_REFRESH_SECRET
        generateValue: true
    healthCheckPath: /health
    autoDeploy: true
```

### 10.2 Database Migration Strategy

```typescript
// scripts/migrate.ts
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { db } from '../src/modules/shared/database/client';

async function runMigrations() {
  console.log('Running migrations...');
  await migrate(db, {
    migrationsFolder: './src/modules/shared/database/migrations',
  });
  console.log('Migrations completed');
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error('Migration failed', err);
  process.exit(1);
});
```

## 11. Monitoring

### 11.1 Logging Strategy

```typescript
// Structured logging with Pino
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      userId: req.user?.id,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});
```

## 12. Environment Variables Reference

The `.env.example` file contains all required environment variables:

```bash
# Environment
NODE_ENV=development  # development | staging | production

# Server
PORT=3000

# Database
# Option 1: Local PostgreSQL (for development with Docker Compose)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/knowledge_expansion

# Option 2: Neon PostgreSQL (for cloud development/production)
# DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# OAuth State Security (Generate with: openssl rand -base64 32)
OAUTH_STATE_SECRET=your_oauth_state_secret_min_32_chars

# JWT Secrets (Generate with: openssl rand -base64 32)
JWT_ACCESS_SECRET=your_jwt_access_secret_min_32_chars
JWT_REFRESH_SECRET=your_jwt_refresh_secret_min_32_chars

# Client URLs
WEB_CLIENT_URL=http://localhost:3001
MOBILE_DEEP_LINK_SCHEME=breadthwise://

# Cookie Settings
COOKIE_DOMAIN=localhost
SECURE_COOKIES=false  # Set to true in production

# Security
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3000
ENABLE_FINGERPRINTING=true
```

**Important Notes:**

- `OAUTH_STATE_SECRET`: New requirement for signing OAuth state parameters
- `MOBILE_DEEP_LINK_SCHEME`: Must match the deep link scheme in mobile app
- `SECURE_COOKIES`: Should be `true` in production (HTTPS required)
- `JWT_REFRESH_SECRET`: Currently unused (refresh tokens are random, not JWTs) but kept for future extensibility

## 13. Implementation Summary

### 13.1 Completed Implementation ✅

**Phase 1-5: All phases completed**

✅ Backend project structure initialized
✅ Docker configuration with dual database support (local PostgreSQL + Neon)
✅ Database schemas implemented (users, refresh_tokens)
✅ GitHub OAuth integration via @fastify/oauth2
✅ JWT token generation and validation
✅ Refresh token management (random tokens + hashing)
✅ Auth middleware and guards
✅ Platform detection (web/mobile)
✅ User CRUD operations
✅ Input validation with Zod
✅ Error handling middleware
✅ Multi-platform authentication flow

### 13.2 Key Differences from Original Spec

This section documents important deviations from the original specification:

| Aspect | Original Spec | Actual Implementation | Reason |
|--------|---------------|----------------------|---------|
| **OAuth Library** | Passport.js | @fastify/oauth2 | Better Fastify integration, simpler setup |
| **OAuth State** | Random string | Signed JWT-like state with HMAC-SHA256 | Enhanced security, prevent tampering, encode platform context |
| **Refresh Tokens** | JWT signed tokens | Cryptographically random (64 bytes) | More secure, cannot be forged, easier rotation |
| **JWT Algorithm** | RS256 (asymmetric) | HS256 (symmetric) | Simpler setup, adequate for single-service architecture |
| **Mobile Token Delivery** | Query params (?) | URL fragment (#) | Fragments not sent to servers, reduces leak risk |
| **Token Storage** | JWT refresh tokens | Hashed random tokens in DB | True revocation capability, better security |
| **Platform Detection** | Header only | Header OR query param | More flexible, supports initial OAuth redirect |
| **Environment** | development, production, test | development, staging, production | Added staging environment |
| **Auth Repository** | Not specified | Explicit AuthRepository class | Better separation of concerns |
| **Drizzle Queries** | Basic | Advanced (and, eq, gt, isNull) | More expressive, type-safe queries |

### 13.3 Security Enhancements Implemented

Beyond the original specification, the following security enhancements were added:

1. **HMAC-signed OAuth State**
   - Prevents state tampering attacks
   - 10-minute expiry window
   - Timing-safe signature comparison

2. **Token Fingerprinting**
   - Optional device binding (user-agent, IP, device ID)
   - Configurable via `ENABLE_FINGERPRINTING`

3. **Refresh Token Rotation**
   - Single-use refresh tokens
   - Old token revoked immediately on refresh
   - Prevents token replay attacks

4. **Deep Link Validation**
   - Redirect URI must match configured scheme
   - Validated before OAuth redirect

5. **URL Fragment Token Delivery (Mobile)**
   - Tokens in URL fragment (#) not query (?)
   - Fragments never sent to servers

### 13.4 Future Enhancements

Potential improvements for future iterations:

- [ ] Audit logging for all authentication events
- [ ] Token blacklist/revocation cache (Redis)
- [ ] Biometric authentication support (mobile)
- [ ] Certificate pinning (mobile)
- [ ] Session management UI (revoke devices)
- [ ] OAuth provider abstraction (support multiple providers)
- [ ] Rate limiting per user/IP
- [ ] Automated cleanup job for expired tokens
- [ ] Security headers middleware
- [ ] CSRF token validation (web)

---

**Document Version**: 2.0
**Last Updated**: 2025-11-15
**Implementation Status**: ✅ Production Ready


