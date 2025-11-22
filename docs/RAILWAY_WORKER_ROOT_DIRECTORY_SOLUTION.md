# Railway Worker Service - Root Directory Solution

**The correct configuration for Railway Worker Service:**

---

## ✅ Solution: Root Directory MUST Be Empty

Railway's Dockerfile paths in `railway.json` are **always relative to repo root**, not to Root Directory.

**This means:**
- Root Directory doesn't change where Dockerfile paths are resolved from
- Root Directory only changes which `railway.json` file Railway uses
- Dockerfile paths are always relative to repo root

---

## 🔧 Correct Configuration

### Worker Service Settings:

1. **Railway Dashboard** → **Worker Service** → **Settings**
2. **Source section:**
   - **Root Directory:** (EMPTY - **must be empty!**)
3. **Build section:**
   - Railway will read from root `railway.json` → `apps/api/Dockerfile` ❌
   - **BUT:** You need to manually override this in Railway UI
   - **OR:** Use Railway environment variable `RAILWAY_DOCKERFILE_PATH`

---

## 🔧 Option 1: Use Environment Variable (Recommended)

Railway supports `RAILWAY_DOCKERFILE_PATH` environment variable to override Dockerfile path.

### Set Environment Variable:

1. **Railway Dashboard** → **Worker Service** → **Variables**
2. **Add variable:**
   - **Name:** `RAILWAY_DOCKERFILE_PATH`
   - **Value:** `apps/worker/Dockerfile`
3. **Save**

Railway will use this environment variable instead of `railway.json`.

---

## 🔧 Option 2: Try Manual Override in UI

Even if Railway says "set in railway.json", try to edit:

1. **Worker Service** → **Settings** → **Build**
2. **Click on Dockerfile field**
3. **Try to edit** - some Railway versions allow override
4. **Set to:** `apps/worker/Dockerfile`
5. **Save**

---

## 🔧 Option 3: Create Separate railway.json for Worker

If Railway supports it, create a worker-specific config:

**Keep Root Directory empty**, but Railway might detect service-specific configs differently.

---

## ✅ Recommended: Use Environment Variable

**Worker Service Variables:**
- `RAILWAY_DOCKERFILE_PATH` = `apps/worker/Dockerfile`
- `DATABASE_URL` = (your database URL)
- `REDIS_URL` = (your Redis URL)
- `OPENAI_API_KEY` = (your OpenAI key)
- `NODE_ENV` = `production`

**Root Directory:** (EMPTY)

This way:
- Railway uses root `railway.json` for other settings
- But `RAILWAY_DOCKERFILE_PATH` overrides the Dockerfile path
- Build context = repo root ✅
- Uses correct Dockerfile ✅

---

**Try setting `RAILWAY_DOCKERFILE_PATH` environment variable - that should override the railway.json Dockerfile path!**

