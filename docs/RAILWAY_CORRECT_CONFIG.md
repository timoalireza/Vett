# Correct Railway Configuration (When You Can't Edit Build Settings)

**Since Railway reads from `railway.json` and you can't override in UI, here's the correct setup:**

---

## ✅ Solution: Use Root Directory + Relative Dockerfile Path

Railway supports using Root Directory while still building from repo root if you use the correct Dockerfile path format.

---

## 🔧 Configuration

### API Service:

**Railway Settings:**
- **Root Directory:** (EMPTY - leave blank)
- Railway uses: Root `railway.json` → `apps/api/Dockerfile`

**Root `railway.json`:**
```json
{
  "build": {
    "dockerfilePath": "apps/api/Dockerfile"
  }
}
```

### Worker Service:

**Railway Settings:**
- **Root Directory:** `apps/worker`
- Railway uses: `apps/worker/railway.json` → `../apps/worker/Dockerfile`

**`apps/worker/railway.json`:**
```json
{
  "build": {
    "dockerfilePath": "../apps/worker/Dockerfile"
  }
}
```

**Key:** The Dockerfile path `../apps/worker/Dockerfile` tells Railway:
- Build context: Repo root (because path goes up with `..`)
- Dockerfile location: `apps/worker/Dockerfile` (relative to repo root)

---

## 📋 Step-by-Step Setup

### 1. API Service Configuration

1. **Railway Dashboard** → **API Service** → **Settings**
2. **Source section:**
   - **Root Directory:** (EMPTY - leave blank)
3. Railway automatically uses root `railway.json`

### 2. Worker Service Configuration

1. **Railway Dashboard** → **Worker Service** → **Settings**
2. **Source section:**
   - **Root Directory:** `apps/worker`
3. Railway automatically uses `apps/worker/railway.json`
4. The `railway.json` has `dockerfilePath: "../apps/worker/Dockerfile"` which tells Railway to build from repo root

### 3. Verify railway.json Files

**Root `railway.json`:**
- Points to `apps/api/Dockerfile` ✅

**`apps/worker/railway.json`:**
- Points to `../apps/worker/Dockerfile` ✅
- The `..` makes Railway use repo root as build context

---

## ✅ How It Works

**When Root Directory = `apps/worker`:**
- Railway looks for `apps/worker/railway.json`
- Reads `dockerfilePath: "../apps/worker/Dockerfile"`
- The `..` tells Railway: "go up one level (to repo root) and use that as build context"
- Then finds `apps/worker/Dockerfile` relative to repo root
- Build context = repo root ✅
- Dockerfile finds all files correctly ✅

---

## 🎯 Final Configuration

### API Service:
```
Root Directory: (empty)
Uses: Root railway.json → apps/api/Dockerfile
Build Context: Repo root ✅
```

### Worker Service:
```
Root Directory: apps/worker
Uses: apps/worker/railway.json → ../apps/worker/Dockerfile
Build Context: Repo root ✅ (because of .. in path)
```

---

**This configuration allows Railway to use service-specific railway.json files while still building from repo root!**

