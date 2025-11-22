# Final Fix: Railway Worker Service Configuration

**Issue:** Build fails with `"/apps/worker/package.json": not found`  
**Root Cause:** Root Directory changes build context, but Dockerfile expects repo root

---

## ✅ Correct Configuration

**DO NOT set Root Directory** - leave it empty!

**Instead, configure Dockerfile path directly:**

1. **Railway Dashboard** → **Worker Service** → **Settings**
2. **Build section:**
   - **Root Directory:** (EMPTY - not set)
   - **Dockerfile Path:** `apps/worker/Dockerfile`
3. **Deploy section:**
   - **Start Command:** `node dist/index.js`
4. **Save**

---

## 🔍 Why This Works

**With Root Directory = `apps/worker`:**
- Build context = `apps/worker` directory
- Dockerfile looks for `apps/worker/apps/worker/package.json` ❌
- Files not found

**With Root Directory = EMPTY:**
- Build context = repo root ✅
- Dockerfile finds `apps/worker/package.json` ✅
- Everything works

---

## 📋 Step-by-Step

1. **Go to Railway Dashboard** → **Worker Service** → **Settings**
2. **Find "Root Directory"** (if set to `apps/worker`)
3. **Delete/Remove it** (leave empty)
4. **Find "Dockerfile Path"** in Build section
5. **Set to:** `apps/worker/Dockerfile`
6. **Verify Start Command:** `node dist/index.js`
7. **Save**

Railway will:
- Build from repo root (correct context)
- Use `apps/worker/Dockerfile` (correct file)
- Find all files correctly

---

## ✅ Verification

After fixing, build should succeed and show:
```
[builder 12/22] COPY apps/worker/package.json ./apps/worker/
[builder 21/22] RUN pnpm build
[runner 7/12] COPY --from=builder /app/apps/worker/dist ./dist
```

Then Worker logs should show:
```
🚀 Worker process starting - calling startWorker()...
[Startup] Initializing worker...
[Startup] ✅ Database connection successful
[Startup] ✅ Worker ready and listening for jobs
```

---

**Remove Root Directory and set Dockerfile Path directly - that's the fix!**

