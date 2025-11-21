# Your Railway Domain Configuration

**Domain:** `vett-api-production.up.railway.app`

## ✅ Mobile App Updated

The mobile app configuration has been updated to use your Railway domain.

**File:** `apps/mobile/app.json`
```json
{
  "extra": {
    "apiUrl": "https://vett-api-production.up.railway.app"
  }
}
```

---

## 🔧 Next Steps

### 1. Update CORS in Railway (CRITICAL)

**Why:** Mobile app needs permission to call your API

**Steps:**

1. Go to **Railway Dashboard** → **API Service** → **Settings** → **Variables**
2. Add or update `ALLOWED_ORIGINS`:
   ```
   ALLOWED_ORIGINS=https://vett-api-production.up.railway.app,exp://localhost:8081
   ```

3. **For testing on physical device**, add your local IP:
   ```bash
   # Find your local IP
   ipconfig getifaddr en0  # macOS
   # or
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   
   Then add to `ALLOWED_ORIGINS`:
   ```
   ALLOWED_ORIGINS=https://vett-api-production.up.railway.app,exp://localhost:8081,exp://YOUR_IP:8081
   ```

4. **Save** - Railway will automatically redeploy

---

### 2. Test the Connection

**Test Health Endpoint:**
```bash
curl https://vett-api-production.up.railway.app/health
```

**Test GraphQL:**
```bash
curl -X POST https://vett-api-production.up.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

**Test Database:**
```bash
curl https://vett-api-production.up.railway.app/ready
```

---

### 3. Test Mobile App

**Start Expo:**
```bash
cd apps/mobile
npx expo start
```

**Clear cache (if needed):**
```bash
npx expo start -c
```

**Check Network:**
- Open Expo DevTools (press `j` in terminal)
- Make a GraphQL request
- Verify it goes to `vett-api-production.up.railway.app` (not localhost)

---

## 🔍 Verification Checklist

- [ ] API domain is accessible (`/health` returns 200)
- [ ] GraphQL endpoint works
- [ ] Database connection works (`/ready`)
- [ ] CORS updated in Railway
- [ ] Mobile app can connect (no CORS errors)
- [ ] GraphQL queries work from mobile app

---

## 📝 Current Configuration

**API Domain:** `https://vett-api-production.up.railway.app`
**GraphQL Endpoint:** `https://vett-api-production.up.railway.app/graphql`
**Health Endpoint:** `https://vett-api-production.up.railway.app/health`

---

## 🚨 Important Notes

1. **CORS Must Be Updated:** Without updating `ALLOWED_ORIGINS` in Railway, your mobile app will get CORS errors
2. **SSL is Automatic:** Railway automatically provisions SSL certificates
3. **Auto-Deploy:** Railway redeploys automatically when you update environment variables

---

## 🐛 Troubleshooting

### CORS Error in Mobile App

**Error:** `Access to fetch at '...' from origin 'exp://...' has been blocked by CORS policy`

**Fix:**
1. Add your Expo origin to `ALLOWED_ORIGINS` in Railway
2. Format: `exp://YOUR_IP:8081` (replace YOUR_IP with your local IP)
3. Redeploy API service

### Connection Refused

**Error:** `Network request failed`

**Fix:**
1. Verify Railway service is running (Dashboard → Deployments)
2. Check Railway logs for errors
3. Verify domain is correct

---

**Next Action:** Update `ALLOWED_ORIGINS` in Railway Variables!

