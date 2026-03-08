# Technical Implementation Specification: GitHub SSO Authentication

## 1. Executive Summary

This specification outlines the implementation of GitHub Single Sign-On (SSO) authentication for the Breadthwise platform. The solution uses a modular monolith backend architecture using Fastify, containerized with Docker, deployed on Render, and backed by Neon Postgres serverless database.

**Last Updated**: 2026-03-07

### 1.1 Implementation Status

The authentication system has been fully implemented with the following architecture:

**Key Implementation Highlights:**

1. **OAuth Provider**: `@fastify/oauth2` plugin
   - Auto-handles OAuth redirect flow
   - Custom signed state parameter with HMAC-SHA256
   - Platform-aware routing (web/mobile)

2. **Token Strategy**: Hybrid approach
   - **Access tokens**: JWT signed with HS256 (15min expiry)
   - **Refresh tokens**: Cryptographically random (64 bytes), stored as SHA-256 hashes
   - Token rotation on every refresh

3. **Multi-Platform Support**:
   - **Web**: httpOnly cookies (`access_token`, `refresh_token`)
   - **Mobile**: URL fragment delivery (`#access_token=...&refresh_token=...`)
   - Platform detection via query param or `x-platform` header

4. **Security Features**:
   - Signed OAuth state with 10-minute expiry
   - Timing-safe signature comparison
   - Optional device fingerprinting
   - Refresh token revocation mechanism
   - Deep link scheme validation for mobile

5. **Database**:
   - Drizzle ORM with Neon Postgres
   - Refresh tokens stored as SHA-256 hashes (not JWTs)
   - User upsert by GitHub ID

## 2. Architecture Overview

### 2.1 High-Level Architecture

```
Client Layer              Authentication Provider       Backend Services (Render)       Data Layer (Neon)
--------------            -------------------------     ----------------------------    ------------------
React Native App  <--->   GitHub OAuth            <---> Fastify API Gateway       <---> PostgreSQL
                                                        - Auth Module
                                                        - User Module
```

### 2.2 Technology Stack

| Category | Technology | Version |
|----------|-----------|---------|
| **Backend Framework** | Fastify | 5.6.2 |
| **Language** | TypeScript | 5.9.3 |
| **Database** | Neon Postgres (Serverless) | - |
| **ORM** | Drizzle ORM | 0.44.7 |
| **OAuth** | @fastify/oauth2 | 8.1.2 |
| **JWT** | @fastify/jwt | 10.0.0 |
| **Cookies** | @fastify/cookie | 11.0.2 |
| **CORS** | @fastify/cors | 11.1.0 |
| **Security Headers** | @fastify/helmet | 13.0.2 |
| **Rate Limiting** | @fastify/rate-limit | 10.3.0 |
| **Validation** | Zod | 4.1.12 |
| **Logging** | Pino | 10.1.0 |
| **DB Driver (cloud)** | @neondatabase/serverless | 1.0.2 |
| **DB Driver (local)** | postgres | 3.4.7 |
| **Runtime** | Node.js | >= 20.0.0 |
| **Container** | Docker (node:22-alpine) | - |

## 3. Project Structure

