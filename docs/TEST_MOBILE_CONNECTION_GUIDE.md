# Test Mobile App Connection - Step by Step Guide

**Status:** ✅ API Server Working | ✅ Mobile App Configured | ⏳ Ready to Test

---

## 🎯 Step 1: Start Expo Development Server

```bash
cd apps/mobile
npx expo start
```

**Expected Output:**
```
› Metro waiting on exp://192.168.x.x:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

---

## 🎯 Step 2: Open App on Device/Simulator

### Option A: Physical Device
1. **iOS:** Open Camera app → Scan QR code
2. **Android:** Open Expo Go app → Scan QR code

### Option B: Simulator/Emulator
- **iOS:** Press `i` in Expo terminal
- **Android:** Press `a` in Expo terminal

---

## 🎯 Step 3: Test GraphQL Connection

### Check Network Tab in Expo DevTools

1. **Open Expo DevTools:**
   - Press `j` in Expo terminal, OR
   - Open browser to `http://localhost:19002`

2. **Go to Network Tab:**
   - Click "Network" in DevTools
   - Make a GraphQL query in your app

3. **Verify Request:**
   - ✅ Request URL should be: `https://vett-api-production.up.railway.app/graphql`
   - ✅ Method: `POST`
   - ✅ Status: `200 OK`
   - ✅ Response received

### Test Simple Query

In your app, try making a simple query like:
```graphql
query {
  __typename
}
```

**Expected Response:**
```json
{
  "data": {
    "__typename": "Query"
  }
}
```

---

## 🎯 Step 4: Check for CORS Errors

### If You See CORS Errors:

**Error Message:**
```
Access to fetch at 'https://vett-api-production.up.railway.app/graphql' 
from origin 'exp://localhost:8081' has been blocked by CORS policy
```

**Fix:**

1. **Railway Dashboard** → **API Service** → **Variables** tab
2. **Find `ALLOWED_ORIGINS` variable** (or create it if missing)
3. **Add your Expo origin:**
   ```
   ALLOWED_ORIGINS=https://vett-api-production.up.railway.app,exp://localhost:8081,exp://YOUR_IP:8081
   ```
4. **Find your local IP:**
   ```bash
   ipconfig getifaddr en0  # macOS
   ipconfig getifaddr en1  # macOS alternative
   ifconfig | grep "inet " | grep -v 127.0.0.1  # Linux
   ```
5. **Add to ALLOWED_ORIGINS:** `exp://YOUR_IP:8081`
   - Example: `exp://192.168.1.100:8081`
6. **Railway will auto-redeploy** (wait 1-2 minutes)
7. **Test again**

---

## 🎯 Step 5: Verify API Configuration

### Check Mobile App Config

The mobile app should be using the production API URL. Verify:

**File:** `apps/mobile/app.json`
```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://vett-api-production.up.railway.app"
    }
  }
}
```

**File:** `apps/mobile/src/api/config.ts`
- Should read from `Constants.expoConfig.extra.apiUrl`
- Falls back to `http://localhost:4000` if not set

### Verify in Runtime

Add a console log to check:
```typescript
console.log('API URL:', API_BASE_URL);
console.log('GraphQL Endpoint:', GRAPHQL_ENDPOINT);
```

**Expected Output:**
```
API URL: https://vett-api-production.up.railway.app
GraphQL Endpoint: https://vett-api-production.up.railway.app/graphql
```

---

## 🎯 Step 6: Test Authenticated Requests (Optional)

If you have Clerk authentication set up:

1. **Sign in** through the app
2. **Make an authenticated query:**
   ```graphql
   query {
     subscription {
       plan
       status
     }
   }
   ```
3. **Verify:**
   - ✅ Request includes `Authorization: Bearer <token>` header
   - ✅ Response returns subscription data
   - ✅ No authentication errors

---

## ✅ Success Checklist

- [ ] Expo server started successfully
- [ ] App opened on device/simulator
- [ ] GraphQL request goes to production API URL
- [ ] No CORS errors
- [ ] Response received successfully
- [ ] Network tab shows correct endpoint

---

## 🐛 Troubleshooting

### Issue: App Still Using Localhost

**Symptom:** Requests go to `http://localhost:4000`

**Fix:**
1. Restart Expo server: `Ctrl+C` then `npx expo start`
2. Clear cache: `npx expo start --clear`
3. Verify `app.json` has correct `apiUrl`
4. Rebuild app if needed

### Issue: CORS Errors Persist

**Fix:**
1. Verify `ALLOWED_ORIGINS` includes your Expo origin
2. Check Railway logs to see if CORS is configured
3. Wait for Railway redeploy to complete
4. Try restarting Expo server

### Issue: Network Request Failed

**Possible Causes:**
- API server is down (check Railway status)
- Network connectivity issues
- Firewall blocking requests

**Fix:**
1. Test API directly: `curl https://vett-api-production.up.railway.app/health`
2. Check Railway logs for errors
3. Verify network connection

---

## 📚 Next Steps After Successful Connection

1. **Test End-to-End Flow:**
   - Submit an analysis
   - Verify worker processes it
   - Check results are returned

2. **Set Up Monitoring:**
   - Railway alerts
   - Sentry error tracking
   - Uptime monitoring

3. **Build Production App:**
   - Configure EAS
   - Build for iOS/Android
   - Test production build

---

**Ready to test?** Start with Step 1: `cd apps/mobile && npx expo start`

