# Railway Worker Service Root Directory Configuration

**Issue:** Worker Service is running API code instead of worker code  
**Fix:** Set Root Directory to `apps/worker` in Railway

---

## 🔧 Step-by-Step Fix

### Step 1: Open Worker Service Settings

1. **Railway Dashboard** → **Your Project**
2. **Click on "Worker Service"** (not API Service)
3. **Click "Settings" tab**

### Step 2: Set Root Directory

1. **Find "Source Repo" section**
2. **Click "Add Root Directory"** (or edit if already set)
3. **Enter:** `apps/worker`
4. **Click "Save"** or confirm

### Step 3: Verify Configuration

**Root Directory should be:**
```
apps/worker
```

**NOT:**
- Empty (root of repo)
- `apps/api`
- `.` (current directory)

### Step 4: Redeploy

1. **Railway will automatically redeploy** after saving
2. **Wait 2-3 minutes** for deployment
3. **Check Worker Service logs**

---

## ✅ What to Look For After Fix

**Worker logs should show:**
```
🚀 Worker process starting - calling startWorker()...
🔍 [WORKER] startWorker() function called
[Startup] Initializing worker...
[Startup] ✅ Database connection successful
[Startup] ✅ Worker ready and listening for jobs
```

**NOT:**
```
[Startup] Initializing server on port 8080...
✅ Clerk client initialized
Server listening at http://0.0.0.0:8080
```

---

## 🐛 Why This Matters

Without Root Directory set:
- Railway builds from repo root
- May build API code instead of worker code
- Worker Service runs wrong code
- Jobs never get processed

With Root Directory set to `apps/worker`:
- Railway knows to build worker code
- Uses `apps/worker/Dockerfile`
- Runs `apps/worker/dist/index.js`
- Worker processes jobs correctly

---

## 📋 Verification Checklist

- [ ] Root Directory is set to `apps/worker`
- [ ] Worker Service redeployed successfully
- [ ] Worker logs show `[Startup] Initializing worker...`
- [ ] Worker logs show `✅ Worker ready and listening for jobs`
- [ ] No API startup messages in worker logs
- [ ] Worker processes jobs when submitted

---

**Once Root Directory is set correctly, the worker will run the correct code and process jobs!**

