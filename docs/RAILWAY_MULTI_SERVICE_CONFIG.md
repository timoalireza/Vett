# Railway Multi-Service Configuration

**How Railway.json works for multiple services:**

Railway uses **service-specific** `railway.json` files. Each service can have its own configuration.

---

## 📁 File Structure

```
/
├── railway.json              # Default/API service config
└── apps/
    ├── api/
    │   └── Dockerfile
    └── worker/
        ├── railway.json      # Worker service config
        └── Dockerfile
```

---

## 🔧 Configuration Files

### Root `railway.json` (API Service)

**Used when:** Root Directory is NOT set (or empty)

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

### `apps/worker/railway.json` (Worker Service)

**Used when:** Root Directory is set to `apps/worker`

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

---

## ⚙️ Railway Service Settings

### API Service Configuration

**Railway Dashboard** → **API Service** → **Settings:**

- **Root Directory:** (EMPTY - not set)
- **Dockerfile Path:** `apps/api/Dockerfile` (from root railway.json)
- **Start Command:** `node dist/index.js` (from root railway.json)

### Worker Service Configuration

**Railway Dashboard** → **Worker Service** → **Settings:**

- **Root Directory:** `apps/worker` ⚠️ **BUT THIS CAUSES BUILD ISSUES**
- **Dockerfile Path:** `apps/worker/Dockerfile` (from apps/worker/railway.json)
- **Start Command:** `node dist/index.js` (from apps/worker/railway.json)

---

## ⚠️ Important Note About Root Directory

**Problem:** Setting Root Directory to `apps/worker` causes build failures because the Dockerfile expects repo root as build context.

**Solution:** 
- **DO NOT set Root Directory** for Worker Service
- Instead, manually set **Dockerfile Path** to `apps/worker/Dockerfile` in Railway settings
- Railway will use root `railway.json` but with the correct Dockerfile path

---

## ✅ Recommended Configuration

### API Service:
- **Root Directory:** (EMPTY)
- **Dockerfile Path:** `apps/api/Dockerfile` (auto-detected from root railway.json)
- Uses: Root `railway.json`

### Worker Service:
- **Root Directory:** (EMPTY) ⚠️ **Must be empty!**
- **Dockerfile Path:** `apps/worker/Dockerfile` (manually set in Railway)
- **Start Command:** `node dist/index.js` (manually set in Railway)
- Railway will use root `railway.json` but override Dockerfile path

---

## 🔄 Alternative: Service-Specific railway.json

If Railway supports it, you can:

1. **Keep Root Directory empty** for both services
2. **Set Dockerfile Path** manually in Railway for each service:
   - API: `apps/api/Dockerfile`
   - Worker: `apps/worker/Dockerfile`
3. Railway will use root `railway.json` for both, but with different Dockerfiles

---

**The key is: Root Directory must be EMPTY for the Dockerfiles to work correctly!**