```
backend/
├── src/
│   ├── server.ts                          # Server entry point + graceful shutdown
│   ├── app.ts                             # Fastify app setup + plugin registration
│   └── modules/
│       ├── auth/
│       │   ├── auth.controller.ts         # HTTP handlers (callback, refresh, logout, session)
│       │   ├── auth.service.ts            # Business logic (tokens, cookies, platform detection)
│       │   ├── auth.repository.ts         # Refresh token DB operations
│       │   ├── auth.routes.ts             # Route definitions + OAuth2 plugin registration
│       │   ├── auth.schemas.ts            # Zod validation schemas
│       │   ├── guards/
│       │   │   └── jwt.guard.ts           # JWT verification middleware
│       │   └── utils/
│       │       └── oauth-state.ts         # HMAC-SHA256 state signing/validation
│       ├── user/
│       │   ├── user.controller.ts         # HTTP handlers (get/update user)
│       │   ├── user.service.ts            # User business logic + sanitization
│       │   ├── user.routes.ts             # Route definitions (all require auth)
│       │   ├── user.repository.ts         # User DB operations (CRUD + upsert)
│       │   └── user.schemas.ts            # Zod validation schemas
│       └── shared/
│           ├── config/
│           │   ├── env.ts                 # Zod environment validation
│           │   └── constants.ts           # Token expiry, rate limits, platform constants
│           ├── database/
│           │   ├── schema.ts              # Drizzle table definitions + type exports
│           │   ├── client.ts              # Auto-detecting DB connection (Neon vs local)
│           │   └── migrations/            # Drizzle migration files
│           ├── middleware/
│           │   ├── error-handler.ts       # AppError class + global error handler
│           │   └── request-logger.ts      # Request logging hook
│           └── utils/
│               ├── jwt.utils.ts           # JWT payload types, fingerprint, expiry helpers
│               └── crypto.utils.ts        # SHA-256 hashing, random token generation
├── scripts/
│   ├── migrate.ts                         # Database migration runner
│   ├── seed.ts                            # Database seeding
│   └── start.sh                           # Docker entrypoint (migrations + server)
├── docker/
│   ├── Dockerfile                         # Multi-stage production build
│   └── docker-compose.yml                 # Local dev with PostgreSQL
├── package.json
├── tsconfig.json
├── drizzle.config.ts
└── .env.example
```

## 4. Database Schema

### 4.1 Core Tables

```sql
-- Users table
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

-- Indexes
CREATE INDEX idx_users_github_id ON users(github_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
```

### 4.2 Drizzle ORM Schema

```typescript
// src/modules/shared/database/schema.ts
import { pgTable, uuid, varchar, timestamp, text, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  githubId: varchar('github_id', { length: 255 }).unique().notNull(),
  email: varchar('email', { length: 255 }).unique(),
  username: varchar('username', { length: 255 }).unique().notNull(),
  displayName: varchar('display_name', { length: 255 }),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  githubIdIdx: index('idx_users_github_id').on(table.githubId),
  emailIdx: index('idx_users_email').on(table.email),
}));

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).unique().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  revokedAt: timestamp('revoked_at'),
}, (table) => ({
  userIdIdx: index('idx_refresh_tokens_user_id').on(table.userId),
  tokenHashIdx: index('idx_refresh_tokens_token_hash').on(table.tokenHash),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
```

### 4.3 Database Client

```typescript
// src/modules/shared/database/client.ts
// Auto-detects Neon (cloud) vs postgres (local) based on DATABASE_URL
const isNeon = env.DATABASE_URL.includes('neon.tech') || env.DATABASE_URL.includes('?sslmode=require');

export const db = isNeon
  ? drizzleNeon(neon(env.DATABASE_URL), { schema })
  : drizzlePostgres(postgres(env.DATABASE_URL), { schema });
```

## 5. Authentication Flow

### 5.1 GitHub OAuth 2.0 Flow (via @fastify/oauth2)

```
React Native App         Backend API              GitHub OAuth          Database
-----------------        -----------              ------------          --------
GET /auth/github -------> Generate signed state
  ?platform=mobile        (platform, nonce, exp)
  &redirect_uri=app://                -----------> Redirect to GitHub
                                                   User authorizes
                          <----------- Callback with code + state
                          Validate state signature
                          Exchange code for token ----------->
                          <----------- Access token + user data
                          Upsert user ---------------------------------> DB
                          Generate JWT + refresh token ----------------> Store hash
                          Redirect to deep link
<------------- breadthwise://auth/callback#access_token=...&refresh_token=...
Store tokens securely
```

### 5.2 JWT Token Strategy

**Access Token (JWT)**:
```typescript
// Payload structure (from jwt.utils.ts)
interface JWTPayload {
  sub: string;          // user.id (UUID)
  githubId: string;
  username: string;
  email?: string;
  iat: number;
  exp: number;
  platform?: 'web' | 'mobile';
  fingerprint?: string; // Optional device fingerprint
}
```

