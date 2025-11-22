# Force Railway to Use Worker railway.json

**Issue:** Railway Worker Service is reading root `railway.json` (API config) instead of `apps/worker/railway.json`

**Solution:** Railway only uses service-specific `railway.json` when Root Directory is set correctly.

---

## 🔍 Why This Happens

Railway reads `railway.json` files in this order:
1. **If Root Directory is set:** Looks for `railway.json` in that directory
2. **If Root Directory is empty:** Uses root `railway.json`

**Current Problem:**
- Worker Service Root Directory might not be set to `apps/worker`
- So Railway uses root `railway.json` → `apps/api/Dockerfile` ❌

---

## ✅ Fix: Set Root Directory Correctly

### Step 1: Set Root Directory for Worker Service

1. **Railway Dashboard** → **Worker Service** → **Settings**
2. **Source section:**
3. **Root Directory:** Set to `apps/worker`
4. **Save**

### Step 2: Verify railway.json Files

**Root `railway.json`** (for API - should stay as is):
```json
{
  "build": {
    "dockerfilePath": "apps/api/Dockerfile"
  }
}
```

**`apps/worker/railway.json`** (for Worker - should exist):
```json
{
  "build": {
    "dockerfilePath": "Dockerfile"
  }
}
```

**Important:** When Root Directory is `apps/worker`, the Dockerfile path in `apps/worker/railway.json` should be `Dockerfile` (not `apps/worker/Dockerfile`) because it's relative to the Root Directory.

---

## 🔧 Alternative: Use Absolute Path from Repo Root

If Railway supports it, try using an absolute path from repo root:

**`apps/worker/railway.json`:**
```json
{
  "build": {
    "dockerfilePath": "/apps/worker/Dockerfile"
  }
}
```

Or:
```json
{
  "build": {
    "dockerfilePath": "../../apps/worker/Dockerfile"
  }
}
```

---

## 🎯 Correct Configuration

### API Service:
- **Root Directory:** (EMPTY)
- Uses: Root `railway.json` → `apps/api/Dockerfile` ✅

### Worker Service:
- **Root Directory:** `apps/worker` ⚠️ **MUST BE SET**
- Uses: `apps/worker/railway.json` → `Dockerfile` ✅
- Build context: `apps/worker` (but Dockerfile needs repo root...)

---

## ⚠️ The Build Context Problem

When Root Directory = `apps/worker`:
- Railway uses `apps/worker/railway.json` ✅
- But build context = `apps/worker` ❌
- Dockerfile expects repo root as context ❌

**Solution:** We need to either:
1. Fix Dockerfile to work with `apps/worker` as context (use `Dockerfile.railway`)
2. Or find a way to tell Railway to use repo root as build context

---

**Set Root Directory to `apps/worker` and update `apps/worker/railway.json` to use `Dockerfile.railway` which handles the build context correctly.**

