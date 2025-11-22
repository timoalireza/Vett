# Next Steps Checklist - Production Deployment

**Current Status:** Railway is redeploying after recent fixes  
**Last Updated:** 2025-11-21

---

## 🎯 Immediate Actions (Do Now)

### Step 1: Verify Railway Deployment Completed ✅

1. **Check Railway Dashboard:**
   - Go to https://railway.app
   - Navigate to your API service
   - Check **Deployments** tab
   - Verify latest deployment shows "✅ Active" (green checkmark)
   - Wait 2-3 minutes if deployment is still in progress

2. **Test API is Responding:**
   ```bash
   curl https://vett-api-production.up.railway.app/health
   ```
   **Expected:** `{"status":"ok",...}`

---

### Step 2: Verify Environment Variables in Railway 🔑

**Critical:** These must be set correctly for database and Redis to work.

#### For API Service:

1. **Railway Dashboard** → **API Service** → **Variables** tab

2. **Required Variables:**
   - [ ] `DATABASE_URL` - Supabase Transaction Pooler URL (port 6543)
   - [ ] `REDIS_URL` - Upstash Redis URL
   - [ ] `CLERK_SECRET_KEY` - Clerk secret key (should already be set ✅)

3. **Verify DATABASE_URL:**
   - Should start with `postgresql://`
   - Should contain `pooler.supabase.com`
   - Should use port `6543` (Transaction Pooler)
   - Format: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
   - **Where to get:** Supabase Dashboard → Settings → Database → Connection Pooling → Transaction Pooler → URI

4. **Verify REDIS_URL:**
   - Should start with `redis://` or `rediss://`
   - Should contain `upstash.io` (if using Upstash)
   - Format: `redis://default:[PASSWORD]@[HOSTNAME]:6379`
   - **Where to get:** Upstash Dashboard → Your Redis Database → REST API → Redis URL

5. **Check Variable Scope:**
   - Variables must be set at **Service level** (not Project level)
   - Ensure you're in the **API** service, not the Worker service

---

### Step 3: Test Database and Redis Connections 🧪

After verifying environment variables, test the endpoints:

```bash
# Test health endpoint
curl https://vett-api-production.up.railway.app/health

# Test readiness (should show database: true, redis: true)
curl https://vett-api-production.up.railway.app/ready

# Test GraphQL
curl -X POST https://vett-api-production.up.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

**Expected `/ready` response:**
```json
{
  "status": "ready",
  "checks": {
    "database": true,
    "redis": true
  }
}
```

---

### Step 4: Check Railway Logs 📋

If connections are still failing:

1. **Railway Dashboard** → **API Service** → **Logs** tab
2. **Look for:**
   ```
   🔍 Environment check (production):
     DATABASE_URL: ✅ Set / ⚠️ Empty string / ❌ Missing
     REDIS_URL: ✅ Set / ⚠️ Empty string / ❌ Missing
   ```
3. **Common Issues:**
   - Variables show "⚠️ Empty string" → Delete and re-add the variable
   - Variables show "❌ Missing" → Add the variable at Service level
   - Variables show "✅ Set" but connection fails → Check connection string format

---

## 🎯 High Priority (This Week)

### Step 5: Test Mobile App Connection 📱

**Prerequisites:** Database and Redis must be working first

1. **Start Expo Development Server:**
   ```bash
   cd apps/mobile
   npx expo start
   ```

2. **Test GraphQL Connection:**
   - Open app in simulator/device
   - Make a GraphQL query: `{ __typename }`
   - Check Expo DevTools → Network tab
   - Verify:
     - ✅ Request goes to `vett-api-production.up.railway.app`
     - ✅ No CORS errors
     - ✅ Response received

3. **Fix CORS if Needed:**
   - Railway → API Service → Variables
   - Update `ALLOWED_ORIGINS`:
     ```
     ALLOWED_ORIGINS=https://vett-api-production.up.railway.app,exp://localhost:8081,exp://YOUR_IP:8081
     ```
   - Find your IP: `ipconfig getifaddr en0` (macOS)
   - Railway will auto-redeploy

---

### Step 6: Set Up Monitoring & Alerts 🔔

#### Railway Alerts:

1. **Railway Dashboard** → **API Service** → **Settings** → **Notifications**
2. **Enable:**
   - ✅ Email notifications
   - ✅ Deployment failures
   - ✅ Service crashes
   - ✅ High resource usage

#### Sentry Alerts (if configured):

1. **Sentry Dashboard** → Your Project → **Settings** → **Alerts**
2. **Create Alert Rules:**
   - Error rate > 5%
   - New issues detected
   - Performance degradation

#### Uptime Monitoring (Optional):

1. Create account: https://uptimerobot.com
2. Add monitor:
   - **URL:** `https://vett-api-production.up.railway.app/health`
   - **Type:** HTTP(s)
   - **Interval:** 5 minutes

