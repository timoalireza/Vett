# 502 Error - Complete Troubleshooting Guide

**Error:** `502 Bad Gateway` - Application failed to respond

## 🔍 Step 1: Check Railway Logs

**This is the most important step!**

1. **Railway Dashboard** → **API Service**
2. Click **"Deployments"** tab
3. Click **"View Logs"** on the **latest deployment**
4. **Scroll to the bottom** (most recent logs)
5. **Look for:**
   - ✅ Success: `"Vett API ready at http://localhost:4000/graphql"`
   - ❌ Errors: Any error messages, stack traces, or crashes

---

## 🚨 Common Issues & Fixes

### Issue 1: REDIS_URL Invalid

**Error in logs:**
```
❌ Invalid environment configuration: { REDIS_URL: [ 'Invalid url' ] }
```

**Fix:**
1. Railway → API Service → Settings → Variables
2. Check `REDIS_URL` format:
   - ✅ `redis://default:password@host:port`
   - ✅ `rediss://default:password@host:port` (SSL)
   - ✅ `https://endpoint.upstash.io` (Upstash REST)
   - ❌ Missing protocol or invalid format

**Upstash Format:**
```
https://your-endpoint.upstash.io
```

### Issue 2: DATABASE_URL Invalid

**Error in logs:**
```
❌ Invalid environment configuration: { DATABASE_URL: [ 'Invalid url' ] }
```

**Fix:**
1. Railway → API Service → Settings → Variables
2. Check `DATABASE_URL` format:
   - ✅ `postgresql://user:password@host:port/database`
   - ✅ Should use **Connection Pooling URL** from Supabase (port 6543)
   - ❌ Missing protocol or invalid format

**Supabase Format:**
```
postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
```

### Issue 3: Missing Environment Variables

**Error in logs:**
```
❌ Invalid environment configuration: { CLERK_SECRET_KEY: [ 'Required' ] }
```

**Fix:**
1. Railway → API Service → Settings → Variables
2. **Verify all required variables are set:**
   - `NODE_ENV=production`
   - `DATABASE_URL=postgresql://...`
   - `REDIS_URL=redis://...` or `https://...`
   - `CLERK_SECRET_KEY=sk_live_...`
   - `PORT=4000` (optional, defaults to 4000)

### Issue 4: Module Not Found

**Error in logs:**
```
Error: Cannot find module '/app/dist/index.js'
```

**Fix:** Already fixed in latest commit - ensure Railway has latest code deployed.

### Issue 5: Service Crashes Immediately

**Error in logs:**
```
Error: ...
at Module._load ...
```

**Fix:**
- Check for any runtime errors in logs
- Verify all dependencies are installed
- Check for missing files

---

## ✅ Verification Checklist

### Environment Variables

Check Railway → API Service → Settings → Variables:

- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` is set and valid (starts with `postgresql://`)
- [ ] `REDIS_URL` is set and valid (starts with `redis://`, `rediss://`, `http://`, or `https://`)
- [ ] `CLERK_SECRET_KEY` is set (starts with `sk_live_` or `sk_test_`)
- [ ] `PORT=4000` (optional)

### Service Status

Check Railway → API Service:

- [ ] Service shows as **"Active"** (green)
- [ ] Latest deployment shows **"Success"**
- [ ] No error indicators

### Logs

Check Railway → API Service → Deployments → View Logs:

- [ ] No error messages
- [ ] See "Vett API ready" message
- [ ] No crashes or exceptions

---

## 🔧 Quick Fixes

### Fix 1: Redeploy Service

1. Railway → API Service → Deployments
2. Click **"Redeploy"** on latest deployment
3. Wait 2-3 minutes
4. Check logs again

### Fix 2: Verify Environment Variables

1. Railway → API Service → Settings → Variables
2. **Check each variable:**
   - No typos
   - No extra spaces
   - Correct format
3. **Save** (Railway auto-redeploys)

### Fix 3: Check Service Settings

1. Railway → API Service → Settings → Build
2. **Verify:**
   - Builder: `Dockerfile`
   - Dockerfile Path: `apps/api/Dockerfile`
   - Root Directory: Empty or `/`

---

## 🧪 Test After Fix

```bash
# 1. Health check
curl https://vett-api-production.up.railway.app/health

# Expected: {"status":"ok","timestamp":"...","uptime":...}

# 2. Database check
curl https://vett-api-production.up.railway.app/ready

# Expected: {"status":"ready","database":"connected","redis":"connected"}

# 3. GraphQL test
curl -X POST https://vett-api-production.up.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'

# Expected: {"data":{"__typename":"Query"}}
```

---

## 📞 Still Not Working?

**Share these details:**

1. **Latest logs** from Railway (last 20-30 lines)
2. **Environment variables** (mask sensitive values):
   - `DATABASE_URL` format (first 20 chars)
   - `REDIS_URL` format (first 20 chars)
   - `CLERK_SECRET_KEY` prefix (`sk_live_` or `sk_test_`)
3. **Service status** (Active/Inactive)
4. **Deployment status** (Success/Failed)

---

## 🎯 Most Likely Issues

Based on previous errors, check:

1. **REDIS_URL format** - Most common issue
2. **DATABASE_URL format** - Second most common
3. **Missing environment variables** - Check all required vars are set
4. **Service not starting** - Check logs for startup errors

---

**Next Step:** Check Railway logs and share what you see!

