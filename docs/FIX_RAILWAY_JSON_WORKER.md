# Fix Railway.json for Worker Service

**Issue:** Worker Service is using API Dockerfile because `railway.json` points to `apps/api/Dockerfile`  
**Fix:** Create service-specific `railway.json` for worker or configure in Railway dashboard

---

## 🔧 Solution 1: Create Worker-Specific railway.json (Recommended)

Railway supports service-specific `railway.json` files. Create one in the worker directory:

**File:** `apps/worker/railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "apps/worker/Dockerfile"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Then in Railway Dashboard:**
1. **Worker Service** → **Settings**
2. **Set Root Directory** to: `apps/worker`
3. Railway will use `apps/worker/railway.json` automatically

---

## 🔧 Solution 2: Configure in Railway Dashboard (Alternative)

If Railway doesn't pick up the worker-specific railway.json:

1. **Railway Dashboard** → **Worker Service** → **Settings**
2. **Build section:**
   - **Dockerfile Path:** `apps/worker/Dockerfile`
   - (This overrides railway.json)
3. **Deploy section:**
   - **Start Command:** `node dist/index.js`
4. **Save**

---

## 🔧 Solution 3: Remove Root-Level railway.json

If Railway is applying the root `railway.json` to all services:

1. **Rename root `railway.json`** to `railway.api.json` (backup)
2. **Create `apps/api/railway.json`** with API config
3. **Create `apps/worker/railway.json`** with worker config
4. **Set Root Directory** in each service:
   - API Service: `apps/api`
   - Worker Service: `apps/worker`

---

## ✅ Verification

After fixing, Worker Service should:
- Use `apps/worker/Dockerfile`
- Build worker code (not API code)
- Logs show: `[Startup] Initializing worker...` (not API messages)

---

## 📋 Current Configuration

**Root `railway.json` (for API):**
```json
{
  "build": {
    "dockerfilePath": "apps/api/Dockerfile"
  }
}
```

**Worker `apps/worker/railway.json` (for Worker):**
```json
{
  "build": {
    "dockerfilePath": "apps/worker/Dockerfile"
  }
}
```

---

**Once Railway uses the correct Dockerfile, the Worker Service will run worker code!**

