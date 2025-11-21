# Fix Railway Buildpack Issue

**Error:** Railway is using a buildpack instead of Dockerfile

## Problem

Railway is trying to use a buildpack (showing "install apt packages", "install mise packages") instead of using the Dockerfile. This causes errors like:
```
ERROR: failed to build: failed to solve: lstat /.env.example: no such file or directory
```

## Solution

### Option 1: Configure Railway Service Settings (Recommended)

1. **Go to Railway Dashboard**
2. **Select your API Service**
3. **Go to Settings** → **Build**
4. **Set:**
   - **Builder:** `Dockerfile`
   - **Dockerfile Path:** `apps/api/Dockerfile`
   - **Root Directory:** Leave empty (or set to `/`)
5. **Save**

### Option 2: Verify railway.json

The `railway.json` file should be at the root of your repository:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "apps/api/Dockerfile"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Option 3: Force Dockerfile in Service Settings

If Railway still uses buildpack:

1. **Railway Dashboard** → **API Service** → **Settings**
2. **Scroll to "Build & Deploy"**
3. **Disable "Auto Deploy"** temporarily
4. **Change Builder** to **"Dockerfile"**
5. **Set Dockerfile Path:** `apps/api/Dockerfile`
6. **Enable "Auto Deploy"** again
7. **Redeploy**

## Verification

After fixing, Railway should show:
- ✅ Using Dockerfile builder
- ✅ Building with Docker
- ✅ No buildpack steps

Instead of:
- ❌ "install apt packages"
- ❌ "install mise packages"
- ❌ "copy /.env.example"

## If Still Not Working

1. **Delete and recreate the service:**
   - Railway → API Service → Settings → Delete
   - Create new service → Deploy from GitHub
   - Configure Dockerfile path immediately

2. **Check Railway service root directory:**
   - Settings → Build → Root Directory
   - Should be empty or `/`
   - Not `/apps/api` (that's the Dockerfile path, not root)

3. **Verify Dockerfile exists:**
   ```bash
   ls -la apps/api/Dockerfile
   ```

## Quick Fix Checklist

- [ ] Railway service uses Dockerfile builder (not buildpack)
- [ ] Dockerfile path is `apps/api/Dockerfile`
- [ ] Root directory is empty or `/`
- [ ] `railway.json` is at repository root
- [ ] Service redeployed after changes

---

**After fixing, Railway should build using Dockerfile and the API should start successfully!**

