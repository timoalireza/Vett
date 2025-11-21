# How to Test Mobile App Connection - Step by Step

**Your API is running!** Here's how to test the mobile app connection:

---

## ✅ Step 1: Verify API is Working

**Test with curl first:**

```bash
curl -X POST https://vett-api-production.up.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

**Expected:** `{"data":{"__typename":"Query"}}`

---

## 📱 Step 2: Start Expo Development Server

```bash
cd apps/mobile
npx expo start
```

**Then:**
- Press `i` for iOS simulator
- Press `a` for Android emulator  
- Or scan QR code with Expo Go app

---

## 🔍 Step 3: Open Expo DevTools

**In Expo terminal, press `j`** to open DevTools in browser.

**Or visit:** http://localhost:19002

---

## 🌐 Step 4: Check Network Tab

1. **In Expo DevTools**, click **"Network"** tab
2. **Make a GraphQL request** from your mobile app
3. **Look for:**
   - Request URL: `https://vett-api-production.up.railway.app/graphql`
   - Status: `200 OK`
   - Response: JSON data

---

## 🧪 Step 5: Test Simple Query

**In your mobile app, test this query:**

```typescript
import { graphqlRequest } from './src/api/graphql';

// Test query
const testQuery = `
  query {
    __typename
  }
`;

try {
  const result = await graphqlRequest(testQuery);
  console.log('✅ Connection works!', result);
} catch (error) {
  console.error('❌ Connection failed:', error);
}
```

---

## ✅ What Success Looks Like

**In Expo DevTools Network Tab:**

```
POST https://vett-api-production.up.railway.app/graphql
Status: 200 OK
Response: {"data":{"__typename":"Query"}}
```

**In Mobile App Console:**
```
✅ Connection works! { __typename: 'Query' }
```

---

## 🐛 Troubleshooting

### Issue: CORS Error

**Error:** `Access to fetch blocked by CORS policy`

**Fix:**
1. Railway → API Service → Variables
2. Update `ALLOWED_ORIGINS`:
   ```
   ALLOWED_ORIGINS=https://vett-api-production.up.railway.app,exp://localhost:8081,exp://YOUR_IP:8081
   ```
3. Find your IP: `ipconfig getifaddr en0`
4. Railway will auto-redeploy

### Issue: Network Request Failed

**Error:** `Network request failed`

**Fix:**
1. Verify API works: `curl https://vett-api-production.up.railway.app/health`
2. Check `apps/mobile/app.json` has correct `apiUrl`
3. Clear Expo cache: `npx expo start -c`

### Issue: Wrong API URL

**Problem:** Requests go to `localhost:4000`

**Fix:**
1. Check `apps/mobile/app.json`:
   ```json
   {
     "extra": {
       "apiUrl": "https://vett-api-production.up.railway.app"
     }
   }
   ```
2. Restart Expo: `npx expo start -c`

---

## 📋 Quick Checklist

- [ ] API responds to curl test
- [ ] Expo started
- [ ] App opened in simulator/device
- [ ] DevTools Network tab open
- [ ] Made GraphQL request
- [ ] Request URL is correct
- [ ] Status is 200
- [ ] Response received

---

## 🎯 Next Steps After Testing

Once connection works:

1. ✅ Test authenticated queries
2. ✅ Test analysis submission
3. ✅ Test end-to-end flow
4. ✅ Build production app

---

**Start with Step 1 and work through each step!**

