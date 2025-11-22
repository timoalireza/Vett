# Complete Railway Setup Guide - API & Worker Services

**Step-by-step instructions to configure both services correctly in Railway.**

---

## 🎯 Goal

Configure two separate Railway services:
- **API Service** → Runs API code (`apps/api/Dockerfile`)
- **Worker Service** → Runs Worker code (`apps/worker/Dockerfile`)

---

## 📋 Prerequisites

- Two separate services created in Railway:
  - One named "API" or "API Service"
  - One named "Worker" or "Worker Service"
- Both connected to the same GitHub repository

---

## 🔧 Step 1: Configure API Service

### 1.1 Go to API Service Settings

1. **Railway Dashboard** → **Your Project**
2. **Click on "API Service"** (or your API service name)
3. **Click "Settings" tab**

### 1.2 Configure Build Settings

**In "Source" section:**
- **Root Directory:** (EMPTY - leave blank, don't set anything)
- **Branch:** `main` (or your default branch)

**In "Build" section:**
- **Dockerfile Path:** `apps/api/Dockerfile`
  - If you see "The value is set in railway.json", that's fine - it's using root `railway.json`
  - Verify it shows `apps/api/Dockerfile`

### 1.3 Configure Deploy Settings

**In "Deploy" section:**
- **Start Command:** `node dist/index.js`
  - Or leave empty if railway.json handles it

### 1.4 Set Environment Variables

**In "Variables" tab:**
- `DATABASE_URL` - Supabase connection string (Transaction Pooler)
- `REDIS_URL` - Upstash Redis URL
- `CLERK_SECRET_KEY` - Clerk secret key
- `PORT` - `8080` (or Railway will auto-assign)
- `NODE_ENV` - `production`

### 1.5 Save

Click **"Save"** or changes auto-save.

---

## 🔧 Step 2: Configure Worker Service

### 2.1 Go to Worker Service Settings

1. **Railway Dashboard** → **Your Project**
2. **Click on "Worker Service"** (or your worker service name)
3. **Click "Settings" tab**

### 2.2 Configure Build Settings

**In "Source" section:**
- **Root Directory:** (EMPTY - **CRITICAL: Must be empty!**)
  - If it's set to `apps/worker`, **DELETE IT**
  - Leave it blank/unset
- **Branch:** `main` (or your default branch)

**In "Build" section:**
- **Dockerfile Path:** `apps/worker/Dockerfile`
  - **Manually set this** - don't rely on auto-detection
  - Click "Edit" or the field and enter: `apps/worker/Dockerfile`

### 2.3 Configure Deploy Settings

**In "Deploy" section:**
- **Start Command:** `node dist/index.js`
  - **Manually set this** - enter: `node dist/index.js`

### 2.4 Set Environment Variables

**In "Variables" tab:**
- `DATABASE_URL` - **Same as API Service** (Supabase connection string)
- `REDIS_URL` - **Same as API Service** (Upstash Redis URL)
- `OPENAI_API_KEY` - Your OpenAI API key
- `NODE_ENV` - `production`
- (Optional) Other API keys (Brave, Serper, etc.)

### 2.5 Save

Click **"Save"** or changes auto-save.

---

## ✅ Verification Checklist

### API Service:
- [ ] Root Directory is **EMPTY** (not set)
- [ ] Dockerfile Path is `apps/api/Dockerfile`
- [ ] Start Command is `node dist/index.js` (or empty)
- [ ] Environment variables are set (DATABASE_URL, REDIS_URL, CLERK_SECRET_KEY)
- [ ] Service is deployed and running

### Worker Service:
- [ ] Root Directory is **EMPTY** (not set) ⚠️ **CRITICAL**
- [ ] Dockerfile Path is `apps/worker/Dockerfile` (manually set)
- [ ] Start Command is `node dist/index.js` (manually set)
- [ ] Environment variables are set (DATABASE_URL, REDIS_URL, OPENAI_API_KEY)
- [ ] Service is deployed and running

---

## 🚀 After Configuration

### 1. Wait for Deployment

Railway will automatically redeploy both services. Wait 2-3 minutes.

### 2. Check API Service Logs

**Railway Dashboard** → **API Service** → **Logs**

Should show:
```
[Startup] Initializing server on port 8080...
✅ Clerk client initialized
Server listening at http://0.0.0.0:8080
🚀 Vett API ready at http://localhost:8080/graphql
```

### 3. Check Worker Service Logs

**Railway Dashboard** → **Worker Service** → **Logs**

Should show:
```
🚀 Worker process starting - calling startWorker()...
🔍 [WORKER] startWorker() function called
[Startup] Initializing worker...
[Startup] ✅ Database connection successful
[Startup] ✅ Redis connection successful
[Startup] ✅ Worker ready and listening for jobs
```

**NOT:**
- ❌ "Initializing server on port 8080"
- ❌ "Clerk client initialized"
- ❌ "Vett API ready"

---

## 🐛 Troubleshooting

### Issue: Worker Service shows API logs

**Symptom:** Worker logs show "Initializing server" instead of "Initializing worker"

**Fix:**
1. Verify Root Directory is **EMPTY** (not `apps/worker`)
2. Verify Dockerfile Path is `apps/worker/Dockerfile` (manually set)
3. Redeploy Worker Service

### Issue: Build fails with "package.json not found"

**Symptom:** Build error: `"/apps/worker/package.json": not found`

**Fix:**
1. **Remove Root Directory** - it MUST be empty
2. Set Dockerfile Path manually to `apps/worker/Dockerfile`
3. Redeploy

### Issue: Worker not processing jobs

**Symptom:** Analysis stuck on "QUEUED" status

**Fix:**
1. Check Worker logs for startup messages
2. Verify DATABASE_URL and REDIS_URL are set correctly
3. Verify Worker logs show "Worker ready and listening for jobs"
4. Check for database connection errors

---

## 📋 Quick Reference

### API Service Settings:
```
Root Directory: (empty)
Dockerfile Path: apps/api/Dockerfile
Start Command: node dist/index.js
```

### Worker Service Settings:
```
Root Directory: (empty) ⚠️ MUST BE EMPTY
Dockerfile Path: apps/worker/Dockerfile (manually set)
Start Command: node dist/index.js (manually set)
```

---

## 🎉 Success Indicators

**API Service:**
- ✅ Logs show API startup messages
- ✅ `/health` endpoint returns 200
- ✅ `/ready` endpoint shows database and Redis connected
- ✅ GraphQL endpoint works

**Worker Service:**
- ✅ Logs show worker startup messages (not API messages)
- ✅ Logs show "Worker ready and listening for jobs"
- ✅ Jobs are processed when submitted
- ✅ Analysis status changes from QUEUED → PROCESSING → COMPLETED

---

**Follow these steps exactly, and both services will be configured correctly!**

