# Railway.json Only Configuration (Can't Edit in UI)

**Issue:** Railway reads build settings from `railway.json` and you can't override them in the UI.

**Solution:** Use Root Directory to make Railway use service-specific `railway.json` files, but fix the Dockerfile to work with Root Directory set.

---

## 🔧 Configuration Strategy

Since Railway reads from `railway.json` and you can't edit build settings in UI:

1. **API Service:** Root Directory = EMPTY → Uses root `railway.json`
2. **Worker Service:** Root Directory = `apps/worker` → Uses `apps/worker/railway.json`
3. **Fix Worker Dockerfile:** Make it work when Root Directory is `apps/worker`

---

## 📝 Step 1: Verify railway.json Files

### Root `railway.json` (for API):
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "apps/api/Dockerfile"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### `apps/worker/railway.json` (for Worker):
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Note:** When Root Directory is `apps/worker`, the Dockerfile path is relative to that directory, so it's just `Dockerfile`, not `apps/worker/Dockerfile`.

---

## 🔧 Step 2: Configure Railway Services

### API Service:
1. **Settings** → **Source**
2. **Root Directory:** (EMPTY - leave blank)
3. Railway uses: Root `railway.json` → `apps/api/Dockerfile`

### Worker Service:
1. **Settings** → **Source**
2. **Root Directory:** `apps/worker`
3. Railway uses: `apps/worker/railway.json` → `Dockerfile` (relative to apps/worker)

---

## ⚠️ Problem: Dockerfile Build Context

When Root Directory is `apps/worker`, the build context becomes `apps/worker`, so Dockerfile COPY commands fail.

**Solution:** Create a Railway-specific Dockerfile that works with Root Directory set.

---

## 🔧 Step 3: Create Railway-Compatible Worker Dockerfile

We need to modify the worker Dockerfile to work when build context is `apps/worker`.

**Option A:** Create `apps/worker/Dockerfile.railway` that uses relative paths
**Option B:** Modify existing Dockerfile to detect build context

Let's go with Option A - create a Railway-specific Dockerfile.

---

## ✅ Summary

**Since you can't edit build settings in Railway UI:**

1. **API Service:** Root Directory = EMPTY → Uses root `railway.json`
2. **Worker Service:** Root Directory = `apps/worker` → Uses `apps/worker/railway.json`
3. **Fix:** Create Railway-compatible Dockerfile for worker that works with Root Directory set

---

**Next step: Create a Railway-compatible worker Dockerfile that works when Root Directory is `apps/worker`.**

