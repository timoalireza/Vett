# Final Railway Configuration Solution

**Problem:** Railway reads from `railway.json` and you can't override in UI. Worker Service uses API Dockerfile.

**Solution:** Use Root Directory + relative Dockerfile path that goes back to repo root.

---

## ✅ Correct Configuration

### API Service:
- **Root Directory:** (EMPTY)
- Uses: Root `railway.json` → `apps/api/Dockerfile` ✅

### Worker Service:
- **Root Directory:** `apps/worker` ⚠️ **MUST BE SET**
- Uses: `apps/worker/railway.json` → `../apps/worker/Dockerfile` ✅
- The `../` tells Railway to go up one level (to repo root) for build context

---

## 📝 Configuration Files

### Root `railway.json` (for API):
```json
{
  "build": {
    "dockerfilePath": "apps/api/Dockerfile"
  }
}
```

### `apps/worker/railway.json` (for Worker):
```json
{
  "build": {
    "dockerfilePath": "../apps/worker/Dockerfile"
  }
}
```

**Key:** The `../` prefix tells Railway:
- Build context: Repo root (go up from `apps/worker`)
- Dockerfile: `apps/worker/Dockerfile` (relative to repo root)

---

## 🔧 Step-by-Step Setup

### 1. Set Root Directory for Worker Service

1. **Railway Dashboard** → **Worker Service** → **Settings**
2. **Source section:**
3. **Root Directory:** Set to `apps/worker`
4. **Save**

### 2. Verify railway.json Files

- Root `railway.json`: `apps/api/Dockerfile` ✅
- `apps/worker/railway.json`: `../apps/worker/Dockerfile` ✅

### 3. Check Build Settings

After setting Root Directory, Railway should show:
- **Dockerfile:** `../apps/worker/Dockerfile` or `apps/worker/Dockerfile`
- **Message:** "The value is set in railway.json" (pointing to `apps/worker/railway.json`)

---

## ✅ How It Works

**When Root Directory = `apps/worker`:**
1. Railway looks for `apps/worker/railway.json` ✅
2. Reads `dockerfilePath: "../apps/worker/Dockerfile"` ✅
3. The `..` tells Railway: "build context = repo root" ✅
4. Finds `apps/worker/Dockerfile` relative to repo root ✅
5. Build context = repo root ✅
6. Dockerfile finds all files correctly ✅

---

## 🎯 Summary

**API Service:**
- Root Directory: (empty)
- Uses: Root `railway.json` → `apps/api/Dockerfile`

**Worker Service:**
- Root Directory: `apps/worker` ⚠️ **MUST BE SET**
- Uses: `apps/worker/railway.json` → `../apps/worker/Dockerfile`
- Build context: Repo root (because of `..` in path)

---

**Set Root Directory to `apps/worker` and Railway will use the correct configuration!**

