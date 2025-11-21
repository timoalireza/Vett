# Quick Start: Production Deployment

**Time to deploy:** ~30 minutes

## Step-by-Step Guide

### 1. Supabase Database (5 min)

1. Go to https://app.supabase.com → New Project
2. Choose **Pro Plan** ($25/month)
3. Copy Connection String (port 6543)
4. Run migrations in SQL Editor (copy from `scripts/run-migrations-to-supabase.sql`)

### 2. Redis Setup (5 min)

**Option A: Upstash (Recommended)**
1. Go to https://upstash.com → Sign up
2. Create Redis database
3. Copy Redis URL

**Option B: Railway Redis**
1. In Railway project → New → Redis
2. Copy connection string

### 3. Railway Deployment (15 min)

**Deploy API:**
1. Go to https://railway.app → New Project
2. Deploy from GitHub → Select Vett repo
3. Set Dockerfile path: `apps/api/Dockerfile`
4. Add environment variables (see `apps/api/env.production.example`)
5. Generate domain

**Deploy Worker:**
1. Same project → New → GitHub Repo (same repo)
2. Set Dockerfile path: `apps/worker/Dockerfile`
3. Add environment variables (see `apps/worker/env.production.example`)

### 4. Verify (5 min)

```bash
# Health check
curl https://your-api.railway.app/health

# Database check
curl https://your-api.railway.app/ready
```

### 5. Update Mobile App

In `apps/mobile/src/api/graphql.ts`:
```typescript
const API_URL = __DEV__
  ? 'http://localhost:4000/graphql'
  : 'https://your-api.railway.app/graphql';
```

---

## Environment Variables Checklist

### API Service (Railway)
- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` (Supabase)
- [ ] `REDIS_URL` (Upstash/Railway)
- [ ] `CLERK_SECRET_KEY`
- [ ] `ALLOWED_ORIGINS`
- [ ] `OPENAI_API_KEY`
- [ ] `ANTHROPIC_API_KEY`
- [ ] `BRAVE_API_KEY`
- [ ] `SERPER_API_KEY`

### Worker Service (Railway)
- [ ] Same as API (except `ALLOWED_ORIGINS`)

---

## Cost Estimate

- **Supabase Pro**: $25/month
- **Railway**: ~$5-20/month
- **Upstash**: Free tier (10K commands/day)
- **Total**: ~$30-45/month

---

## Troubleshooting

**Database connection fails?**
- Check Supabase project is active (not paused)
- Verify connection string uses port 6543
- Check password is correct

**Service won't start?**
- Check Railway logs
- Verify all environment variables are set
- Check `DATABASE_URL` and `REDIS_URL` format

**Build fails?**
- Verify Dockerfile path is correct
- Check `package.json` dependencies

---

**Full guide:** See `PRODUCTION_DEPLOYMENT.md`
