# Next Steps - Production Ready Checklist

**Status:** ✅ Deployments Running | ⏳ Verification & Configuration Needed

## 🎯 Immediate Next Steps

### 1. Verify API is Responding ⚠️ CRITICAL

**Check Railway Logs:**
1. Railway Dashboard → API Service → Deployments
2. Click **"View Logs"** on latest deployment
3. Look for:
   - ✅ "Vett API ready at http://localhost:4000/graphql"
   - ✅ "Sentry initialized successfully"
   - ❌ Any errors or crashes

**Test Endpoints:**
```bash
# Health check
curl https://vett-api-production.up.railway.app/health

# Expected: {"status":"ok",...}
```

**If still 502:**
- Check Railway logs for startup errors
- Verify all environment variables are set
- Check database connection
- Verify Redis connection

---

### 2. Test Mobile App Connection ⚠️ HIGH PRIORITY

**Start Expo:**
```bash
cd apps/mobile
npx expo start
```

**Test GraphQL Query:**
- Open app in simulator/device
- Make a GraphQL request
- Check Expo DevTools → Network tab
- Verify:
  - ✅ Request goes to `vett-api-production.up.railway.app`
  - ✅ No CORS errors
  - ✅ Response received

**If CORS Error:**
- Railway → API Service → Variables
- Update `ALLOWED_ORIGINS`:
  ```
  ALLOWED_ORIGINS=https://vett-api-production.up.railway.app,exp://localhost:8081,exp://YOUR_IP:8081
  ```
- Find your IP: `ipconfig getifaddr en0` (macOS)

---

### 3. Set Up Monitoring & Alerts ⚠️ HIGH PRIORITY

#### Railway Alerts

1. **Railway Dashboard** → API Service → Settings → Notifications
2. **Enable:**
   - Email notifications
   - Deployment failures
   - Service crashes
   - High resource usage

#### Sentry Alerts

1. **Sentry Dashboard** → Your Project → Settings → Alerts
2. **Create Alert Rules:**
   - Error rate > 5%
   - New issues detected
   - Performance degradation
   - Failed transactions

#### Uptime Monitoring (Optional)

**Set up UptimeRobot (Free):**
1. Create account at https://uptimerobot.com
2. Add monitor:
   - URL: `https://vett-api-production.up.railway.app/health`
   - Type: HTTP(s)
   - Interval: 5 minutes
3. Configure alerts (email/SMS)

---

### 4. Test End-to-End Flow ⚠️ MEDIUM PRIORITY

**Test Analysis Submission:**

1. **Submit Analysis:**
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

### 5. Set Up Custom Domain (Optional) ⚠️ MEDIUM PRIORITY

**Why:** Professional domain, better branding

**Steps:**

1. **Purchase Domain:**
   - Namecheap, Google Domains, or Cloudflare
   - Example: `vett.app` or `getvett.com`

2. **Configure in Railway:**
   - Railway → API Service → Settings → Networking
   - Click **"Custom Domain"**
   - Enter domain (e.g., `api.vett.app`)
   - Follow DNS instructions

3. **Update Configuration:**
   - Update `ALLOWED_ORIGINS` in Railway
   - Update mobile app `EXPO_PUBLIC_API_URL`
   - Wait for SSL (5-10 minutes)

---

### 6. Build Production Mobile App ⚠️ HIGH PRIORITY

**Set Up EAS:**

```bash
cd apps/mobile
npm install -g eas-cli
eas login
eas build:configure
```

**Create Production Build:**

```bash
# Android
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

**Configure Environment:**
- EAS will use `EXPO_PUBLIC_API_URL` from environment
- Or set in `eas.json`:
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

---

### 7. GDPR Compliance ⚠️ MEDIUM PRIORITY

**Implement Endpoints:**

1. **Data Export:**
   - `GET /gdpr/export`
   - Returns user's data in JSON format

2. **Data Deletion:**
   - `DELETE /gdpr/delete`
   - Deletes user account and all associated data

**Test:**
- Export user data
- Verify data is complete
- Delete user account
- Verify data is removed

---

### 8. Legal Documents ⚠️ MEDIUM PRIORITY

**Required Documents:**

1. **Privacy Policy:**
   - Data collection
   - Data usage
   - Third-party services
   - User rights (GDPR)
   - Contact information

2. **Terms of Service:**
   - Service description
   - User obligations
   - Limitation of liability
   - Subscription terms
   - Cancellation policy

**Add to Mobile App:**
- Create Settings screen
- Add links to legal documents
- Show on first launch (acceptance required)

---

## 📋 Quick Checklist

### Critical (Do First)
- [ ] API responds to health checks
- [ ] Mobile app connects to API
- [ ] No CORS errors
- [ ] GraphQL queries work
- [ ] Worker processes jobs

### Important (Do Soon)
- [ ] Monitoring alerts configured
- [ ] End-to-end flow tested
- [ ] Production mobile app built
- [ ] Custom domain set up (optional)

### Nice to Have (Before Launch)
- [ ] GDPR endpoints implemented
- [ ] Legal documents created
- [ ] App Store submission prep
- [ ] Marketing site

---

## 🚀 Priority Order

1. **Verify API is working** (fix 502 if needed)
2. **Test mobile app connection**
3. **Set up monitoring alerts**
4. **Test end-to-end flow**
5. **Build production mobile app**
6. **Set up custom domain** (optional)
7. **GDPR compliance**
8. **Legal documents**

---

## 📞 Need Help?

- **API Issues:** Check Railway logs
- **Mobile Issues:** Check Expo DevTools
- **Database Issues:** Check Supabase dashboard
- **Redis Issues:** Check Upstash dashboard

---

**Next Action:** Verify API is responding, then test mobile app connection!

