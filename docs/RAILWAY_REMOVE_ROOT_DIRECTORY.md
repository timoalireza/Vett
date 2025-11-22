# Remove Root Directory from Railway Worker Service

**Critical:** Root Directory MUST be empty/removed for the worker Dockerfile to work!

---

## 🚨 Current Issue

The build is failing because Railway has Root Directory set to `apps/worker`. This changes the build context, causing COPY commands in the Dockerfile to fail.

---

## ✅ Fix: Remove Root Directory

### Step 1: Go to Railway Settings

1. **Railway Dashboard** → **Worker Service**
2. **Click "Settings" tab**
3. **Scroll to "Source" section**

### Step 2: Remove Root Directory

1. **Find "Root Directory" field**
2. **If it shows `apps/worker`, DELETE IT**
3. **Leave it EMPTY** (not set)
4. **Click "Save"**

### Step 3: Verify Dockerfile Path

1. **Still in Settings** → **Build section**
2. **Verify "Dockerfile Path"** is: `apps/worker/Dockerfile`
3. **If not, set it to:** `apps/worker/Dockerfile`
4. **Save**

### Step 4: Redeploy

Railway will automatically redeploy. Wait 2-3 minutes.

---

## 🔍 How to Verify Root Directory is Removed

**In Railway Settings:**
- **Root Directory field should be:** Empty/blank
- **NOT:** `apps/worker` or any value

**If you see "Add Root Directory" link:**
- That means it's already empty ✅
- Don't click it!

---

## 📋 Correct Configuration

**Root Directory:** (EMPTY - not set)

**Dockerfile Path:** `apps/worker/Dockerfile`

**Start Command:** `node dist/index.js`

**Build Context:** Repo root (automatic when Root Directory is empty)

---

## ✅ After Fixing

Build should succeed and show:
```
[builder 12/22] COPY apps/worker/package.json ./apps/worker/ ✅
[builder 21/22] RUN pnpm build ✅
[runner 5/12] COPY apps/worker/package.json ./apps/worker/ ✅
[runner 7/12] COPY --from=builder /app/apps/worker/dist ./dist ✅
```

Worker logs should show:
```
🚀 Worker process starting - calling startWorker()...
[Startup] Initializing worker...
[Startup] ✅ Database connection successful
[Startup] ✅ Worker ready and listening for jobs
```

---

**The Root Directory MUST be empty - that's the key fix!**

