# Production Deployment Guide

## Overview

This guide covers deploying Vett to production using:
- **Supabase** - PostgreSQL database hosting
- **Railway/Render** - API and Worker service hosting
- **Upstash** - Redis hosting (or Railway Redis)

---

## 🎯 Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Mobile    │────▶│     API     │────▶│  Supabase   │
│    App      │     │  (Railway)  │     │  Database   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐     ┌─────────────┐
                    │   Worker    │────▶│    Redis   │
                    │  (Railway)  │     │  (Upstash)  │
                    └─────────────┘     └─────────────┘
```

---

## 📋 Prerequisites

- [x] Supabase project created (Pro plan recommended)
- [ ] Railway/Render account
- [ ] Upstash account (or Railway Redis)
- [ ] Domain name (optional, Railway/Render provide free subdomains)
- [ ] All API keys ready (OpenAI, Anthropic, Brave, Serper, Clerk)

---

## Step 1: Supabase Database Setup

### 1.1 Create Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in:
   - **Name**: Vett Production
   - **Database Password**: Generate strong password (save it!)
   - **Region**: Choose closest to your users
   - **Plan**: **Pro Plan ($25/month)** recommended for production

### 1.2 Get Connection String

1. Go to **Settings** → **Database**
2. Copy **Connection string** → **URI**:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   **Note**: Use port **6543** (Connection Pooling) for better performance

### 1.3 Run Migrations

1. Connect to Supabase SQL Editor
2. Copy contents of `scripts/run-migrations-to-supabase.sql`
3. Paste and execute in SQL Editor
4. Verify tables created:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' ORDER BY table_name;
   ```

---

## Step 2: Redis Setup (Upstash)

### 2.1 Create Upstash Account

1. Go to https://upstash.com
2. Sign up (free tier available)
3. Create a new Redis database:
   - **Name**: vett-production
   - **Type**: Regional (choose same region as Supabase)
   - **Plan**: Free tier sufficient for start

### 2.2 Get Redis URL

1. Copy the **UPSTASH_REDIS_REST_URL** (for REST API)
2. Copy the **UPSTASH_REDIS_REST_TOKEN** (for REST API)
3. Or use the **Redis URL** format:
   ```
   redis://default:[PASSWORD]@[HOST]:[PORT]
   ```

**Note**: Upstash uses REST API by default. For `ioredis`, use the Redis URL format.

---

## Step 3: Railway Setup (Recommended)

### 3.1 Create Railway Account

1. Go to https://railway.app
2. Sign up with GitHub
3. Create a new project: "Vett Production"

### 3.2 Deploy API Service

1. Click **"New"** → **"GitHub Repo"**
2. Select your Vett repository
3. Click **"Deploy Now"**
4. Railway will detect the Dockerfile automatically

### 3.3 Configure API Service

1. Click on the API service
2. Go to **Settings** → **Variables**
3. Add environment variables (see Step 4)

### 3.4 Configure Service Settings

1. **Service Name**: `vett-api`
2. **Root Directory**: Leave empty (monorepo root)
3. **Dockerfile Path**: `apps/api/Dockerfile`
4. **Port**: `4000` (Railway auto-detects)

### 3.5 Deploy Worker Service

1. Click **"New"** → **"GitHub Repo"** (same repo)
2. Or duplicate the API service
3. Update settings:
   - **Service Name**: `vett-worker`
   - **Dockerfile Path**: `apps/worker/Dockerfile`
   - **Start Command**: Override to `node dist/index.cjs`

---

## Step 4: Environment Variables

### 4.1 API Service Variables

Add these in Railway → API Service → Variables:

```bash
# Environment
NODE_ENV=production
PORT=4000
LOG_LEVEL=info

# Database (Supabase)
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# Redis (Upstash)
REDIS_URL=redis://default:[PASSWORD]@[HOST]:[PORT]

# Authentication
CLERK_SECRET_KEY=sk_live_...

# CORS (comma-separated)
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# External APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
BRAVE_API_KEY=...
SERPER_API_KEY=...

# Optional
SENTRY_DSN=https://...
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### 4.2 Worker Service Variables

Same as API, but you can omit:
- `ALLOWED_ORIGINS`
- `PORT` (not needed for worker)

---

## Step 5: Domain Setup (Optional)

### 5.1 Custom Domain

1. In Railway → API Service → Settings → Networking
2. Click **"Generate Domain"** (free `.railway.app` domain)
3. Or add custom domain:
   - Click **"Custom Domain"**
   - Add your domain (e.g., `api.yourdomain.com`)
   - Update DNS records as instructed

### 5.2 SSL Certificate

Railway automatically provisions SSL certificates via Let's Encrypt.

---

## Step 6: Verify Deployment

### 6.1 Check API Health

```bash
curl https://your-api-domain.railway.app/health
```

Should return:
```json
{
  "status": "ok",
  "checks": {
    "clerk": true
  }
}
```

### 6.2 Check Database Connection

```bash
curl https://your-api-domain.railway.app/ready
```

Should return:
```json
{
  "status": "ready",
  "checks": {
    "database": true,
    "redis": true
  }
}
```

### 6.3 Test GraphQL Endpoint

```bash
curl -X POST https://your-api-domain.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

