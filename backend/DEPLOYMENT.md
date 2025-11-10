# Deployment Guide

This guide covers deploying the backend API to Render (free tier) with Neon PostgreSQL database.

## Architecture Overview

- **API**: Docker container running on Render free tier (always on)
- **Database**: Serverless PostgreSQL on Neon (Vercel Postgres)
- **Communication**: API talks to Neon DB via HTTP API

## Prerequisites

1. GitHub account (for code repository)
2. Render account (free tier)
3. Neon account (free tier)
4. GitHub OAuth App configured

---

## Step 1: Setup Neon Database

### 1.1 Create Neon Project

1. Go to [Neon Console](https://console.neon.tech/)
2. Click **"Create a project"**
3. Configure:
   - **Project name**: `knowledge-expansion` (or your preference)
   - **Postgres version**: 16 (latest)
   - **Region**: Choose closest to your Render region (e.g., US West for Oregon)
4. Click **"Create project"**

### 1.2 Get Database Connection String

1. In your Neon project dashboard, click **"Connection string"**
2. Select **"Node.js"** or **"Connection string"**
3. Copy the connection string - it looks like:
   ```
   postgresql://username:password@ep-xxxxx.region.aws.neon.tech/neondb?sslmode=require
   ```
4. **Save this for later** - you'll need it for Render environment variables

### 1.3 Database Configuration

The database migrations will run automatically on first deployment. No manual setup required!

**Note**: Neon free tier includes:
- 10 databases
- 3 GB storage
- Unlimited compute time
- Automatic suspend after inactivity

---

## Step 2: Setup GitHub OAuth App

### 2.1 Create OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name**: `Knowledge Expansion` (or your preference)
   - **Homepage URL**: `https://your-app.onrender.com` (you'll get this from Render)
   - **Authorization callback URL**: `https://your-app.onrender.com/auth/github/callback`
4. Click **"Register application"**

### 2.2 Get OAuth Credentials

1. On the app page, note the **Client ID**
2. Click **"Generate a new client secret"**
3. Copy the **Client Secret** immediately (you won't see it again)
4. **Save both for later** - you'll need them for Render

**Important**: You'll need to update the callback URL once you know your Render app URL.

---

## Step 3: Deploy to Render

### Option A: Deploy with Blueprint (Recommended)

1. Fork/push this repository to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click **"New +"** → **"Blueprint"**
4. Connect your GitHub repository
5. Render will detect `render.yaml` automatically
6. Click **"Apply"**

### Option B: Manual Deploy

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `breadthwise-api`
   - **Runtime**: `Docker`
   - **Region**: `Oregon` (Free tier available)
   - **Branch**: `main` (or your branch)
   - **Dockerfile Path**: `./docker/Dockerfile`
   - **Docker Context**: `.` (root of repo)
   - **Instance Type**: `Free`

### 3.1 Configure Environment Variables

In Render dashboard, go to **Environment** and add:

```env
# Required - Database
DATABASE_URL=<your-neon-connection-string>

# Required - GitHub OAuth
GITHUB_CLIENT_ID=<your-github-client-id>
GITHUB_CLIENT_SECRET=<your-github-client-secret>
GITHUB_CALLBACK_URL=https://your-app.onrender.com/auth/github/callback

# Required - Client URLs
WEB_CLIENT_URL=https://your-frontend-url.com
ALLOWED_ORIGINS=https://your-frontend-url.com,https://your-app.onrender.com

# Optional - JWT Secrets (Render can auto-generate these)
JWT_ACCESS_SECRET=<random-32-char-string>
JWT_REFRESH_SECRET=<random-32-char-string>

# Required - Security
NODE_ENV=production
SECURE_COOKIES=true
ENABLE_FINGERPRINTING=true

# Optional - Cookie Domain (set if using custom domain)
COOKIE_DOMAIN=.yourdomain.com

# Optional - Mobile
MOBILE_DEEP_LINK_SCHEME=thearchitect://
```

**Generate JWT Secrets**:
```bash
# On your local machine:
openssl rand -base64 32
openssl rand -base64 32
```

### 3.2 Update GitHub OAuth Callback

Once deployed, Render will give you a URL like `https://your-app.onrender.com`

1. Go back to your GitHub OAuth App settings
2. Update the **Authorization callback URL** to:
   ```
   https://your-app.onrender.com/auth/github/callback
   ```
3. Update `GITHUB_CALLBACK_URL` in Render environment variables

### 3.3 Deploy

1. Click **"Create Web Service"** or **"Deploy"**
2. Wait for the build to complete (~3-5 minutes)
3. Check logs for:
   ```
   🔄 Running database migrations...
   ✅ Migrations completed
   🚀 Server listening on http://0.0.0.0:3000
   ```

---

## Step 4: Verify Deployment

### 4.1 Health Check

Visit: `https://your-app.onrender.com/health`

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-11-10T12:00:00.000Z",
  "environment": "production"
}
```

### 4.2 Test OAuth Flow

1. Visit: `https://your-app.onrender.com/auth/github?platform=web`
2. You should be redirected to GitHub for authorization
3. After authorizing, you should be redirected to your web client with cookies set

### 4.3 Check Logs

In Render dashboard:
1. Go to your service
2. Click **"Logs"**
3. Verify no errors

---

## Step 5: Configure CORS for Frontend

Update `ALLOWED_ORIGINS` in Render to include your frontend URLs:

```env
ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://your-app.onrender.com,https://www.yourdomain.com
```

Separate multiple origins with commas (no spaces).

---

## Monitoring & Maintenance

### Render Free Tier Limitations

- **Sleep after inactivity**: Spins down after 15 minutes of no requests
- **750 hours/month**: More than enough for 24/7 operation
- **Cold starts**: Takes ~30 seconds to wake up from sleep
- **Auto-redeploys**: On every git push to connected branch

### Database Migrations

- Migrations run automatically on every deployment
- Idempotent - safe to run multiple times
- Check logs for migration status

### Logs

View logs in Render dashboard:
```
🚀 Starting application...
🔄 Running database migrations...
✅ Migrations completed
🎯 Starting server...
🚀 Server listening on http://0.0.0.0:3000
```

### Manual Migration (if needed)

If you need to run migrations manually:

1. In Render dashboard, go to **Shell**
2. Run:
   ```bash
   cd /app
   node scripts/migrate.js
   ```

---

## Troubleshooting

### Database Connection Issues

**Problem**: Can't connect to Neon database

**Solutions**:
- Verify `DATABASE_URL` is correct (copy from Neon dashboard)
- Ensure connection string includes `?sslmode=require`
- Check Neon project is active (not suspended)
- Verify IP allowlist in Neon (default is open to all)

### OAuth Errors

**Problem**: GitHub OAuth fails

**Solutions**:
- Verify `GITHUB_CALLBACK_URL` matches GitHub app settings exactly
- Ensure URL includes `https://` (not `http://`)
- Check Client ID and Secret are correct
- Verify scopes include `user:email` and `read:user`

### CORS Errors

**Problem**: Frontend can't call API

**Solutions**:
- Add frontend URL to `ALLOWED_ORIGINS`
- Ensure no trailing slashes in URLs
- Verify `credentials: true` in frontend fetch requests
- Check browser console for specific CORS error

### Migration Failures

**Problem**: Migrations fail on deployment

**Solutions**:
- Check Neon database is accessible
- Verify connection string has correct permissions
- Check migration SQL syntax in `src/modules/shared/database/migrations/`
- View full error in Render logs

### Cold Start Issues

**Problem**: First request after sleep is slow

**Solutions**:
- This is expected on Render free tier
- Use a service like [Upptime](https://upptime.js.org/) to ping every 10 minutes
- Consider upgrading to paid plan for always-on service

---

## Scaling

### Moving from Free Tier

When you need to scale:

1. **Render**: Upgrade to **Starter** plan ($7/month)
   - No sleep
   - More resources
   - Faster builds

2. **Neon**: Upgrade to **Pro** plan (starts at $19/month)
   - More storage
   - Better performance
   - Longer history
   - Point-in-time recovery

### Performance Optimization

- **Connection Pooling**: Already configured with Neon HTTP
- **Caching**: Add Redis for session/token caching
- **CDN**: Use Cloudflare for static assets
- **Monitoring**: Add Sentry for error tracking

---

## Security Checklist

- [ ] JWT secrets are random and 32+ characters
- [ ] `SECURE_COOKIES=true` in production
- [ ] All URLs use HTTPS
- [ ] `ALLOWED_ORIGINS` is restricted to your domains
- [ ] GitHub OAuth app has correct callback URL
- [ ] Environment variables are never committed to git
- [ ] Database connection string is secure
- [ ] Rate limiting is enabled (default: 100 req/15min)

---

## Support

- **Render**: [Render Docs](https://render.com/docs)
- **Neon**: [Neon Docs](https://neon.tech/docs)
- **Fastify**: [Fastify Docs](https://fastify.dev/)
- **Drizzle**: [Drizzle ORM Docs](https://orm.drizzle.team/)

---

## Next Steps

1. Set up monitoring (e.g., [Upptime](https://upptime.js.org/))
2. Configure custom domain (optional)
3. Set up CI/CD for automated testing
4. Add error tracking (e.g., [Sentry](https://sentry.io/))
5. Configure backup strategy for database
