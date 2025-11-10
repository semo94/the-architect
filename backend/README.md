# Breadthwise Backend

A modern, secure backend API built with Fastify and TypeScript, featuring GitHub OAuth authentication, JWT tokens, and multi-platform support (web and mobile).

## Features

- **GitHub SSO Authentication** - OAuth 2.0 integration with multi-platform support
- **Multi-Platform Support** - Separate flows for web (cookies) and mobile (JSON tokens)
- **JWT Authentication** - Access and refresh tokens with device fingerprinting
- **Type-Safe** - Full TypeScript implementation with Zod validation
- **Database** - Neon PostgreSQL with Drizzle ORM
- **Security** - Rate limiting, Helmet, CORS, httpOnly cookies
- **Docker Ready** - Multi-stage builds with auto-migrations
- **Production Ready** - Configured for Render deployment

## Tech Stack

- **Runtime**: Node.js 22+
- **Framework**: Fastify 5.x
- **Language**: TypeScript 5.x
- **Database**: Neon PostgreSQL (Serverless)
- **ORM**: Drizzle ORM 0.44.x
- **Authentication**: GitHub OAuth 2.0 + JWT
- **Validation**: Zod 4.x

## Quick Start

### Prerequisites

- Node.js 22 or higher
- npm or pnpm
- PostgreSQL database (Neon for production, local for development)
- GitHub OAuth App credentials

---

## Local Development

### Option 1: Using Local PostgreSQL (Recommended for Development)

#### 1. Install Dependencies

```bash
cd backend
npm install
```

#### 2. Setup Local Database

**Using Docker Compose (Easiest)**:

```bash
# Start PostgreSQL in Docker
docker-compose -f docker/docker-compose.yml up postgres -d

# This creates a PostgreSQL instance at:
# postgresql://postgres:postgres@localhost:5432/breadthwise
```