---

## Step 7: Mobile App Configuration

### 7.1 Update API URL

In `apps/mobile/src/api/graphql.ts`:

```typescript
const API_URL = __DEV__
  ? 'http://localhost:4000/graphql'
  : 'https://your-api-domain.railway.app/graphql';
```

### 7.2 Build Production App

```bash
cd apps/mobile
eas build --platform ios --profile production
eas build --platform android --profile production
```

---

## Step 8: Monitoring & Alerts

### 8.1 Railway Metrics

Railway provides built-in metrics:
- CPU usage
- Memory usage
- Request logs
- Error tracking

### 8.2 Sentry Integration

Already configured! Just add `SENTRY_DSN` to environment variables.

### 8.3 Set Up Alerts

1. Railway → Service → Settings → Notifications
2. Configure email/Slack alerts for:
   - Service crashes
   - High error rates
   - Resource limits

---

## Step 9: CI/CD Setup

### 9.1 GitHub Actions

The deployment workflow (`.github/workflows/deploy.yml`) is ready. To enable:

1. Add Railway API token to GitHub Secrets:
   - Go to Railway → Account → Tokens
   - Create new token
   - Add to GitHub: `Settings → Secrets → RAILWAY_TOKEN`

2. Update `.github/workflows/deploy.yml` with Railway deployment commands

### 9.2 Auto-Deploy

Railway auto-deploys on push to `main` branch by default.

---

## 🔧 Troubleshooting

### Database Connection Issues

**Error**: `getaddrinfo ENOTFOUND`

**Solution**:
- Verify `DATABASE_URL` uses correct hostname
- Check Supabase project is not paused
- Use Connection Pooling URL (port 6543)

### Redis Connection Issues

**Error**: `ECONNREFUSED`

**Solution**:
- Verify `REDIS_URL` format
- Check Upstash database is active
- Ensure correct password/token

### Build Failures

**Error**: `Docker build failed`

**Solution**:
- Check Dockerfile paths are correct
- Verify all dependencies in `package.json`
- Check build logs in Railway

### Service Not Starting

**Error**: `Service crashed`

**Solution**:
- Check environment variables are set
- Verify `DATABASE_URL` and `REDIS_URL` are correct
- Check logs: Railway → Service → Deployments → View Logs

---

## 📊 Cost Estimation

### Monthly Costs (Starting)

- **Supabase Pro**: $25/month
- **Railway**: ~$5-20/month (pay-as-you-go)
- **Upstash**: Free tier (up to 10K commands/day)
- **Domain**: $10-15/year (optional)

**Total**: ~$30-45/month

### Scaling Costs

- Railway scales automatically (pay per usage)
- Upstash scales with usage
- Supabase Pro includes 8GB database

---

## ✅ Production Checklist

- [ ] Supabase database created and migrations run
- [ ] Redis database created (Upstash)
- [ ] API service deployed on Railway
- [ ] Worker service deployed on Railway
- [ ] All environment variables configured
- [ ] Domain configured (optional)
- [ ] SSL certificate active
- [ ] Health endpoints responding
- [ ] Database connection verified
- [ ] Redis connection verified
- [ ] Mobile app API URL updated
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] CI/CD pipeline working

---

## 🚀 Next Steps

1. **Load Testing**: Test API with realistic traffic
2. **Security Audit**: Review security headers, rate limits
3. **Backup Strategy**: Set up Supabase backups
4. **Documentation**: Update API docs for production
5. **Legal**: Privacy Policy, Terms of Service

---

**Need Help?** Check:
- Railway Docs: https://docs.railway.app
- Supabase Docs: https://supabase.com/docs
- Upstash Docs: https://docs.upstash.com

