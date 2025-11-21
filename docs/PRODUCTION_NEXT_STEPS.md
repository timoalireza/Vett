# Production Next Steps - After Deployment

**Status:** ✅ API Active | ✅ Worker Active | ⏳ Configuration Needed

## 🎯 Immediate Next Steps (Priority Order)

### 1. Get Railway API Domain & Update Mobile App ⚠️ CRITICAL

**Why:** Mobile app needs to connect to production API

**Steps:**

1. **Get Railway API Domain:**
   - Go to Railway Dashboard → API Service → Settings → Networking
   - Click **"Generate Domain"** (if not already done)
   - Copy the domain (e.g., `vett-api-production.up.railway.app`)

2. **Update Mobile App API URL:**
   ```bash
   # Edit apps/mobile/src/api/graphql.ts
   ```
   
   Update the GraphQL endpoint:
   ```typescript
   const GRAPHQL_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-api-domain.railway.app/graphql';
   ```

3. **Set Environment Variable (Recommended):**
   ```bash
   # Create apps/mobile/.env.production
   EXPO_PUBLIC_API_URL=https://your-api-domain.railway.app
   ```

4. **Update CORS in Railway:**
   - Go to Railway → API Service → Variables
   - Add/Update `ALLOWED_ORIGINS`:
     ```
     ALLOWED_ORIGINS=https://your-api-domain.railway.app,exp://localhost:8081
     ```
   - Note: For Expo development, you may need to add your local IP

**Estimated Time:** 15 minutes

---

### 2. Set Up Custom Domain (Optional but Recommended) ⚠️ MEDIUM PRIORITY

**Why:** Professional domain, better branding, easier to remember

**Steps:**

1. **Purchase Domain** (if not already owned)
   - Use Namecheap, Google Domains, or Cloudflare
   - Example: `vett.app` or `getvett.com`

2. **Configure Custom Domain in Railway:**
   - Railway → API Service → Settings → Networking
   - Click **"Custom Domain"**
   - Enter your domain (e.g., `api.vett.app`)
   - Follow DNS instructions:
     - Add CNAME record: `api` → `your-service.railway.app`
     - Or A record: Point to Railway IP

3. **Update Environment Variables:**
   - Update `ALLOWED_ORIGINS` to include custom domain
   - Update mobile app `EXPO_PUBLIC_API_URL`

4. **Verify SSL:**
   - Railway automatically provisions SSL certificates
   - Wait 5-10 minutes for SSL to activate
   - Test: `curl https://api.vett.app/health`

**Estimated Time:** 30 minutes

---

### 3. Configure Production Monitoring & Alerts ⚠️ HIGH PRIORITY

**Why:** Need visibility into production issues

**Steps:**

#### 3.1 Railway Monitoring (Built-in)

1. **Set Up Alerts:**
   - Railway → API Service → Settings → Notifications
   - Enable email/Slack notifications for:
     - Deployment failures
     - Service crashes
     - High resource usage

2. **Monitor Logs:**
   - Railway → API Service → Deployments → View Logs
   - Set up log retention (Settings → Logs)

#### 3.2 Sentry Alerts (Already Configured)

1. **Verify Sentry is Working:**
   ```bash
   # Check Railway logs for Sentry initialization
   # Should see: "Sentry initialized successfully"
   ```

2. **Set Up Sentry Alerts:**
   - Go to Sentry Dashboard → Settings → Alerts
   - Create alerts for:
     - Error rate > 5%
     - New issues
     - Performance degradation

3. **Configure Release Tracking:**
   - Sentry automatically tracks releases via `SENTRY_RELEASE`
   - Or set manually in Railway variables

#### 3.3 Uptime Monitoring (Optional)

**Options:**
- **UptimeRobot** (Free): Monitor `/health` endpoint
- **Pingdom**: More advanced monitoring
- **Better Uptime**: Simple status page

**Setup:**
1. Create account
2. Add monitor: `https://your-api-domain.railway.app/health`
3. Set check interval: 5 minutes
4. Configure alerts (email/SMS/Slack)

**Estimated Time:** 30 minutes

---

### 4. Test Production Endpoints ⚠️ CRITICAL

**Why:** Verify everything works before mobile app launch

**Steps:**

```bash
# 1. Health Check
curl https://your-api-domain.railway.app/health

# Expected: {"status":"ok","timestamp":"..."}

# 2. Database Check
curl https://your-api-domain.railway.app/ready

# Expected: {"status":"ready","database":"connected",...}

# 3. GraphQL Endpoint
curl -X POST https://your-api-domain.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'

# Expected: {"data":{"__typename":"Query"}}

# 4. Metrics Endpoint
curl https://your-api-domain.railway.app/metrics

# Expected: JSON with metrics data
```