**Or install PostgreSQL locally**:
- macOS: `brew install postgresql@16`
- Ubuntu: `apt-get install postgresql-16`
- Windows: Download from [postgresql.org](https://www.postgresql.org/download/)

#### 3. Create `.env` File

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
NODE_ENV=development
PORT=3000

# Local PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/breadthwise

# Temporary values for now - we'll set up GitHub OAuth next
GITHUB_CLIENT_ID=temporary
GITHUB_CLIENT_SECRET=temporary
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# Generate with: openssl rand -base64 32
JWT_ACCESS_SECRET=swOHWopT+Bjb0YGmINDbMQqPPTMaFRfsuykRTTPDVzk=
JWT_REFRESH_SECRET=QY8+GI4/ZIiBWieCwNSbD6CLCcV+pSYA+ZKVP+fphig=

# Local client
WEB_CLIENT_URL=http://localhost:3001
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3000
SECURE_COOKIES=false
```

**Generate JWT Secrets**:
```bash
openssl rand -base64 32  # For JWT_ACCESS_SECRET
openssl rand -base64 32  # For JWT_REFRESH_SECRET
```

#### 4. Setup Database Schema

```bash
# Generate migrations (already done, but if you change schema)
npm run migrate:generate

# Run migrations to create tables
npm run migrate
```

#### 5. Start Development Server

```bash
npm run dev
```

Server starts at `http://localhost:3000`

**Test Health Endpoint**:
```bash
curl http://localhost:3000/health
```

---

### Option 2: Using Neon Database (Production-like)

#### 1. Create Neon Project

1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project
3. Copy the connection string

#### 2. Update `.env`

```env
DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```

#### 3. Run Migrations and Start

```bash
npm run migrate
npm run dev
```

---

## Setting Up GitHub OAuth for Local Development

To test the full authentication flow locally, you need to make your local server accessible to GitHub. We'll use ngrok (or similar) to create a public URL.

### Option A: Using ngrok (Recommended)

#### 1. Install ngrok

```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

#### 2. Start Your Local Server

```bash
npm run dev
```

#### 3. Create Tunnel

```bash
# In another terminal
ngrok http 3000
```

You'll see output like:
```
Forwarding    https://abc123.ngrok.io -> http://localhost:3000
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

#### 4. Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name**: `Breadthwise Dev`
   - **Homepage URL**: `https://abc123.ngrok.io`
   - **Authorization callback URL**: `https://abc123.ngrok.io/auth/github/callback`
4. Click **"Register application"**
5. Copy the **Client ID**
6. Generate and copy the **Client Secret**

#### 5. Update `.env`

```env
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
GITHUB_CALLBACK_URL=https://abc123.ngrok.io/auth/github/callback
ALLOWED_ORIGINS=http://localhost:3001,https://abc123.ngrok.io
```

#### 6. Restart Server

```bash
# Stop the server (Ctrl+C) and restart
npm run dev
```

#### 7. Test OAuth Flow

**Web Flow**:
```bash
# Visit in browser
https://abc123.ngrok.io/auth/github?platform=web
```

You should:
1. Be redirected to GitHub
2. Authorize the app
3. Be redirected back with cookies set

**Check Session**:
```bash
curl -X GET https://abc123.ngrok.io/auth/session \
  -b cookies.txt \
  -c cookies.txt
```

### Option B: Using localhost.run (No Installation)

```bash
# Start your dev server
npm run dev

# In another terminal
ssh -R 80:localhost:3000 nokey@localhost.run
```

Follow the same steps as ngrok to configure GitHub OAuth.

### Option C: Skip OAuth for API Development

If you only need to test non-auth endpoints:

1. Use the `/health` endpoint to verify the server works
2. Create a test JWT token manually for authenticated endpoints
3. Use tools like Postman/Insomnia with mock tokens

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build TypeScript to JavaScript |
| `npm start` | Start production server (requires build) |
| `npm run migrate` | Run database migrations |
| `npm run migrate:generate` | Generate migrations from schema changes |
| `npm run migrate:push` | Push schema directly to database (dev only) |
| `npm run db:studio` | Open Drizzle Studio (database GUI) |
| `npm test` | Run all tests |
| `npm run test:unit` | Run unit tests |
| `npm run lint` | Lint TypeScript code |
| `npm run format` | Format code with Prettier |

---

## Docker Development

### Build and Run with Docker

```bash
# Build image
docker build -f docker/Dockerfile -t breadthwise-api .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="your_db_url" \
  -e GITHUB_CLIENT_ID="your_id" \
  -e GITHUB_CLIENT_SECRET="your_secret" \
  -e JWT_ACCESS_SECRET="your_secret" \
  -e JWT_REFRESH_SECRET="your_secret" \
  breadthwise-api
```

### Using Docker Compose

```bash
# Start all services (API + PostgreSQL)
docker-compose -f docker/docker-compose.yml up

# Stop services
docker-compose -f docker/docker-compose.yml down

# View logs
docker-compose -f docker/docker-compose.yml logs -f
```

**Note**: Docker Compose includes a PostgreSQL instance for local development. The API service will automatically wait for the database to be ready.

---

## Database Management

### Generate Migrations After Schema Changes

```bash
# 1. Edit schema in src/modules/shared/database/schema.ts
# 2. Generate migration
npm run migrate:generate

# 3. Review migration in src/modules/shared/database/migrations/
# 4. Apply migration
npm run migrate
```

### View Database with Drizzle Studio

```bash
npm run db:studio
```

Opens at `https://local.drizzle.studio`

### Seed Database (Optional)

Edit `scripts/seed.ts` with your test data, then:

```bash
npm run seed
```

---

## API Documentation

### Base URL

- Local: `http://localhost:3000`
- Production: `https://your-app.onrender.com`

### Authentication Endpoints

#### `GET /auth/github`
Initiate GitHub OAuth flow

**Query Parameters**:
- `platform`: `web` | `mobile` (default: `web`)
- `redirect_uri`: Deep link for mobile (mobile only)

**Example**:
```bash
# Web
curl http://localhost:3000/auth/github?platform=web

# Mobile
curl http://localhost:3000/auth/github?platform=mobile&redirect_uri=myapp://callback
```

#### `GET /auth/github/callback`
OAuth callback (handled automatically by GitHub)

#### `POST /auth/refresh`
Refresh access token

**Request (Mobile)**:
```json
{
  "refreshToken": "string"
}
```

**Request (Web)**: Automatic (uses `refresh_token` cookie)

**Response**:
```json
{
  "accessToken": "string",
  "refreshToken": "string"
}
```

#### `POST /auth/logout`
Logout and revoke tokens

**Headers**: `Authorization: Bearer {token}` (mobile) or cookies (web)

#### `GET /auth/session`
Validate current session (requires authentication)

### User Endpoints

#### `GET /users/me`
Get current authenticated user

**Headers**: `Authorization: Bearer {token}`

**Response**:
```json
{
  "user": {
    "id": "uuid",
    "githubId": "123456",
    "username": "johndoe",
    "displayName": "John Doe",
    "email": "john@example.com",
    "avatarUrl": "https://...",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### `PATCH /users/me`
Update current user

**Headers**: `Authorization: Bearer {token}`

**Request**:
```json
{
  "displayName": "New Name",
  "avatarUrl": "https://..."
}
```

### Health Check

#### `GET /health`
Check server health

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-11-10T12:00:00.000Z",
  "environment": "development"
}
```

---

## Testing

### Manual API Testing

**Using curl**:
```bash
# Health check
curl http://localhost:3000/health

# Start OAuth flow
curl http://localhost:3000/auth/github?platform=web

# Test authenticated endpoint (replace TOKEN)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/users/me
```

**Using Postman/Insomnia**:
1. Import the API endpoints
2. Set base URL to `http://localhost:3000`
3. Use OAuth flow to get tokens
4. Add tokens to subsequent requests

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# With coverage
npm test -- --coverage
```

---

## Project Structure

```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/              # Authentication logic
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.repository.ts
│   │   │   ├── auth.schemas.ts
│   │   │   └── guards/
│   │   │       └── jwt.guard.ts
│   │   ├── user/              # User management
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── user.repository.ts
│   │   │   └── user.schemas.ts
│   │   └── shared/            # Shared utilities
│   │       ├── config/
│   │       │   ├── env.ts     # Environment validation
│   │       │   └── constants.ts
│   │       ├── database/
│   │       │   ├── client.ts  # Drizzle client
│   │       │   ├── schema.ts  # Database schema
│   │       │   └── migrations/ # SQL migrations
│   │       ├── middleware/
│   │       │   ├── error-handler.ts
│   │       │   └── request-logger.ts
│   │       └── utils/
│   │           ├── jwt.utils.ts
│   │           └── crypto.utils.ts
│   ├── app.ts                 # Fastify app setup
│   └── server.ts              # Entry point
├── scripts/
│   ├── migrate.ts             # Migration runner
│   ├── seed.ts                # Database seeder
│   └── start.sh               # Production startup script
├── docker/
│   ├── Dockerfile             # Production Docker image
│   └── docker-compose.yml     # Local development setup
├── drizzle.config.ts          # Drizzle ORM config
├── tsconfig.json              # TypeScript config
├── eslint.config.mjs          # ESLint config (flat config)
├── package.json               # Dependencies and scripts
├── .env.example               # Example environment variables
├── .dockerignore              # Docker ignore patterns
├── render.yaml                # Render deployment config
├── README.md                  # This file
└── DEPLOYMENT.md              # Deployment guide
```

---

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | `abc123` |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret | `secret123` |
| `GITHUB_CALLBACK_URL` | OAuth callback URL | `http://localhost:3000/auth/github/callback` |
| `JWT_ACCESS_SECRET` | JWT access token secret (32+ chars) | `random_32_char_string` |
| `JWT_REFRESH_SECRET` | JWT refresh token secret (32+ chars) | `random_32_char_string` |
| `WEB_CLIENT_URL` | Frontend URL | `http://localhost:3001` |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | `http://localhost:3001,http://localhost:3000` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |
| `SECURE_COOKIES` | Use secure cookies (HTTPS) | `false` |
| `COOKIE_DOMAIN` | Cookie domain | `localhost` |
| `ENABLE_FINGERPRINTING` | Enable device fingerprinting | `true` |
| `MOBILE_DEEP_LINK_SCHEME` | Mobile app deep link | `breadthwise://` |

---

## Deployment

### Deploy to Production

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions for:

- Neon PostgreSQL setup
- Render deployment
- Environment configuration
- GitHub OAuth configuration for production
- Monitoring and troubleshooting

### Quick Deploy to Render

```bash
# 1. Push code to GitHub
git push origin main

# 2. Connect repository in Render dashboard
# 3. Deploy from render.yaml (auto-detected)
# 4. Configure environment variables
# 5. Deploy!
```

**Important**: Migrations run automatically on every deployment.

---

## Security

### Features

- **Rate Limiting**: 100 requests per 15 minutes (configurable)
- **Helmet**: Security headers enabled
- **CORS**: Strict origin checking
- **HttpOnly Cookies**: XSS protection for web clients
- **JWT Fingerprinting**: Device/IP binding
- **Token Rotation**: Refresh tokens rotated on use
- **Input Validation**: Zod schemas on all inputs
- **SQL Injection Protection**: Parameterized queries via Drizzle ORM

### Best Practices

- Never commit `.env` files
- Use strong JWT secrets (32+ characters)
- Enable `SECURE_COOKIES=true` in production
- Use HTTPS everywhere in production
- Regularly rotate JWT secrets
- Monitor rate limit violations
- Keep dependencies updated

---

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

#### Database Connection Failed

- **Local**: Ensure PostgreSQL is running
  ```bash
  docker-compose -f docker/docker-compose.yml up postgres -d
  ```
- **Neon**: Check connection string and internet connection
- Verify `DATABASE_URL` in `.env`

#### GitHub OAuth Errors

- Verify callback URL matches GitHub app settings exactly
- Check client ID and secret
- Ensure scopes include `user:email` and `read:user`
- For local dev, use ngrok or similar tunneling

#### Migration Errors

- Ensure database exists and is accessible
- Check migration files in `src/modules/shared/database/migrations/`
- Try generating a fresh migration: `npm run migrate:generate`

---

## Development Tips

### Hot Reload

The dev server uses `tsx watch` for instant reload on file changes.

### Database GUI

```bash
npm run db:studio
```

Opens Drizzle Studio at `https://local.drizzle.studio` to view and edit data.

### View Logs

Logs use Pino with pretty printing in development:

```bash
npm run dev
# Logs show colored, formatted output
```

### Test API with VS Code REST Client

Create `test.http`:
```http
### Health Check
GET http://localhost:3000/health

### Get Current User
GET http://localhost:3000/users/me
Authorization: Bearer YOUR_TOKEN
```

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Run linter: `npm run lint`
6. Commit with descriptive message
7. Push and create PR

---

## License

MIT

---

## Support & Resources

- **Documentation**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Fastify**: [fastify.dev](https://fastify.dev/)
- **Drizzle ORM**: [orm.drizzle.team](https://orm.drizzle.team/)
- **Neon**: [neon.tech/docs](https://neon.tech/docs)
- **Render**: [render.com/docs](https://render.com/docs)

---

## What's Next?

1. ✅ Local development setup
2. ✅ GitHub OAuth configured
3. ✅ Database migrations run
4. ✅ Server running and tested
5. → Deploy to production (see [DEPLOYMENT.md](./DEPLOYMENT.md))
6. → Set up monitoring
7. → Configure custom domain
8. → Add more features!
