# Fix Railway Worker Dockerfile Build Error

**Error:** `"/apps/worker/package.json": not found`  
**Cause:** Root Directory is set to `apps/worker`, but Dockerfile expects repo root context

---

## 🔧 Solution: Don't Use Root Directory

The worker Dockerfile is designed to build from the **repo root**, not from `apps/worker`. 

### Option 1: Remove Root Directory (Recommended)

1. **Railway Dashboard** → **Worker Service** → **Settings**
2. **Find "Root Directory"** (if set)
3. **Remove/Delete it** (leave empty)
4. **Set Dockerfile Path** to: `apps/worker/Dockerfile`
5. **Save**

Railway will then:
- Build from repo root
- Use `apps/worker/Dockerfile`
- Build context is correct

### Option 2: Use Railway Build Settings

1. **Railway Dashboard** → **Worker Service** → **Settings**
2. **Find "Build" section**
3. **Set Dockerfile Path:** `apps/worker/Dockerfile`
4. **Leave Root Directory empty**
5. **Save**

---

## ✅ Verification

After fixing, Railway build should show:
```
[internal] load build definition from Dockerfile
[builder 12/22] COPY apps/worker/package.json ./apps/worker/
[builder 21/22] RUN pnpm build
```

**NOT:**
```
ERROR: "/apps/worker/package.json": not found
```

---

## 📋 Correct Configuration

**Root Directory:** (empty/not set)

**Dockerfile Path:** `apps/worker/Dockerfile`

**Build Context:** Repo root (automatic)

---

**Once Root Directory is removed and Dockerfile path is set correctly, the build will succeed!**

