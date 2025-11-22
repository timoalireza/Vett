# Set Root Directory for Worker Service

**Critical:** Railway only uses `apps/worker/railway.json` when Root Directory is set to `apps/worker`.

---

## ✅ Solution: Set Root Directory

### Step 1: Set Root Directory in Railway

1. **Railway Dashboard** → **Worker Service** → **Settings**
2. **Source section:**
3. **Find "Root Directory"** field
4. **Set it to:** `apps/worker`
5. **Save**

### Step 2: Verify railway.json is Used

After setting Root Directory to `apps/worker`:
- Railway will look for `apps/worker/railway.json`
- It will find: `dockerfilePath: "Dockerfile.railway"`
- It will use `apps/worker/Dockerfile.railway` ✅

### Step 3: Check Build Settings

**Railway Dashboard** → **Worker Service** → **Settings** → **Build**

Should now show:
- **Dockerfile:** `Dockerfile.railway` (or `apps/worker/Dockerfile.railway`)
- **Message:** "The value is set in railway.json" (should point to `apps/worker/railway.json`)

---

## ⚠️ Important Notes

**Root Directory MUST be set to `apps/worker`** for Railway to:
- Use `apps/worker/railway.json` instead of root `railway.json`
- Use `Dockerfile.railway` which is designed for this setup

**Without Root Directory set:**
- Railway uses root `railway.json` → `apps/api/Dockerfile` ❌
- Worker Service runs API code ❌

**With Root Directory = `apps/worker`:**
- Railway uses `apps/worker/railway.json` → `Dockerfile.railway` ✅
- Worker Service runs worker code ✅

---

## 🔧 Current Configuration Files

**Root `railway.json`** (for API):
```json
{
  "build": {
    "dockerfilePath": "apps/api/Dockerfile"
  }
}
```

**`apps/worker/railway.json`** (for Worker):
```json
{
  "build": {
    "dockerfilePath": "Dockerfile.railway"
  }
}
```

---

## ✅ After Setting Root Directory

1. Railway will redeploy automatically
2. Check Worker Service logs
3. Should see: `[Startup] Initializing worker...` (not API messages)

---

**Set Root Directory to `apps/worker` in Railway Worker Service Settings - that's the key!**

