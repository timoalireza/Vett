# Fix: Worker Service Running API Code Instead of Worker Code

**Issue:** Worker Service logs show API startup messages instead of worker startup  
**Symptom:** Logs show "Initializing server on port 8080" and "Clerk initialized"  
**Cause:** Railway is using the wrong Dockerfile or entry point

---

## 🔍 Diagnosis

**Worker logs should show:**
```
🚀 Worker process starting - calling startWorker()...
[Startup] Initializing worker...
[Startup] ✅ Database connection successful
[Startup] ✅ Worker ready and listening for jobs
```

**But you're seeing:**
```
[Startup] Initializing server on port 8080...
✅ Clerk client initialized
Server listening at http://0.0.0.0:8080
🚀 Vett API ready at http://localhost:8080/graphql
```

This means Railway is running API code, not worker code.

---

## 🔧 Fix Steps

### Step 1: Verify Dockerfile Path in Railway

1. **Railway Dashboard** → **Worker Service** → **Settings**
2. **Find "Build" section**
3. **Check "Dockerfile Path":**
   - Should be: `apps/worker/Dockerfile`
   - NOT: `apps/api/Dockerfile` or empty

### Step 2: Verify Root Directory

1. **Same Settings page**
2. **Check "Root Directory":**
   - Should be: **EMPTY** (not set)
   - NOT: `apps/worker` or `apps/api`

### Step 3: Verify Start Command

1. **Same Settings page**
2. **Check "Start Command":**
   - Should be: `node dist/index.js`
   - Or leave empty (uses Dockerfile CMD)

### Step 4: Check Which Service You're Looking At

**IMPORTANT:** Make sure you're checking the **Worker Service**, not the API Service!

1. **Railway Dashboard** → **Your Project**
2. **Verify you have TWO separate services:**
   - **API Service** (should show API logs)
   - **Worker Service** (should show worker logs)
3. **Click on "Worker Service"** (not API Service)
4. **Check logs**

### Step 5: Force Redeploy

1. **Worker Service** → **Settings**
2. **Click "Redeploy"** or **"Deploy Latest"**
3. **Wait 2-3 minutes**
4. **Check logs again**

---

## 🐛 Common Issues

### Issue 1: Wrong Dockerfile Path

**Symptom:** Worker Service uses API Dockerfile

**Fix:**
- Set Dockerfile Path to: `apps/worker/Dockerfile`
- Verify it's not pointing to `apps/api/Dockerfile`

### Issue 2: Both Services Using Same Source

**Symptom:** Worker and API services are identical

**Fix:**
- Ensure Worker Service has its own source configuration
- Worker Service should use `apps/worker/Dockerfile`
- API Service should use `apps/api/Dockerfile`

### Issue 3: Railway Auto-Detection Wrong

**Symptom:** Railway auto-detected wrong Dockerfile

**Fix:**
- Manually set Dockerfile Path in Worker Service settings
- Don't rely on auto-detection

---

## ✅ Verification

After fixing, Worker Service logs should show:

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

## 📋 Checklist

- [ ] Worker Service exists separately from API Service
- [ ] Worker Service Dockerfile Path is `apps/worker/Dockerfile`
- [ ] Worker Service Root Directory is EMPTY (not set)
- [ ] Worker Service Start Command is `node dist/index.js` (or empty)
- [ ] Worker Service has been redeployed
- [ ] Worker logs show worker startup messages (not API messages)

---

## 🆘 Still Seeing API Code?

If Worker Service still shows API logs after fixing:

1. **Delete and recreate Worker Service:**
   - Railway Dashboard → Worker Service → Settings → Delete
   - Create new service
   - Connect to same repo
   - Set Dockerfile Path: `apps/worker/Dockerfile`
   - Set environment variables (DATABASE_URL, REDIS_URL, etc.)

2. **Check Railway project structure:**
   - Ensure Worker Service is a separate service
   - Not a duplicate of API Service

3. **Verify git repository:**
   - Ensure `apps/worker/Dockerfile` exists in repo
   - Ensure `apps/worker/src/index.ts` exists

---

**Once Worker Service runs the correct code, it will process jobs and the "Analyzing..." screen will work!**

