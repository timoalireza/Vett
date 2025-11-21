# Railway Domain Setup - Step by Step

**After getting your Railway API domain, follow these steps:**

## Step 1: Update Mobile App Configuration

You have **two options** (choose one):

### Option A: Update `app.json` (Simplest)

1. **Edit `apps/mobile/app.json`:**
   ```json
   {
     "expo": {
       "extra": {
         "apiUrl": "https://your-railway-domain.railway.app",
         "eas": {
           "projectId": "vett-mobile-dev"
         }
       }
     }
   }
   ```

2. **Replace `your-railway-domain.railway.app`** with your actual Railway domain

### Option B: Use Environment Variable (Recommended for Production)

1. **Create `apps/mobile/.env.production`:**
   ```bash
   EXPO_PUBLIC_API_URL=https://your-railway-domain.railway.app
   ```

2. **Add to `.gitignore`** (if not already there):
   ```
   apps/mobile/.env*
   ```

3. **The mobile app will automatically use this** (it checks `EXPO_PUBLIC_API_URL` first)

---

## Step 2: Update CORS in Railway

**Why:** Mobile app needs permission to call your API

1. **Go to Railway Dashboard:**
   - Select your **API Service**
   - Click **Settings** → **Variables**

2. **Add/Update `ALLOWED_ORIGINS`:**
   ```
   ALLOWED_ORIGINS=https://your-railway-domain.railway.app,exp://localhost:8081,exp://192.168.1.100:8081
   ```

   **Note:** 
   - Replace `your-railway-domain.railway.app` with your actual domain
   - `exp://localhost:8081` is for Expo development
   - `exp://192.168.1.100:8081` - Replace `192.168.1.100` with your local IP (for testing on physical device)

3. **How to find your local IP:**
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Or
   ipconfig getifaddr en0
   ```

4. **Save** - Railway will automatically redeploy

---

## Step 3: Test the Connection

### Test 1: Health Check (Browser/curl)

```bash
curl https://your-railway-domain.railway.app/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-XX...",
  "uptime": 12345
}
```

### Test 2: GraphQL Endpoint

```bash
curl -X POST https://your-railway-domain.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

**Expected Response:**
```json
{
  "data": {
    "__typename": "Query"
  }
}
```

### Test 3: Database Connection

```bash
curl https://your-railway-domain.railway.app/ready
```

**Expected Response:**
```json
{
  "status": "ready",
  "database": "connected",
  "redis": "connected"
}
```

---

## Step 4: Test Mobile App Connection

### Development Testing

1. **Start Expo development server:**
   ```bash
   cd apps/mobile
   npx expo start
   ```

2. **Open app on simulator/device**

3. **Check Network Requests:**
   - Open Expo DevTools (press `j` in terminal)
   - Go to **Network** tab
   - Make a GraphQL request
   - Verify it goes to your Railway domain (not localhost)

4. **Check for CORS Errors:**
   - If you see CORS errors, add your Expo origin to `ALLOWED_ORIGINS`
   - Format: `exp://YOUR_IP:8081`

### Production Testing

1. **Build production app:**
   ```bash
   cd apps/mobile
   eas build --platform android --profile production
   ```

2. **Install on device and test**

---

## Step 5: Verify Everything Works

### Checklist

- [ ] Health endpoint returns 200
- [ ] GraphQL endpoint responds
- [ ] Database connection works (`/ready`)
- [ ] Mobile app can connect (no CORS errors)
- [ ] GraphQL queries work from mobile app
- [ ] Authentication works (if implemented)

---

## Troubleshooting

### Issue: CORS Error

**Error:** `Access to fetch at '...' from origin 'exp://...' has been blocked by CORS policy`

**Fix:**
1. Add your Expo origin to `ALLOWED_ORIGINS` in Railway
2. Format: `exp://YOUR_IP:8081`
3. Redeploy API service

### Issue: Connection Refused

**Error:** `Network request failed` or `ECONNREFUSED`

**Fix:**
1. Verify Railway domain is correct
2. Check Railway service is running (Dashboard → Deployments)
3. Check Railway logs for errors

### Issue: 404 Not Found

**Error:** `404` when calling GraphQL endpoint

**Fix:**
1. Verify URL is correct: `https://domain.railway.app/graphql`
2. Check Railway service is using correct Dockerfile path
3. Verify API is listening on correct port (4000)

### Issue: Mobile App Still Uses Localhost

**Fix:**
1. Clear Expo cache:
   ```bash
   npx expo start -c
   ```
2. Restart Expo development server
3. Verify `app.json` or `.env` is updated correctly

---

## Quick Reference

### Railway Domain Format
```
https://your-service-name.up.railway.app
```

### Mobile App Config Priority
1. `EXPO_PUBLIC_API_URL` environment variable (highest priority)
2. `app.json` → `extra.apiUrl`
3. `http://localhost:4000` (fallback)

### CORS Origins Format
```
ALLOWED_ORIGINS=https://domain1.com,https://domain2.com,exp://localhost:8081
```

---

## Next Steps

After completing these steps:

1. ✅ Mobile app connected to production API
2. ⏭️ Set up custom domain (optional)
3. ⏭️ Configure monitoring alerts
4. ⏭️ Build production mobile app
5. ⏭️ Test end-to-end flow

---

**Need Help?** Check Railway logs: Dashboard → Service → Deployments → View Logs

