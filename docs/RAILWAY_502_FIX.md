# Fixing Railway 502 Error

**Domain:** `vett-api-production.up.railway.app`
**Error:** `502 - Application failed to respond`

## 🔍 What This Means

A 502 error means Railway can't reach your application. Common causes:

1. **Service isn't running** - Application crashed or failed to start
2. **Port mismatch** - Application listening on wrong port
3. **Build failed** - Docker build or deployment failed
4. **Environment variables missing** - Required env vars not set

---

## ✅ Quick Fixes

### 1. Check Railway Logs

**Steps:**
1. Go to Railway Dashboard → API Service
2. Click **"Deployments"** tab
3. Click **"View Logs"** on latest deployment
4. Look for errors or crash messages

**Common Issues:**
- `Error: Cannot find module '...'` → Missing dependency
- `Error: listen EADDRINUSE` → Port conflict
- `Error: Invalid environment configuration` → Missing env var
- `Error: Database connection failed` → Wrong DATABASE_URL

### 2. Verify Environment Variables

**Required Variables:**
```
NODE_ENV=production
DATABASE_URL=postgresql://...  # From Supabase
REDIS_URL=redis://...         # From Upstash
CLERK_SECRET_KEY=sk_live_...
PORT=4000
```

**Check:**
- Railway → API Service → Settings → Variables
- Verify all required variables are set
- Check for typos or extra spaces

### 3. Check Service Status

**Steps:**
1. Railway Dashboard → API Service
2. Look at **"Status"** indicator:
   - 🟢 **Active** = Running
   - 🔴 **Inactive** = Not running
   - 🟡 **Deploying** = Building

**If Inactive:**
- Click **"Deploy"** or **"Redeploy"**
- Check logs for errors

### 4. Verify Port Configuration

**Check:**
- Railway → API Service → Settings → Variables
- Ensure `PORT=4000` is set
- Or Railway will auto-assign (check service settings)

**In Code:**
- Verify `apps/api/src/index.ts` uses `env.PORT` or defaults to 4000

### 5. Check Dockerfile

**Verify:**
- Dockerfile path is correct: `apps/api/Dockerfile`
- Dockerfile builds successfully
- CMD is correct: `["node", "dist/index.js"]`

---

## 🔧 Step-by-Step Troubleshooting

### Step 1: Check Latest Deployment

1. Railway → API Service → Deployments
2. Check **latest deployment status**:
   - ✅ **Success** = Build succeeded
   - ❌ **Failed** = Build failed (check logs)
   - ⏳ **Building** = Still building

### Step 2: View Logs

1. Click **"View Logs"** on latest deployment
2. Scroll to bottom (most recent logs)
3. Look for:
   - Startup messages
   - Error messages
   - Crash stack traces

### Step 3: Common Error Patterns

**Pattern 1: Module Not Found**
```
Error: Cannot find module '@sentry/node'
```
**Fix:** Check Dockerfile installs all dependencies

**Pattern 2: Database Connection**
```
Error: getaddrinfo ENOTFOUND db.xxx.supabase.co
```
**Fix:** Verify `DATABASE_URL` is correct, Supabase project is active

**Pattern 3: Port Already in Use**
```
Error: listen EADDRINUSE :::4000
```
**Fix:** Remove `PORT` variable or set to different port

**Pattern 4: Environment Validation**
```
Invalid environment configuration: { DATABASE_URL: [ 'Invalid url' ] }
```
**Fix:** Check `DATABASE_URL` format is correct

### Step 4: Redeploy

**If logs show errors:**
1. Fix the issue (env vars, code, etc.)
2. Push to GitHub (if auto-deploy enabled)
3. Or manually redeploy: Railway → Deployments → Redeploy

---

## 🚨 Emergency Fixes

### Quick Redeploy

1. Railway → API Service → Deployments
2. Click **"Redeploy"** on latest deployment
3. Wait 2-3 minutes for rebuild

### Reset Environment Variables

1. Railway → API Service → Settings → Variables
2. Verify all required variables are present
3. Check for typos or formatting issues
4. Save → Auto-redeploys

### Check Service Health

1. Railway → API Service → Metrics
2. Check:
   - CPU usage
   - Memory usage
   - Network traffic
3. If all zero → Service isn't running

---

## ✅ Verification Steps

After fixing, verify:

```bash
# 1. Health check
curl https://vett-api-production.up.railway.app/health

# Expected: {"status":"ok",...}

# 2. GraphQL
curl -X POST https://vett-api-production.up.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'

# Expected: {"data":{"__typename":"Query"}}
```

---

## 📋 Checklist

- [ ] Checked Railway logs
- [ ] Verified environment variables
- [ ] Checked service status
- [ ] Verified port configuration
- [ ] Checked Dockerfile path
- [ ] Redeployed service
- [ ] Tested endpoints

---

## 🆘 Still Not Working?

1. **Check Railway Status:** https://status.railway.app
2. **Review Documentation:** https://docs.railway.app/troubleshooting
3. **Check GitHub:** Verify latest code is pushed
4. **Contact Support:** Railway Dashboard → Help → Support

---

**Next:** Once API is responding, update CORS settings!

