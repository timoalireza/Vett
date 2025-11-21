# Railway Deployment Guide

Quick start guide for deploying Vett API and Worker to Railway.

## Prerequisites

- Railway account (https://railway.app)
- GitHub repository connected
- Supabase database ready
- Redis (Upstash) ready

## Quick Deploy

### 1. Deploy API Service

1. Go to Railway → New Project
2. Click **"Deploy from GitHub repo"**
3. Select your Vett repository
4. Railway will detect Dockerfile automatically
5. Click **"Deploy Now"**

### 2. Configure API Service

**Settings → Variables** - Add:

```bash
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://...  # From Supabase
REDIS_URL=redis://...           # From Upstash
CLERK_SECRET_KEY=sk_live_...
ALLOWED_ORIGINS=https://yourdomain.com
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
BRAVE_API_KEY=...
SERPER_API_KEY=...
```

**Settings → Service**:
- **Root Directory**: Leave empty
- **Dockerfile Path**: `apps/api/Dockerfile`
- **Start Command**: Leave empty (uses Dockerfile CMD)

### 3. Deploy Worker Service

1. In same Railway project, click **"New"**
2. Select **"GitHub Repo"** → Same repository
3. Or duplicate API service and modify:
   - **Service Name**: `vett-worker`
   - **Dockerfile Path**: `apps/worker/Dockerfile`
   - **Start Command**: `node dist/index.cjs`

**Settings → Variables** - Same as API (except `ALLOWED_ORIGINS`)

### 4. Generate Domain

1. API Service → **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Copy the domain (e.g., `vett-api-production.up.railway.app`)

### 5. Verify Deployment

```bash
# Health check
curl https://your-api-domain.railway.app/health

# Database check
curl https://your-api-domain.railway.app/ready
```

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `DATABASE_URL` | Supabase connection | `postgresql://...` |
| `REDIS_URL` | Redis connection | `redis://...` |
| `CLERK_SECRET_KEY` | Clerk auth key | `sk_live_...` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `4000` |
| `LOG_LEVEL` | Log level | `info` |
| `ALLOWED_ORIGINS` | CORS origins | `*` (dev) |
| `SENTRY_DSN` | Sentry DSN | - |

## Troubleshooting

### Service Won't Start

1. Check **Deployments** → **View Logs**
2. Verify environment variables are set
3. Check `DATABASE_URL` and `REDIS_URL` format

### Build Fails

1. Check Dockerfile path is correct
2. Verify `package.json` dependencies
3. Check build logs for errors

### Database Connection Fails

1. Verify Supabase project is active (not paused)
2. Check connection string uses port 6543 (pooling)
3. Verify password is correct

## Cost

Railway uses pay-as-you-go pricing:
- **Free**: $5 credit/month
- **Hobby**: ~$5-20/month for small apps
- Scales automatically

## Auto-Deploy

Railway auto-deploys on push to `main` branch.

To disable: Settings → Source → Auto Deploy → Off

---

**See `PRODUCTION_DEPLOYMENT.md` for complete guide.**