**Refresh Token**: Cryptographically random string (64 bytes = 128 hex chars). Stored in database as SHA-256 hash, never as JWT.

**Token Expiry** (from `constants.ts`):
```typescript
const TOKEN_EXPIRY = {
  ACCESS: '15m',              // Both platforms
  REFRESH: '7d',              // Web platform
  REMEMBER_ME_REFRESH: '30d', // Mobile platform
};
```

**Platform-Specific Token Delivery**:
| Platform | Delivery Method | Storage |
|----------|----------------|---------|
| Web | httpOnly cookies (`access_token`, `refresh_token`) | Browser cookie jar |
| Mobile | URL fragment (`#access_token=...&refresh_token=...`) | expo-secure-store |

### 5.3 OAuth State Management

The implementation uses custom HMAC-SHA256 signed state parameters:

```typescript
// State payload structure (from oauth-state.ts)
interface OAuthStatePayload {
  nonce: string;           // Cryptographically random (32 hex chars)
  platform: 'web' | 'mobile';
  redirectUri?: string;    // Required for mobile, validated against scheme
  iat: number;             // Issued at (seconds)
  exp: number;             // Expiry (10 minutes)
}

// Format: base64url(JSON payload).HMAC-SHA256 signature
// Validation: timing-safe comparison, expiry check, 60s clock skew tolerance
```

### 5.4 Platform-Specific OAuth Flow

**Mobile Flow:**
1. App opens `GET /auth/github?platform=mobile&redirect_uri=breadthwise://auth/callback`
2. Backend validates `redirect_uri` starts with `MOBILE_DEEP_LINK_SCHEME`
3. Generates signed state encoding platform + redirect_uri + nonce
4. Redirects to GitHub OAuth
5. On callback: validates state, exchanges code, upserts user, generates tokens
6. `302` redirect to `breadthwise://auth/callback#access_token=...&refresh_token=...`
7. App extracts tokens from URL fragment, stores in SecureStore

**Web Flow:**
1. Browser navigates to `GET /auth/github?platform=web`
2. Generates signed state with platform + nonce
3. Redirects to GitHub OAuth
4. On callback: validates state, exchanges code, upserts user, generates tokens
5. Sets httpOnly cookies (`access_token`, `refresh_token`)
6. `302` redirect to `WEB_CLIENT_URL`
7. Browser includes cookies automatically on subsequent requests

## 6. API Endpoints

### 6.1 Authentication Endpoints

#### `GET /auth/github` - Initiate OAuth

Auto-handled by `@fastify/oauth2` via `startRedirectPath: '/github'`.

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `platform` | Query | No (defaults to `web`) | `web` or `mobile` |
| `redirect_uri` | Query | Yes (mobile only) | Must start with `MOBILE_DEEP_LINK_SCHEME` |

**Response**: `302` redirect to GitHub OAuth with signed state parameter.

#### `GET /auth/github/callback` - OAuth Callback

Processes the OAuth code exchange. Called by GitHub after user authorization.

| Parameter | Location | Description |
|-----------|----------|-------------|
| `code` | Query | OAuth authorization code from GitHub |
| `state` | Query | Signed state parameter (validated automatically) |

**Process**:
1. `@fastify/oauth2` exchanges code for GitHub access token
2. Fetch user profile from `https://api.github.com/user`
3. Upsert user in database by GitHub ID
4. Generate JWT access token + random refresh token
5. Store hashed refresh token in database
6. Platform-specific response (from decoded state)

**Response (Web)**: Sets httpOnly cookies + `302` redirect to `WEB_CLIENT_URL`
**Response (Mobile)**: `302` redirect to `{redirect_uri}#access_token={jwt}&refresh_token={token}`

#### `POST /auth/refresh` - Refresh Access Token

| Platform | Token Source | Request Body |
|----------|-------------|-------------|
| Web | `refresh_token` cookie | None |
| Mobile | Request body | `{ "refreshToken": "string" }` |

Platform detected via `x-platform` header or query param.

**Process**: Validate token hash against DB -> revoke old token -> generate new pair (rotation).

