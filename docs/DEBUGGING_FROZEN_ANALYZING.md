# Debugging Frozen "Analyzing..." Screen

**Issue:** Mobile app stuck on "Analyzing..." screen  
**Symptoms:** Analysis status never changes from QUEUED/PROCESSING to COMPLETED

---

## 🔍 Quick Diagnosis

### Step 1: Get Analysis ID

The analysis ID is shown in the URL when you're on the result screen:
- URL format: `/result/[ANALYSIS_ID]`
- Or check the mobile app logs/console

### Step 2: Check Analysis Status

**Option A: Use Troubleshooting Script**
```bash
./scripts/troubleshoot-analysis.sh YOUR_ANALYSIS_ID
```

**Option B: Manual Check**
```bash
curl -X POST https://vett-api-production.up.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { analysis(id: \"YOUR_ANALYSIS_ID\") { id status createdAt updatedAt } }"
  }'
```

### Step 3: Check Status Values

- **QUEUED** → Worker not processing jobs
- **PROCESSING** → Worker is working (wait longer)
- **COMPLETED** → Analysis done (app should show results)
- **FAILED** → Analysis failed (check logs)
- **null** → Analysis not found (check ID)

---

## 🐛 Common Issues & Fixes

### Issue 1: Status Stuck on QUEUED

**Symptom:** Analysis status is "QUEUED" and never changes

**Causes:**
1. Worker not running
2. Worker not connected to Redis
3. Worker not connected to database
4. Jobs not being picked up from queue

**Fix:**
1. **Check Railway Worker Service logs:**
   - Look for: `[Startup] ✅ Database connection successful`
   - Look for: `[Startup] ✅ Worker ready and listening for jobs`
   - Look for: `Worker started processing job`

2. **Verify Environment Variables:**
   - Railway Dashboard → Worker Service → Variables
   - Check `DATABASE_URL` is set correctly
   - Check `REDIS_URL` is set correctly
   - Both should match API service values

3. **Restart Worker Service:**
   - Railway Dashboard → Worker Service → Settings → Restart

### Issue 2: Status Stuck on PROCESSING

**Symptom:** Analysis status is "PROCESSING" for a long time (>5 minutes)

**Causes:**
1. Worker crashed during processing
2. Analysis pipeline taking too long
3. External API timeouts (OpenAI, search APIs)

**Fix:**
1. **Check Worker Logs:**
   - Look for errors during processing
   - Look for timeout errors
   - Look for API errors

2. **Check Analysis Updated Time:**
   ```bash
   curl -X POST https://vett-api-production.up.railway.app/graphql \
     -H "Content-Type: application/json" \
     -d '{
       "query": "query { analysis(id: \"YOUR_ID\") { status updatedAt } }"
     }'
   ```
   - If `updatedAt` is old (>5 minutes), worker likely crashed

3. **Restart Worker Service:**
   - Railway Dashboard → Worker Service → Settings → Restart

### Issue 3: Analysis Returns null

**Symptom:** GraphQL query returns `null` for analysis

**Causes:**
1. Analysis ID is incorrect
2. Analysis was never created
3. Database connection issue
4. Authorization issue (rare for unauthenticated)

**Fix:**
1. **Verify Analysis ID:**
   - Check URL in mobile app
   - Check logs from `submitAnalysis` mutation

2. **Check if Analysis Exists:**
   - Check Railway API logs for creation errors
   - Check database directly (if you have access)

3. **Check API Logs:**
   - Railway Dashboard → API Service → Logs
   - Look for errors during `submitAnalysis`

### Issue 4: Mobile App Not Polling

**Symptom:** App shows "Analyzing..." but never updates

**Causes:**
1. GraphQL query failing silently
2. Network errors
3. CORS issues
4. App not refetching

**Fix:**
1. **Check Mobile App Logs:**
   - Look for GraphQL errors
   - Look for network errors
   - Check if queries are being made

2. **Test GraphQL Query Directly:**
   ```bash
   curl -X POST https://vett-api-production.up.railway.app/graphql \
     -H "Content-Type: application/json" \
     -d '{
       "query": "query { analysis(id: \"YOUR_ID\") { id status } }"
     }'
   ```

3. **Check CORS:**
   - Verify `ALLOWED_ORIGINS` in Railway API Service
   - Should include your mobile app's origin

---

## 📋 Diagnostic Checklist

- [ ] Analysis ID is correct
- [ ] Analysis exists in database (query returns data)
- [ ] Analysis status is QUEUED/PROCESSING/COMPLETED (not null)
- [ ] Worker Service is running in Railway
- [ ] Worker Service has correct `DATABASE_URL`
- [ ] Worker Service has correct `REDIS_URL`
- [ ] Worker logs show successful startup
- [ ] Worker logs show "Worker ready and listening for jobs"
- [ ] Worker logs show "Worker started processing job" (if QUEUED)
- [ ] API Service is healthy (`/health` endpoint)
- [ ] API Service database connection works (`/ready` endpoint)
- [ ] API Service Redis connection works (`/ready` endpoint)
- [ ] GraphQL query works (test manually)
- [ ] Mobile app can reach API (check network logs)

---

## 🔧 Step-by-Step Troubleshooting

### 1. Check API Health
```bash
curl https://vett-api-production.up.railway.app/health
curl https://vett-api-production.up.railway.app/ready
```

### 2. Submit Test Analysis
```bash
curl -X POST https://vett-api-production.up.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { submitAnalysis(input: { text: \"test\", mediaType: \"text/plain\" }) { analysisId status } }"
  }'
```

### 3. Check Analysis Status
```bash
# Replace ANALYSIS_ID with the ID from step 2
curl -X POST https://vett-api-production.up.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { analysis(id: \"ANALYSIS_ID\") { id status createdAt updatedAt } }"
  }'
```

### 4. Check Worker Logs
- Railway Dashboard → Worker Service → Logs
- Look for startup messages
- Look for job processing messages
- Look for errors

### 5. Check API Logs
- Railway Dashboard → API Service → Logs
- Look for GraphQL query errors
- Look for database errors

---

## 🆘 Still Stuck?

1. **Check Railway Logs:**
   - API Service → Logs (for GraphQL errors)
   - Worker Service → Logs (for processing errors)

2. **Check Environment Variables:**
   - API Service → Variables
   - Worker Service → Variables
   - Verify all required variables are set

3. **Restart Services:**
   - Restart API Service
   - Restart Worker Service
   - Wait 2-3 minutes for full startup

4. **Check Database:**
   - Verify analysis record exists
   - Check `status` column value
   - Check `updated_at` timestamp

5. **Check Redis:**
   - Verify jobs are in queue
   - Check if worker is consuming jobs

---

**Once the worker is processing jobs and analysis status changes to COMPLETED, the mobile app should automatically show results!**

