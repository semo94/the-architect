# Knowledge Expansion Backend API

A modern, secure backend API built with Fastify and TypeScript, featuring GitHub OAuth authentication, JWT tokens, and multi-platform support (web and mobile).

## Features

- **GitHub SSO Authentication** - OAuth 2.0 integration
- **Multi-Platform Support** - Separate flows for web (cookies) and mobile (JSON tokens)
- **JWT Authentication** - Access and refresh tokens with fingerprinting
- **Type-Safe** - Full TypeScript implementation
- **Database** - Neon PostgreSQL with Drizzle ORM
- **Security** - Rate limiting, helmet, CORS, httpOnly cookies
- **Docker Ready** - Multi-stage builds for production

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Fastify 4.x
- **Language**: TypeScript
- **Database**: Neon PostgreSQL (Serverless)
- **ORM**: Drizzle ORM
- **Authentication**: GitHub OAuth 2.0 + JWT
- **Validation**: Zod

## Prerequisites

- Node.js 20 or higher
- npm or pnpm
- Neon PostgreSQL database (or any PostgreSQL)
- GitHub OAuth App credentials

## Getting Started

### 1. Clone and Install

```bash
cd backend
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

#### Required Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host/database

# GitHub OAuth (Create at: https://github.com/settings/developers)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# JWT Secrets (Generate with: openssl rand -base64 32)
JWT_ACCESS_SECRET=your_jwt_access_secret_min_32_chars
JWT_REFRESH_SECRET=your_jwt_refresh_secret_min_32_chars

# Client URLs
WEB_CLIENT_URL=http://localhost:3001
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3000
```

### 3. Database Setup

#### Generate migrations from schema:

```bash
npm run migrate:generate
```

#### Run migrations:

```bash
npm run migrate
```

#### (Optional) Seed database:

```bash
npm run seed
```

### 4. Run Development Server

```bash
npm run dev
```

The server will start at `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run migrate:generate` - Generate migrations from schema
- `npm run db:studio` - Open Drizzle Studio
- `npm test` - Run tests
- `npm run lint` - Lint code

## API Endpoints

### Authentication

#### `GET /auth/github`
Initiate GitHub OAuth flow

**Query Parameters:**
- `platform` - `web` | `mobile` (required)
- `redirect_uri` - Mobile deep link (mobile only)

**Web Response:** Redirects to GitHub
**Mobile Response:** `{ authUrl: string, state: string }`

#### `GET /auth/github/callback`
GitHub OAuth callback (handled automatically)

**Web Response:** Redirects to client with cookies set
**Mobile Response:** Redirects to deep link with tokens

#### `POST /auth/refresh`
Refresh access token

**Mobile Request:**
```json
{
  "refreshToken": "string"
}
```

**Web Request:** Uses `refresh_token` cookie

**Response:**
```json
{
  "accessToken": "string",
  "refreshToken": "string"
}
```

#### `POST /auth/logout`
Logout user and revoke tokens

**Headers:** `Authorization: Bearer {token}` (mobile)
**Cookies:** `access_token` (web)

#### `POST /auth/revoke-all`
Revoke all user tokens

**Requires authentication**

#### `GET /auth/session`
Validate current session

**Requires authentication**

### User Management

#### `GET /users/me`
Get current authenticated user

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "githubId": "string",
    "username": "string",
    "displayName": "string",
    "email": "string",
    "avatarUrl": "string",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

#### `PATCH /users/me`
Update current user

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "displayName": "string (optional)",
  "avatarUrl": "string (optional)"
}
```

### Health Check

#### `GET /health`
Check server health

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "ISO8601",
  "environment": "development"
}
```

## Authentication Flows

### Web Flow (Cookie-based)

1. Client redirects to `/auth/github?platform=web`
2. User authorizes on GitHub
3. Backend sets httpOnly cookies and redirects to client
4. Client makes requests with cookies automatically included

### Mobile Flow (Token-based)

1. App opens in-app browser to `/auth/github?platform=mobile&redirect_uri=myapp://auth/callback`
2. User authorizes on GitHub
3. Backend redirects to deep link with tokens
4. App stores tokens securely and includes in `Authorization` header

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  github_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  username VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Refresh Tokens Table
```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP,
  revoked_at TIMESTAMP
);
```

## Docker

### Build Image

```bash
docker build -f docker/Dockerfile -t knowledge-expansion-api .
```

### Run with Docker Compose

```bash
docker-compose -f docker/docker-compose.yml up
```

## Security Features

- **Rate Limiting** - 100 requests per 15 minutes globally
- **Helmet** - Security headers
- **CORS** - Configurable allowed origins
- **httpOnly Cookies** - XSS protection for web
- **JWT Fingerprinting** - Device/IP binding
- **Token Rotation** - Refresh tokens rotated on use
- **Input Validation** - Zod schemas for all inputs

## Project Structure

```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/           # Authentication module
│   │   ├── user/           # User management module
│   │   └── shared/         # Shared utilities
│   │       ├── database/   # DB schema & client
│   │       ├── config/     # Environment config
│   │       ├── middleware/ # Custom middleware
│   │       └── utils/      # Utility functions
│   ├── app.ts             # Fastify app setup
│   └── server.ts          # Entry point
├── scripts/               # Migration & seed scripts
├── docker/                # Docker configuration
└── tests/                 # Test files
```

## Deployment

### Render

See `docs/backend-spec.md` for Render deployment configuration.

### Environment Variables for Production

Ensure all environment variables are set in your deployment platform:
- Set `NODE_ENV=production`
- Set `SECURE_COOKIES=true`
- Use HTTPS URLs for all callback and client URLs
- Generate strong JWT secrets (minimum 32 characters)

## Development Tips

### Generate Strong Secrets

```bash
openssl rand -base64 32
```

### View Database

```bash
npm run db:studio
```

### Check Logs

Logs are formatted with Pino and include structured data:
- Request/response logging
- Error tracking
- Performance metrics

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check Neon dashboard for connection limits
- Ensure IP allowlist includes your IP

### GitHub OAuth Errors
- Verify callback URL matches GitHub app settings
- Check client ID and secret
- Ensure scopes include `user:email` and `read:user`

### CORS Errors
- Add your client URL to `ALLOWED_ORIGINS`
- Ensure `credentials: true` in CORS config

## License

MIT