**Response (Web)**: `200` + sets new cookies + `{ "message": "Tokens refreshed successfully" }`
**Response (Mobile)**: `200` + `{ "accessToken": "...", "refreshToken": "..." }`
**Error**: `401` if token is invalid, expired, or revoked.

#### `POST /auth/logout` - Logout

**Authentication**: Optional (allows logout even with invalid/expired token).

| Platform | Token Source |
|----------|-------------|
| Web | `refresh_token` cookie (also clears cookies) |
| Mobile | Body `{ "refreshToken": "string" }` (optional) |

**Response**: `200` + `{ "message": "Logged out successfully" }`

#### `POST /auth/revoke-all` - Revoke All Tokens

**Authentication**: Required (`Authorization: Bearer {access_token}`).

Revokes all non-revoked refresh tokens for the authenticated user. Web platform also clears cookies.

**Response**: `200` + `{ "message": "All tokens revoked" }`

#### `GET /auth/session` - Validate Session

**Authentication**: Required (JWT via `fastify.authenticate`).
- Web: `access_token` cookie (read automatically by `@fastify/jwt`)
- Mobile: `Authorization: Bearer {access_token}` header

**Response**: `200`
```json
{
  "user": {
    "sub": "uuid",
    "githubId": "12345",
    "username": "octocat",
    "email": "octocat@github.com",
    "platform": "web",
    "iat": 1700000000,
    "exp": 1700000900
  },
  "expiresAt": "2025-11-15T12:15:00.000Z"
}
```

**Important**: This returns JWT claims only, not the full database user record. For full user data (`avatarUrl`, `displayName`, `createdAt`, `updatedAt`), use `GET /users/me`.

### 6.2 User Management Endpoints

All user routes require JWT authentication (enforced via `onRequest` hook with `jwtVerify`).

#### `GET /users/me` - Get Current User

**Response**: `200`
```json
{
  "user": {
    "id": "uuid",
    "githubId": "12345",
    "username": "octocat",
    "displayName": "The Octocat",
    "email": "octocat@github.com",
    "avatarUrl": "https://avatars.githubusercontent.com/u/12345",
    "createdAt": "2025-11-15T12:00:00.000Z",
    "updatedAt": "2025-11-15T12:00:00.000Z"
  }
}
```

#### `PATCH /users/me` - Update Current User

**Body** (Zod validated):
```json
{
  "displayName": "New Name",
  "avatarUrl": "https://..."
}
```
Both fields are optional. `displayName`: 1-255 chars. `avatarUrl`: valid URL.

**Response**: `200` + `{ "user": { ... } }`

## 7. Backend Implementation

### 7.1 Fastify App Configuration

```typescript
// src/app.ts
export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'debug' : 'info',
      transport: env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' } }
        : undefined,
    },
    trustProxy: true,
  });

  // Security headers (CSP only in production)
  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production' ? {
      directives: { defaultSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"] },
    } : false,
  });

  // CORS with credentials for cookie-based auth
  await app.register(cors, { origin: env.ALLOWED_ORIGINS, credentials: true });

  // Global rate limiting (100 req / 15 min)
  await app.register(rateLimit, {
    max: RATE_LIMITS.GLOBAL.MAX,
    timeWindow: RATE_LIMITS.GLOBAL.TIME_WINDOW,
  });

  // Cookie support (secret used for signing capability)
  await app.register(cookie, { secret: env.JWT_ACCESS_SECRET, parseOptions: {} });

  // JWT - reads access_token cookie (web) or Authorization header (mobile)
  await app.register(jwt, {
    secret: env.JWT_ACCESS_SECRET,
    cookie: { cookieName: 'access_token', signed: false },
    decode: { complete: true },
  });

  // Auth decorator
  app.decorate('authenticate', jwtGuard);

  // Middleware & error handling
  app.addHook('onRequest', requestLogger);
  app.setErrorHandler(errorHandler);

  // Health check
  app.get('/health', async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  }));

  // Routes
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(userRoutes, { prefix: '/users' });

  return app;
}

// Type declarations
declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      sub: string;
      githubId: string;
      username: string;
      email?: string;
      platform?: 'web' | 'mobile';
      iat: number;
      exp: number;
    };
  }
}
```

