# Railway Setup - Step by Step

## Prerequisites

- [x] Supabase database ready ✅
- [x] Connection string obtained ✅
- [ ] Railway account created
- [ ] GitHub repository connected

---

## Step 1: Create Railway Account

1. Go to https://railway.app
2. Click **"Start a New Project"** or **"Login"**
3. Sign up with **GitHub** (recommended for easy repo connection)
4. Authorize Railway to access your GitHub repositories

---

## Step 2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Find and select your **Vett** repository
4. Click **"Deploy Now"**

Railway will automatically detect your Dockerfile and start building.

---

## Step 3: Configure API Service

### 3.1 Service Settings

1. Railway will create a service automatically
2. Click on the service to open settings
3. Go to **Settings** tab
4. Configure:

**Service Name:**
- Change to: `vett-api` (optional, for clarity)

**Root Directory:**
- Leave empty (default)

**Dockerfile Path:**
- Set to: `apps/api/Dockerfile`

**Start Command:**
- Leave empty (uses Dockerfile CMD)

**Port:**
- Railway auto-detects port 4000 from Dockerfile

### 3.2 Add Environment Variables

Go to **Variables** tab and add:

```bash
# Environment
NODE_ENV=production
PORT=4000
LOG_LEVEL=info

# Database (Supabase)
DATABASE_URL=postgresql://postgres.rqliizpjhxiiulrckzgu:oEP4JtGshGqDuiU6@aws-1-eu-west-1.pooler.supabase.com:5432/postgres

# Redis (will add after Step 4)
REDIS_URL=redis://...  # Add after Redis setup

# Authentication
CLERK_SECRET_KEY=sk_live_...  # Your Clerk secret key

# CORS
ALLOWED_ORIGINS=https://yourdomain.com  # Optional, leave empty for now

# External APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
BRAVE_API_KEY=...
SERPER_API_KEY=...

# Optional: Sentry
SENTRY_DSN=https://...
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

**How to add:**
1. Click **"New Variable"**
2. Enter **Name** (e.g., `DATABASE_URL`)
3. Enter **Value** (your connection string)
4. Click **"Add"**
5. Repeat for each variable

### 3.3 Generate Domain

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Copy the domain (e.g., `vett-api-production.up.railway.app`)
4. **Save this!** You'll need it for mobile app configuration

---

## Step 4: Deploy Worker Service

### 4.1 Create Worker Service

1. In same Railway project, click **"New"**
2. Select **"GitHub Repo"**
3. Select same **Vett** repository
4. Click **"Add Service"**

### 4.2 Configure Worker Settings

Go to **Settings**:

**Service Name:**
- Change to: `vett-worker`

**Root Directory:**
- Leave empty

**Dockerfile Path:**
- Set to: `apps/worker/Dockerfile`

**Start Command:**
- Leave empty (uses Dockerfile CMD)

### 4.3 Add Worker Environment Variables

Go to **Variables** tab and add:

```bash
# Environment
NODE_ENV=production
LOG_LEVEL=info

# Database (same as API)
DATABASE_URL=postgresql://postgres.rqliizpjhxiiulrckzgu:oEP4JtGshGqDuiU6@aws-1-eu-west-1.pooler.supabase.com:5432/postgres

# Redis (same as API)
REDIS_URL=redis://...  # Add after Redis setup

# External APIs (same as API)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
BRAVE_API_KEY=...
SERPER_API_KEY=...

# Optional: Sentry
SENTRY_DSN=https://...
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

**Note:** Worker doesn't need:
- `PORT` (not a web server)
- `ALLOWED_ORIGINS` (no CORS needed)

---

## Step 5: Set Up Redis (Upstash)

### Option A: Upstash (Recommended)

1. Go to https://upstash.com
2. Sign up (free tier available)
3. Click **"Create Database"**
4. Fill in:
   - **Name**: `vett-production`
   - **Type**: Regional
   - **Region**: Choose same as Supabase (eu-west-1)
   - **Plan**: Free tier (10K commands/day)
5. Click **"Create"**
6. Copy **Redis URL** (format: `redis://default:[PASSWORD]@[HOST]:[PORT]`)

### Option B: Railway Redis

1. In Railway project → **"New"**
2. Select **"Database"** → **"Add Redis"**
3. Railway will create Redis instance
4. Copy connection string from **Variables** tab

### Add Redis URL to Both Services

1. **API Service** → Variables → Add `REDIS_URL`
2. **Worker Service** → Variables → Add `REDIS_URL`

---

## Step 6: Verify Deployment

### 6.1 Check Build Status

1. Go to **Deployments** tab in each service
2. Wait for build to complete (green checkmark)
3. Check logs for any errors

### 6.2 Test Health Endpoints

```bash
# Replace with your Railway domain
curl https://vett-api-production.up.railway.app/health
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

```bash
curl https://vett-api-production.up.railway.app/ready
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

### 6.3 Test GraphQL

```bash
curl -X POST https://vett-api-production.up.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

---

## Step 7: Configure Auto-Deploy

Railway auto-deploys on push to `main` branch by default.

**To verify:**
1. Settings → Source
2. Check **"Auto Deploy"** is enabled
3. Branch should be `main`

**To disable:**
- Toggle **"Auto Deploy"** off

---

## Troubleshooting

### Build Fails

**Check:**
- Dockerfile path is correct (`apps/api/Dockerfile`)
- All dependencies in `package.json`
- Build logs for specific errors

### Service Won't Start

**Check:**
- All environment variables are set
- `DATABASE_URL` format is correct
- `REDIS_URL` format is correct
- Check logs in **Deployments** tab

### Database Connection Fails

**Check:**
- Supabase project is active (not paused)
- Connection string is correct
- Password doesn't have special characters that need encoding

### Redis Connection Fails

**Check:**
- Redis URL format is correct
- Upstash database is active
- Password/token is correct

---

## Environment Variables Checklist

### API Service ✅
- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` (Supabase)
- [ ] `REDIS_URL` (Upstash/Railway)
- [ ] `CLERK_SECRET_KEY`
- [ ] `OPENAI_API_KEY`
- [ ] `ANTHROPIC_API_KEY`
- [ ] `BRAVE_API_KEY`
- [ ] `SERPER_API_KEY`

### Worker Service ✅
- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` (same as API)
- [ ] `REDIS_URL` (same as API)
- [ ] `OPENAI_API_KEY`
- [ ] `ANTHROPIC_API_KEY`
- [ ] `BRAVE_API_KEY`
- [ ] `SERPER_API_KEY`

---

## Next Steps

1. ✅ Railway configured
2. ✅ Services deployed
3. ✅ Health checks passing
4. [ ] Update mobile app API URL
5. [ ] Set up custom domain (optional)
6. [ ] Configure monitoring/alerts

---

**Need Help?**
- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway

