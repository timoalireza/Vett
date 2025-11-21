# Mobile App Troubleshooting Guide

**Status:** CORS Updated ✅ | API/Worker Running ✅ | Mobile Failed ❌

## 🔍 What Does "Mobile Failed" Mean?

The mobile app can fail in different ways. Let's identify the issue:

### 1. Mobile App Build Failed

**Symptoms:**
- Expo build fails
- EAS build fails
- TypeScript/compilation errors

**Check:**
```bash
cd apps/mobile
npx expo start
```

**Common Issues:**
- Missing dependencies
- TypeScript errors
- Configuration errors

### 2. Mobile App Can't Connect to API

**Symptoms:**
- Network request failed
- CORS errors
- Connection timeout
- 502 Bad Gateway

**Check:**
- API is responding: `curl https://vett-api-production.up.railway.app/health`
- CORS is configured correctly
- API URL is correct in `app.json`

### 3. Mobile App Crashes on Startup

**Symptoms:**
- App opens then immediately closes
- Red error screen
- Crash logs

**Check:**
- Expo DevTools → Logs
- Check for runtime errors
- Verify API configuration

---

## 🚨 Current Issue: API 502 Error

**Problem:** API is returning `502 - Application failed to respond`

**This means:** Even though Railway shows API as "running", it's not actually responding to requests.

### Fix API 502 First

**Step 1: Check Railway Logs**

1. Railway Dashboard → API Service → Deployments
2. Click **"View Logs"** on latest deployment
3. Look for:
   - Startup errors
   - Crash messages
   - Missing environment variables
   - Database connection errors

**Step 2: Common Fixes**

**Fix 1: Missing Environment Variables**
```
Error: Invalid environment configuration: { DATABASE_URL: [ 'Invalid url' ] }
```
**Solution:** Verify all required env vars are set in Railway

**Fix 2: Service Crashed**
```
Error: Cannot find module '@sentry/node'
```
**Solution:** Check Dockerfile installs all dependencies

**Fix 3: Port Mismatch**
```
Error: listen EADDRINUSE :::4000
```
**Solution:** Remove `PORT` variable or set to different port

**Fix 4: Database Connection Failed**
```
Error: getaddrinfo ENOTFOUND db.xxx.supabase.co
```
**Solution:** Verify `DATABASE_URL` is correct, Supabase is active

### Step 3: Verify API is Working

After fixing, test:
```bash
# Health check
curl https://vett-api-production.up.railway.app/health

# Expected: {"status":"ok",...}

# GraphQL
curl -X POST https://vett-api-production.up.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'

# Expected: {"data":{"__typename":"Query"}}
```

---

## 📱 Mobile App Connection Issues

### Issue 1: Network Request Failed

**Error:** `Network request failed` or `ECONNREFUSED`

**Causes:**
1. API is down (502 error)
2. Wrong API URL
3. Network connectivity issues

**Fix:**
1. **Verify API is working** (fix 502 first)
2. **Check API URL in app.json:**
   ```json
   {
     "extra": {
       "apiUrl": "https://vett-api-production.up.railway.app"
     }
   }
   ```
3. **Clear Expo cache:**
   ```bash
   cd apps/mobile
   npx expo start -c
   ```

### Issue 2: CORS Error

**Error:** `Access to fetch at '...' from origin 'exp://...' has been blocked by CORS policy`

**Fix:**
1. Railway → API Service → Settings → Variables
2. Update `ALLOWED_ORIGINS`:
   ```
   ALLOWED_ORIGINS=https://vett-api-production.up.railway.app,exp://localhost:8081,exp://YOUR_IP:8081
   ```
3. **Find your local IP:**
   ```bash
   # macOS
   ipconfig getifaddr en0
   
   # Or
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
4. **Add to ALLOWED_ORIGINS:** `exp://YOUR_IP:8081`
5. Railway will auto-redeploy

### Issue 3: Authentication Required

**Error:** `401 Unauthorized` or `Authentication required`

**Current Status:** Mobile app doesn't have Clerk authentication yet (returns `null` token)

**Fix:** This is expected for now. Some endpoints may require auth, but basic queries should work.

**Test without auth:**
```graphql
query {
  __typename
}
```

---

## 🔧 Step-by-Step Debugging

### Step 1: Verify API Configuration

**Check `apps/mobile/app.json`:**
```json
{
  "extra": {
    "apiUrl": "https://vett-api-production.up.railway.app"
  }
}
```

**Verify it's correct** (no typos, includes `https://`)

### Step 2: Test API from Terminal

```bash
# Test health
curl https://vett-api-production.up.railway.app/health

# Test GraphQL
curl -X POST https://vett-api-production.up.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

**If these fail:** API is the problem (fix 502 first)

**If these work:** Mobile app configuration issue

### Step 3: Test Mobile App Locally

```bash
cd apps/mobile
npx expo start
```

**Check:**
- Does Expo start successfully?
- Can you open app in simulator?
- Check Expo DevTools → Network tab
- Make a GraphQL request
- See what error you get

### Step 4: Check Mobile App Logs

**In Expo DevTools:**
- Press `j` to open DevTools
- Go to **Logs** tab
- Look for errors or warnings
- Go to **Network** tab
- See what requests are being made

---

## 🐛 Common Mobile App Errors

### Error 1: "Cannot read property 'apiUrl' of undefined"

**Fix:** Clear Expo cache and restart:
```bash
cd apps/mobile
npx expo start -c
```

### Error 2: "Network request failed"

**Fix:**
1. Verify API is working (curl test)
2. Check API URL is correct
3. Check CORS settings
4. Try on different network (WiFi vs cellular)

### Error 3: "GraphQL request failed (502)"

**Fix:** API is down - fix Railway API service first

### Error 4: "GraphQL request failed (401)"

**Fix:** Some queries require authentication. Test with simple query first:
```graphql
query {
  __typename
}
```

---

## ✅ Verification Checklist

**API:**
- [ ] API health endpoint returns 200
- [ ] GraphQL endpoint responds
- [ ] No 502 errors
- [ ] Railway logs show no errors

**CORS:**
- [ ] `ALLOWED_ORIGINS` includes Expo origins
- [ ] Railway has redeployed after CORS update

**Mobile App:**
- [ ] `app.json` has correct API URL
- [ ] Expo starts without errors
- [ ] App opens in simulator/device
- [ ] Network requests show in DevTools
- [ ] GraphQL requests succeed

---

## 🚀 Next Steps

1. **Fix API 502 Error First** (most important)
   - Check Railway logs
   - Fix environment variables
   - Redeploy API service

2. **Verify API is Working**
   - Test with curl
   - Should return 200 OK

3. **Test Mobile App**
   - Start Expo
   - Make GraphQL request
   - Check for errors

4. **Fix Mobile App Issues**
   - Update CORS if needed
   - Clear Expo cache
   - Restart Expo

---

## 📞 Need More Help?

**Share:**
1. What error message you see in mobile app
2. Railway API logs (latest deployment)
3. Expo DevTools → Network tab screenshot
4. Result of `curl https://vett-api-production.up.railway.app/health`

---

**Priority:** Fix API 502 error first, then mobile app will work!