**Test Checklist:**
- [ ] Health endpoint returns 200
- [ ] Database connection works
- [ ] Redis connection works
- [ ] GraphQL endpoint responds
- [ ] Authentication works (test with Clerk token)
- [ ] Rate limiting works (test with multiple requests)

**Estimated Time:** 15 minutes

---

### 5. Configure Mobile App Production Build ⚠️ HIGH PRIORITY

**Why:** Need production-ready mobile app

**Steps:**

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   eas login
   ```

2. **Configure EAS:**
   ```bash
   cd apps/mobile
   eas build:configure
   ```

3. **Create Production Build Profile:**
   ```json
   // eas.json
   {
     "build": {
       "production": {
         "env": {
           "EXPO_PUBLIC_API_URL": "https://your-api-domain.railway.app"
         },
         "android": {
           "buildType": "apk"
         },
         "ios": {
           "buildConfiguration": "Release"
         }
       }
     }
   }
   ```

4. **Build Production App:**
   ```bash
   # Android
   eas build --platform android --profile production
   
   # iOS
   eas build --platform ios --profile production
   ```

**Estimated Time:** 1-2 hours (first build takes longer)

---

### 6. GDPR Compliance Endpoints ⚠️ MEDIUM PRIORITY

**Why:** Legal requirement for EU users

**Steps:**

1. **Create GDPR Routes:**
   ```bash
   # Create apps/api/src/routes/gdpr.ts
   ```

2. **Implement Endpoints:**
   - `GET /gdpr/export` - Export user data
   - `DELETE /gdpr/delete` - Delete user account and data

3. **Register Routes:**
   - Add to `apps/api/src/index.ts`

4. **Test:**
   ```bash
   curl -H "Authorization: Bearer <token>" \
     https://your-api-domain.railway.app/gdpr/export
   ```

**Estimated Time:** 2-3 hours

---

### 7. Legal Documents ⚠️ MEDIUM PRIORITY

**Why:** Required for app stores

**Documents Needed:**
- Privacy Policy
- Terms of Service
- Cookie Policy (if using web)

**Steps:**

1. **Create Privacy Policy:**
   - Use template (e.g., iubenda, Termly)
   - Include:
     - Data collection
     - Data usage
     - Third-party services (Clerk, OpenAI, etc.)
     - User rights (GDPR)
     - Contact information

2. **Create Terms of Service:**
   - Include:
     - Service description
     - User obligations
     - Limitation of liability
     - Subscription terms
     - Cancellation policy

3. **Add to Mobile App:**
   - Create Settings screen
   - Add links to legal documents
   - Show on first launch (acceptance required)

**Estimated Time:** 4-6 hours (with legal review)

---

## 📋 Quick Checklist

### Critical (Do First)
- [ ] Get Railway API domain
- [ ] Update mobile app API URL
- [ ] Test production endpoints
- [ ] Configure CORS for mobile app
- [ ] Set up Sentry alerts

### Important (Do Soon)
- [ ] Set up custom domain
- [ ] Configure uptime monitoring
- [ ] Build production mobile app
- [ ] Test mobile app → API connection

### Nice to Have (Before Launch)
- [ ] GDPR endpoints
- [ ] Legal documents
- [ ] App Store submission prep
- [ ] Marketing site

---

## 🔍 Verification Steps

### 1. API Health
```bash
curl https://your-api-domain.railway.app/health
```

### 2. Database Connection
```bash
curl https://your-api-domain.railway.app/ready
```

### 3. GraphQL Query
```bash
curl -X POST https://your-api-domain.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ subscription { plan } }"}'
```

### 4. Mobile App Connection
- Open mobile app
- Check network requests in Expo DevTools
- Verify API calls succeed

---

## 🚨 Common Issues & Fixes

### Issue: Mobile app can't connect to API
**Fix:**
- Check `ALLOWED_ORIGINS` includes Expo origin
- Verify API URL is correct
- Check Railway logs for CORS errors

### Issue: GraphQL queries fail
**Fix:**
- Verify authentication token is valid
- Check rate limiting (may be hitting limits)
- Review Railway logs for errors

### Issue: Worker not processing jobs
**Fix:**
- Check Worker service is running in Railway
- Verify Redis connection
- Check Worker logs for errors

---

## 📞 Support

- **Railway Issues**: Check Railway Dashboard → Logs
- **Sentry Errors**: Check Sentry Dashboard
- **Database Issues**: Check Supabase Dashboard
- **Mobile App**: Check Expo/EAS logs

---

**Next Action:** Start with Step 1 - Get Railway API domain and update mobile app!