### 7.2 Auth Routes with OAuth2 Plugin

```typescript
// src/modules/auth/auth.routes.ts
const oauth2Options: FastifyOAuth2Options = {
  name: 'githubOAuth2',
  credentials: {
    client: { id: env.GITHUB_CLIENT_ID, secret: env.GITHUB_CLIENT_SECRET },
    auth: oauth2Plugin.GITHUB_CONFIGURATION,
  },
  startRedirectPath: '/github',
  callbackUri: env.GITHUB_CALLBACK_URL,
  scope: ['user:email', 'read:user'],

  // Encode platform + redirect URI in signed state
  generateStateFunction: (request, callback) => {
    const { platform, redirect_uri } = request.query;
    // Validates mobile redirect_uri starts with MOBILE_DEEP_LINK_SCHEME
    const state = generateState(platform || 'web', redirect_uri);
    callback(null, state);
  },

  // Verify HMAC signature, decode state, attach to request.oauthState
  checkStateFunction: (request, callback) => {
    const { state } = request.query;
    request.oauthState = validateState(state);
    callback();
  },
};

// Routes:
// GET /auth/github          - Auto-handled by plugin
// GET /auth/github/callback - controller.githubCallback
// POST /auth/refresh        - No auth required
// POST /auth/logout         - Optional auth (try jwtVerify, ignore failure)
// POST /auth/revoke-all     - Requires fastify.authenticate
// GET /auth/session         - Requires fastify.authenticate
```

### 7.3 Token Generation & Refresh

```typescript
// src/modules/auth/auth.service.ts

async generateTokens(user, platform, request): Promise<TokenPair> {
  const fingerprint = env.ENABLE_FINGERPRINTING ? generateFingerprint(request) : undefined;

  const accessToken = await request.server.jwt.sign({
    sub: user.id, githubId: user.githubId, username: user.username,
    email: user.email || undefined, platform, fingerprint,
  }, { expiresIn: '15m' });

  const refreshTokenValue = generateRandomToken(64); // 128 hex chars
  const refreshTokenHash = hashToken(refreshTokenValue); // SHA-256

  await this.authRepository.createRefreshToken({
    userId: user.id, tokenHash: refreshTokenHash,
    expiresAt: new Date(Date.now() + parseExpiry(getExpiry('refresh', platform)) * 1000),
  });

  return { accessToken, refreshToken: refreshTokenValue };
}

async refreshTokens(refreshTokenValue, request) {
  const tokenHash = hashToken(refreshTokenValue);
  const refreshToken = await this.authRepository.findRefreshToken(tokenHash);
  if (!refreshToken) throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');

  const user = await this.userRepository.findById(refreshToken.userId);
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

  await this.authRepository.revokeRefreshToken(tokenHash); // Token rotation
  const platform = this.detectPlatform(request);
  const tokens = await this.generateTokens(user, platform, request);
  return { user, tokens };
}
```

### 7.4 Cookie Management

```typescript
setTokenCookies(reply, tokens) {
  const opts = {
    httpOnly: true, secure: env.SECURE_COOKIES,
    sameSite: 'lax' as const, domain: env.COOKIE_DOMAIN, path: '/',
  };
  reply.setCookie('access_token', tokens.accessToken, { ...opts, maxAge: parseExpiry('15m') });
  reply.setCookie('refresh_token', tokens.refreshToken, { ...opts, maxAge: parseExpiry('7d') });
}

clearTokenCookies(reply) {
  reply.clearCookie('access_token', { path: '/', domain: env.COOKIE_DOMAIN });
  reply.clearCookie('refresh_token', { path: '/', domain: env.COOKIE_DOMAIN });
}
```

### 7.5 Error Handling

```typescript
// src/modules/shared/middleware/error-handler.ts
export class AppError extends Error {
  constructor(public message: string, public statusCode = 500, public code?: string) { ... }
}

// Response format: { error: string, code: string, statusCode: number }
// Handles: AppError, Fastify validation errors, generic 500s
```

