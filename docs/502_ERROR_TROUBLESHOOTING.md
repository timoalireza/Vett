# 502 Error Troubleshooting Guide

**Error:** `502 Bad Gateway - Application failed to respond`  
**Meaning:** The Railway application is crashing during startup or not responding

---

## 🔍 Step 1: Check Railway Logs

**This is the most important step!**

1. Go to **Railway Dashboard** → **API Service** → **Logs** tab
2. Look for error messages at the bottom of the logs
3. Common error patterns to look for:

### Error Pattern 1: Environment Variable Validation Failed
```
❌ Invalid environment configuration: { DATABASE_URL: [ 'Required' ] }
```
**Fix:** Add missing environment variables in Railway → Variables

### Error Pattern 2: Database Connection Failed
```
Error: getaddrinfo ENOTFOUND db.xxx.supabase.co
```
**Fix:** Check `DATABASE_URL` is correct and Supabase project is active

### Error Pattern 3: Redis Connection Failed
```
Error: connect ECONNREFUSED
```
**Fix:** Check `REDIS_URL` is correct and Redis database is active

### Error Pattern 4: Application Crash
```
Failed to start server: [error message]
```
**Fix:** See error message for specific issue

---

## 🔧 Step 2: Verify Environment Variables

**Railway Dashboard** → **API Service** → **Variables** tab

### Required Variables:

#### 1. `DATABASE_URL` ✅ CRITICAL
- **Must be set:** Yes
- **Format:** `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
- **Port:** Must be `6543` (Transaction Pooler)
- **Where to get:** Supabase Dashboard → Settings → Database → Connection Pooling → Transaction Pooler → URI

**Common Issues:**
- ❌ Missing → Add variable
- ❌ Empty string → Delete and re-add
- ❌ Wrong port (5432 instead of 6543) → Use Transaction Pooler URL
- ❌ Wrong format → Use URI format from Supabase

#### 2. `REDIS_URL` ✅ CRITICAL
- **Must be set:** Yes
- **Format:** `redis://default:[PASSWORD]@[HOSTNAME]:6379` or `rediss://default:[PASSWORD]@[HOSTNAME]:6379`
- **Where to get:** Upstash Dashboard → Your Redis Database → REST API → Redis URL

**Common Issues:**
- ❌ Missing → Add variable
- ❌ Empty string → Delete and re-add
- ❌ Using REST API URL instead of Redis URL → Use Redis URL

#### 3. `CLERK_SECRET_KEY` ✅ CRITICAL
- **Must be set:** Yes
- **Format:** `sk_test_...` or `sk_live_...`
- **Where to get:** Clerk Dashboard → API Keys → Secret Key

**Common Issues:**
- ❌ Missing → Add variable
- ❌ Empty string → Delete and re-add

---

## 🔍 Step 3: Check Railway Logs for Debug Output

Look for this debug output in Railway logs:

```
🔍 Environment check (production):
  NODE_ENV: production
  PORT: 8080
  DATABASE_URL: ✅ Set / ⚠️ Empty string / ❌ Missing
  REDIS_URL: ✅ Set / ⚠️ Empty string / ❌ Missing
  CLERK_SECRET_KEY: ✅ Set / ⚠️ Empty string / ❌ Missing
```

### What Each Status Means:

- **✅ Set:** Variable exists and has a value (good!)
- **⚠️ Empty string:** Variable exists but is empty (delete and re-add)
- **❌ Missing:** Variable doesn't exist (add it)

---

## 🛠️ Step 4: Common Fixes

### Fix 1: Missing Environment Variables

1. **Railway Dashboard** → **API Service** → **Variables**
2. Click **+ New Variable**
3. Add each missing variable:
   - Name: `DATABASE_URL`
   - Value: Your Supabase connection string
4. Repeat for `REDIS_URL` and `CLERK_SECRET_KEY`
5. Railway will auto-redeploy

### Fix 2: Empty String Variables

1. **Railway Dashboard** → **API Service** → **Variables**
2. Find the variable showing "⚠️ Empty string"
3. Click **Delete** (trash icon)
4. Click **+ New Variable**
5. Re-add with correct value
6. Railway will auto-redeploy

### Fix 3: Wrong Variable Scope

**Problem:** Variables set at Project level instead of Service level

**Fix:**
1. Make sure you're in the **API Service** (not Project)
2. Variables must be in **API Service** → **Variables** tab
3. Move variables from Project to Service level if needed

### Fix 4: Supabase Project Paused

**Problem:** Free tier Supabase projects pause after inactivity

**Fix:**
1. Go to Supabase Dashboard
2. Check if project shows "Paused"
3. Click **Restore** or **Resume**
4. Wait 1-2 minutes for database to come online
5. Railway will retry connection automatically

### Fix 5: Invalid Connection String Format

**Problem:** Connection string has wrong format or typos

**Fix:**
1. Copy connection string directly from Supabase/Upstash dashboard
2. Don't modify it manually
3. Paste entire string into Railway variable
4. Check for extra spaces or newlines

---

## 🧪 Step 5: Test After Fixing

After fixing environment variables, wait for Railway to redeploy (1-2 minutes), then test:

```bash
# Test health endpoint
curl https://vett-api-production.up.railway.app/health

# Expected: {"status":"ok",...}
```

If still getting 502:
1. Check Railway logs again for new errors
2. Verify all three required variables are set correctly
3. Check Supabase/Upstash dashboards to ensure services are active

---

## 📋 Quick Checklist

- [ ] Checked Railway logs for error messages
- [ ] Verified `DATABASE_URL` is set and correct (port 6543)
- [ ] Verified `REDIS_URL` is set and correct
- [ ] Verified `CLERK_SECRET_KEY` is set and correct
- [ ] Variables are set at Service level (not Project level)
- [ ] Supabase project is active (not paused)
- [ ] Upstash Redis database is active
- [ ] Waited for Railway to redeploy after changes
- [ ] Tested `/health` endpoint after redeploy

---

## 🆘 Still Not Working?

If you've checked everything above and still getting 502:

1. **Check Railway Build Logs:**
   - Railway Dashboard → API Service → Deployments
   - Click on latest deployment
   - Check "Build Logs" tab for build errors

2. **Check Railway Runtime Logs:**
   - Railway Dashboard → API Service → Logs
   - Look for any error messages
   - Check if application is crashing immediately

3. **Verify Dockerfile:**
   - Make sure Dockerfile is correct
   - Check if build is completing successfully

4. **Contact Railway Support:**
   - If logs show no errors but app won't start
   - Railway Support: https://railway.app/help

---

## 📚 Related Documentation

- **Environment Variables:** `docs/RAILWAY_ENV_VARIABLES.md`
- **Environment Verification:** `docs/RAILWAY_ENV_VERIFICATION.md`
- **Database Setup:** `docs/GET_SUPABASE_CONNECTION_STRING.md`
- **Next Steps:** `docs/NEXT_STEPS_CHECKLIST.md`

---

**Most Common Cause:** Missing or incorrect `DATABASE_URL` environment variable. Check Railway logs first!