---

### Step 7: Test End-to-End Flow 🔄

**Prerequisites:** Database, Redis, and Mobile app must be working

1. **Submit Analysis via GraphQL:**
   ```graphql
   mutation {
     submitAnalysis(input: {
       text: "This is a test claim for verification"
     }) {
       id
       status
     }
   }
   ```

2. **Check Worker Processes:**
   - Railway → Worker Service → Logs
   - Should see job processing messages

3. **Poll for Results:**
   ```graphql
   query {
     analysis(id: "ANALYSIS_ID") {
       status
       score
       verdict
       summary
     }
   }
   ```

**Verify:**
- [ ] Analysis submitted successfully
- [ ] Worker picks up job
- [ ] Analysis completes
- [ ] Results returned correctly

---

## 🎯 Medium Priority (Next Week)

### Step 8: Build Production Mobile App 📦

1. **Set Up EAS:**
   ```bash
   cd apps/mobile
   npm install -g eas-cli
   eas login
   eas build:configure
   ```

2. **Create Production Build Profile:**
   - Update `apps/mobile/eas.json`:
     ```json
     {
       "build": {
         "production": {
           "env": {
             "EXPO_PUBLIC_API_URL": "https://vett-api-production.up.railway.app"
           }
         }
       }
     }
     ```

3. **Build:**
   ```bash
   # Android
   eas build --platform android --profile production
   
   # iOS
   eas build --platform ios --profile production
   ```

---

### Step 9: GDPR Compliance ⚖️

1. **Implement Endpoints:**
   - `GET /gdpr/export` - Data export
   - `DELETE /gdpr/delete` - Data deletion

2. **Test:**
   - Export user data
   - Verify data is complete
   - Delete user account
   - Verify data is removed

---

### Step 10: Legal Documents 📄

1. **Create:**
   - Privacy Policy
   - Terms of Service

2. **Add to Mobile App:**
   - Create Settings screen
   - Add links to legal documents
   - Show on first launch (acceptance required)

---

## 📋 Quick Reference

### Railway Environment Variables Checklist:

- [ ] `DATABASE_URL` - Supabase Transaction Pooler (port 6543)
- [ ] `REDIS_URL` - Upstash Redis URL
- [ ] `CLERK_SECRET_KEY` - Clerk secret key
- [ ] `NODE_ENV` - Set to `production` (usually automatic)
- [ ] `ALLOWED_ORIGINS` - CORS origins (optional but recommended)

### Test Commands:

```bash
# Health check
curl https://vett-api-production.up.railway.app/health

# Readiness check
curl https://vett-api-production.up.railway.app/ready

# GraphQL test
curl -X POST https://vett-api-production.up.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'

# CORS test
curl https://vett-api-production.up.railway.app/cors-test
```

### Troubleshooting:

- **502 Error:** Service is deploying or crashed - check Railway logs
- **Database/Redis Unhealthy:** Check environment variables in Railway
- **CORS Errors:** Update `ALLOWED_ORIGINS` in Railway
- **Build Fails:** Check Railway build logs for errors

---

## 📚 Related Documentation

- **Environment Variables:** `docs/RAILWAY_ENV_VARIABLES.md`
- **Environment Verification:** `docs/RAILWAY_ENV_VERIFICATION.md`
- **Database Setup:** `docs/GET_SUPABASE_CONNECTION_STRING.md`
- **Redis Setup:** `docs/REDIS_QUICK_START.md`
- **Production Test Results:** `docs/PRODUCTION_TEST_RESULTS.md`

---

## ✅ Current Status

- [x] Code changes committed and pushed
- [x] Build errors fixed
- [x] Redis error suppression improved
- [ ] Railway deployment verified
- [ ] Environment variables verified
- [ ] Database connection working
- [ ] Redis connection working
- [ ] Mobile app tested
- [ ] Monitoring set up

---

**Next Action:** Wait for Railway deployment to complete, then verify environment variables are set correctly.