## 8. Security

### 8.1 OAuth State Security
- Custom HMAC-SHA256 signed state (not just random string)
- 10-minute expiry window with 60s clock skew tolerance
- Timing-safe signature comparison (`crypto.timingSafeEqual`)
- Encodes platform and redirect URI for callback routing

### 8.2 Token Security
- **Access tokens (JWT)**: HS256, 15min expiry, stateless (not revocable)
- **Refresh tokens (random)**: 64-byte hex, stored as SHA-256 hash, single-use rotation, revocable
- **Fingerprinting** (optional via `ENABLE_FINGERPRINTING`): Binds token to device characteristics

### 8.3 Web Security
- httpOnly cookies prevent XSS token theft
- `secure: true` in production (HTTPS only)
- `sameSite: 'lax'` for CSRF protection
- Helmet security headers (CSP in production)

### 8.4 Mobile Security
- URL fragment delivery (fragments never sent to servers)
- Redirect URI validation against `MOBILE_DEEP_LINK_SCHEME`
- Tokens stored in device secure storage (Keychain / EncryptedSharedPreferences)

### 8.5 Rate Limiting
- Global: 100 requests per 15 minutes
- Auth-specific: `RATE_LIMITS.AUTH` constant defined (5 per 15 min) for route-level application

### 8.6 Input Validation
- Zod schemas for all request bodies and query parameters
- SQL injection prevention via Drizzle ORM parameterized queries

## 9. Docker Configuration

### 9.1 Dockerfile

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/modules/shared/database/migrations ./src/modules/shared/database/migrations
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/scripts/start.sh ./start.sh
RUN chmod +x ./start.sh

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

EXPOSE 3000
CMD ["./start.sh"]
```

### 9.2 Docker Compose (Local Development)

```yaml
name: breadthwise
services:
  api:
    container_name: breadthwise-api
    build:
      context: ..
      dockerfile: docker/Dockerfile
    ports: ['3000:3000']
    env_file: [../.env]
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/breadthwise
    volumes: ['../src:/app/src', '../dist:/app/dist']
    depends_on: [postgres]
    restart: unless-stopped

  postgres:
    container_name: breadthwise-db
    image: postgres:16-alpine
    ports: ['5433:5432']
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=breadthwise
    volumes: [postgres_data:/var/lib/postgresql/data]
    restart: unless-stopped

volumes:
  postgres_data:
```

## 10. Environment Variables

```bash
# Environment
NODE_ENV=development  # development | staging | production
PORT=3000

# Database (auto-detects Neon vs local PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/breadthwise

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# OAuth State Security (generate: openssl rand -base64 32)
OAUTH_STATE_SECRET=your_oauth_state_secret_min_32_chars

# JWT Secret (generate: openssl rand -base64 32)
JWT_ACCESS_SECRET=your_jwt_access_secret_min_32_chars

# Client URLs
WEB_CLIENT_URL=http://localhost:8081
MOBILE_DEEP_LINK_SCHEME=breadthwise://

# Cookie Settings
COOKIE_DOMAIN=localhost        # Optional
SECURE_COOKIES=false           # true in production

# Security
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:3000
ENABLE_FINGERPRINTING=true
```

## 11. Key Architectural Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| OAuth Library | `@fastify/oauth2` | Native Fastify integration, simpler than Passport.js |
| OAuth State | HMAC-SHA256 signed | Prevents tampering, encodes platform context |
| Refresh Tokens | Random (64 bytes) | More secure than JWT, true revocation, easy rotation |
| JWT Algorithm | HS256 (symmetric) | Adequate for single-service, simpler than RS256 |
| Mobile Token Delivery | URL fragment (`#`) | Fragments never sent to servers, reduces leak risk |
| Token Storage | Hashed in DB | True revocation capability |
| Platform Detection | Header + query param | Flexible, supports initial OAuth redirect |
| DB Client | Auto-detecting | Seamless local dev (PostgreSQL) + cloud (Neon) |

---

**Document Version**: 3.0
**Last Updated**: 2026-03-07
**Status**: Production Ready
