# Production Verification Checklist

**Status:** ✅ API Running | ✅ Worker Running | ⏳ Verification Needed

## ✅ Completed

- [x] API deployed and running
- [x] Worker deployed and running
- [x] Database connected (Supabase)
- [x] Redis connected (Upstash)
- [x] CORS configured
- [x] Mobile app API URL updated

---

## 🧪 Step 1: Verify API Endpoints

### Health Check
```bash
curl https://vett-api-production.up.railway.app/health
```

**Expected:** `{"status":"ok","timestamp":"...","uptime":...}`

### Database Connection
```bash
curl https://vett-api-production.up.railway.app/ready
```

**Expected:** `{"status":"ready","database":"connected","redis":"connected"}`

### GraphQL Endpoint
```bash
curl -X POST https://vett-api-production.up.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

**Expected:** `{"data":{"__typename":"Query"}}`

### Metrics Endpoint
```bash
curl https://vett-api-production.up.railway.app/metrics
```

**Expected:** JSON with metrics data

---

## 📱 Step 2: Test Mobile App Connection

### Start Expo Development Server
```bash
cd apps/mobile
npx expo start
```

### Test GraphQL Query

In your mobile app, try a simple query:
```graphql
query {
  __typename
}
```

**Check:**
- [ ] No CORS errors
- [ ] Request succeeds
- [ ] Response received
- [ ] Network tab shows correct API URL

### Test Authenticated Query (if Clerk is integrated)
```graphql
query {
  subscription {
    plan
    status
  }
}
```

---

## 🔍 Step 3: Verify Key Functionality

### Test Analysis Submission Flow

1. **Submit Analysis:**
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

2. **Check Worker Processes Job:**
   - Railway → Worker Service → Logs
   - Should see job processing messages

3. **Poll for Results:**
   ```graphql
   query {
     analysis(id: "ANALYSIS_ID") {
       status
       score
       verdict
     }
   }
   ```

---

## 📊 Step 4: Monitor Production

### Railway Monitoring

1. **Check Service Health:**
   - Railway Dashboard → API Service → Metrics
   - Verify CPU, Memory, Network usage

2. **Check Logs:**
   - Railway → API Service → Deployments → View Logs
   - Look for errors or warnings

3. **Set Up Alerts:**
   - Railway → API Service → Settings → Notifications
   - Enable email/Slack alerts for:
     - Deployment failures
     - Service crashes
     - High resource usage

### Sentry Monitoring

1. **Verify Sentry is Working:**
   - Check Railway logs for "Sentry initialized"
   - Go to Sentry Dashboard
   - Should see project and releases

2. **Set Up Alerts:**
   - Sentry → Settings → Alerts
   - Create alerts for:
     - Error rate > 5%
     - New issues
     - Performance degradation

---

## 🎯 Step 5: Performance Testing

### Load Test (Optional)

```bash
# Install k6 (if not installed)
brew install k6

# Create test script: load-test.js
export default function() {
  http.get('https://vett-api-production.up.railway.app/health');
}

# Run load test
k6 run --vus 10 --duration 30s load-test.js
```

**Check:**
- Response times < 500ms
- No errors
- Railway metrics show healthy usage

---

## ✅ Verification Checklist

### Infrastructure
- [ ] API responds to health checks
- [ ] Database connection works
- [ ] Redis connection works
- [ ] GraphQL endpoint responds
- [ ] Worker processes jobs

### Mobile App
- [ ] Mobile app connects to API
- [ ] No CORS errors
- [ ] GraphQL queries work
- [ ] Authentication works (if implemented)

### Monitoring
- [ ] Railway metrics visible
- [ ] Sentry tracking errors
- [ ] Alerts configured
- [ ] Logs accessible

### Performance
- [ ] Response times acceptable
- [ ] No memory leaks
- [ ] Database queries optimized
- [ ] Rate limiting works

---

## 🚀 Next Steps After Verification

1. **Set Up Custom Domain** (Optional)
   - Purchase domain
   - Configure in Railway
   - Update mobile app URL

2. **Build Production Mobile App**
   - Configure EAS
   - Build for iOS/Android
   - Test production build

3. **GDPR Compliance**
   - Implement data export endpoint
   - Implement data deletion endpoint
   - Test compliance

4. **Legal Documents**
   - Create Privacy Policy
   - Create Terms of Service
   - Add to mobile app

---

## 🐛 Troubleshooting

### API Not Responding
- Check Railway logs
- Verify environment variables
- Check database connection

### Mobile App Can't Connect
- Verify CORS settings
- Check API URL in app.json
- Test with curl first

### Worker Not Processing Jobs
- Check Worker logs
- Verify Redis connection
- Check queue configuration

---

**Once all checks pass, your production environment is ready! 🎉**

