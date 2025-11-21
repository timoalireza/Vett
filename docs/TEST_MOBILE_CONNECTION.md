# How to Test Mobile App Connection

**Step-by-step guide to test your mobile app connection to the production API.**

---

## 🚀 Step 1: Start Expo Development Server

```bash
cd apps/mobile
npx expo start
```

**What you'll see:**
- QR code in terminal
- Options to open in iOS simulator, Android emulator, or on device

**Choose one:**
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your phone

---

## 📱 Step 2: Open Expo DevTools

Once Expo starts, you'll see options in the terminal. Press `j` to open DevTools in your browser.

**Or manually:**
- Open browser: http://localhost:19002
- This shows Expo DevTools

---

## 🔍 Step 3: Check Network Tab

1. **In Expo DevTools**, click **"Network"** tab
2. **Make a GraphQL request** from your mobile app
3. **Verify:**
   - Request URL shows `https://vett-api-production.up.railway.app/graphql`
   - Not `http://localhost:4000`
   - Status code is `200` (success)

---

## 🧪 Step 4: Test Simple GraphQL Query

### Option A: Test in Mobile App

If you have a screen that makes GraphQL requests, use it. Otherwise, add a test button:

**Example test query:**
```typescript
// In your mobile app code
const testQuery = `
  query {
    __typename
  }
`;

// Make the request
const result = await graphqlRequest(testQuery);
console.log('Result:', result);
```

### Option B: Test with curl (Verify API First)

Before testing mobile app, verify API works:

```bash
curl -X POST https://vett-api-production.up.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

**Expected response:**
```json
{
  "data": {
    "__typename": "Query"
  }
}
```

---

## ✅ Step 5: Verify Connection

### Check These Things:

1. **Request URL:**
   - ✅ Should be `https://vett-api-production.up.railway.app/graphql`
   - ❌ NOT `http://localhost:4000/graphql`

2. **Response Status:**
   - ✅ `200 OK` = Success
   - ❌ `401` = Authentication needed
   - ❌ `403` = CORS error
   - ❌ `500` = Server error

3. **Response Data:**
   - ✅ Should receive JSON response
   - ❌ Empty response or error message

---

## 🐛 Troubleshooting

### Issue 1: CORS Error

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
5. Railway will auto-redeploy (wait 1-2 minutes)

### Issue 2: Network Request Failed

**Error:** `Network request failed` or `ECONNREFUSED`

**Fix:**
1. Verify API is working:
   ```bash
   curl https://vett-api-production.up.railway.app/health
   ```
2. Check API URL in `apps/mobile/app.json`:
   ```json
   {
     "extra": {
       "apiUrl": "https://vett-api-production.up.railway.app"
     }
   }
   ```
3. Clear Expo cache:
   ```bash
   npx expo start -c
   ```

### Issue 3: Wrong API URL

**Problem:** Requests going to `localhost` instead of Railway domain

**Fix:**
1. Check `apps/mobile/app.json`:
   ```json
   {
     "extra": {
       "apiUrl": "https://vett-api-production.up.railway.app"
     }
   }
   ```
2. Restart Expo:
   ```bash
   # Stop Expo (Ctrl+C)
   npx expo start -c
   ```
3. Reload app in simulator/device

---

## 📋 Quick Test Checklist

- [ ] Expo server started
- [ ] App opened in simulator/device
- [ ] Expo DevTools open (Network tab)
- [ ] Made a GraphQL request
- [ ] Request URL is correct (`vett-api-production.up.railway.app`)
- [ ] Response status is `200`
- [ ] Response data received
- [ ] No CORS errors
- [ ] No network errors

---

## 🎯 Test Different Scenarios

### Test 1: Simple Query (No Auth)
```graphql
query {
  __typename
}
```

### Test 2: Subscription Query (Requires Auth)
```graphql
query {
  subscription {
    plan
    status
  }
}
```

### Test 3: Submit Analysis (Requires Auth)
```graphql
mutation {
  submitAnalysis(input: {
    text: "Test claim"
  }) {
    id
    status
  }
}
```

---

## 📸 What to Look For

### In Expo DevTools Network Tab:

**Successful Request:**
```
POST https://vett-api-production.up.railway.app/graphql
Status: 200 OK
Response: {"data":{"__typename":"Query"}}
```

**CORS Error:**
```
POST https://vett-api-production.up.railway.app/graphql
Status: (blocked)
Error: CORS policy blocked
```

**Network Error:**
```
POST https://vett-api-production.up.railway.app/graphql
Status: (failed)
Error: Network request failed
```

---

## 🚀 Next Steps After Testing

Once connection works:

1. ✅ Test authenticated queries
2. ✅ Test analysis submission
3. ✅ Test end-to-end flow
4. ✅ Build production app

---

**Need Help?** Check `docs/MOBILE_APP_TROUBLESHOOTING.md` for more detailed troubleshooting!

