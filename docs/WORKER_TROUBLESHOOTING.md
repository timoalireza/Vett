# Worker Troubleshooting Guide

**Issue:** Mobile app frozen on "Analyzing..." screen  
**Cause:** Worker not processing jobs from the queue

---

## 🔍 Diagnosis Steps

### Step 1: Check Worker Logs in Railway

**Railway Dashboard** → **Worker Service** → **Logs**

**Look for:**
- ✅ `[Startup] ✅ Database connection successful`
- ✅ `[Startup] ✅ Redis connection successful`
- ✅ `[Startup] ✅ Worker ready and listening for jobs`
- ✅ `Worker started processing job`

**If you see errors:**
- ❌ `Database connection failed` → Check `DATABASE_URL` in Railway
- ❌ `Redis connection failed` → Check `REDIS_URL` in Railway
- ❌ `Worker failed to initialize` → Check Redis connection

### Step 2: Check if Worker is Running

**Railway Dashboard** → **Worker Service** → **Metrics**

- **CPU Usage:** Should be > 0% if processing jobs
- **Memory Usage:** Should be stable
- **Status:** Should be "Running"

### Step 3: Check Queue Status

**Test if jobs are being added to the queue:**

```bash
# Submit a test analysis
curl -X POST https://vett-api-production.up.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { submitAnalysis(input: { text: \"test\", mediaType: \"text/plain\" }) { analysisId status } }"
  }'
```

**Then check Railway logs for:**
- API logs: Should show job added to queue
- Worker logs: Should show "Worker started processing job"

---

## 🐛 Common Issues

### Issue 1: Worker Not Starting

**Symptom:** No startup logs in Railway

**Fix:**
1. Check Railway Worker Service is deployed
2. Check `DATABASE_URL` and `REDIS_URL` are set
3. Check Railway logs for startup errors
4. Restart the Worker service in Railway

### Issue 2: Worker Not Connecting to Redis

**Symptom:** `Redis connection failed` in logs

**Fix:**
1. Verify `REDIS_URL` in Railway Worker Service → Variables
2. Check Redis URL format (should be Upstash Redis URL)
3. Check Railway logs for Redis connection errors
4. Worker will retry automatically, but check logs

### Issue 3: Worker Not Processing Jobs

**Symptom:** Jobs added to queue but worker never processes them

**Possible Causes:**
1. **Worker not ready:** Check for `Worker ready and listening for jobs` in logs
2. **Redis connection issues:** Worker can't connect to Redis to get jobs
3. **Queue name mismatch:** Ensure API and Worker use same queue name ("analysis")
4. **Worker crashed:** Check Railway logs for errors

**Fix:**
1. Check worker logs for `Worker started processing job`
2. Verify Redis connection is working
3. Restart Worker service
4. Check if jobs are accumulating in queue (check Redis)

### Issue 4: Jobs Stuck in QUEUED Status

**Symptom:** Analysis status stays "QUEUED" forever

**Possible Causes:**
1. Worker not running
2. Worker not connected to Redis
3. Worker crashed during processing
4. Database connection failed during processing

**Fix:**
1. Check worker logs for errors
2. Verify worker is running in Railway
3. Check database connection
4. Restart worker service

---

## ✅ Verification

After fixing, verify:

1. **Check startup logs:**
   ```
   [Startup] ✅ Database connection successful
   [Startup] ✅ Redis connection successful
   [Startup] ✅ Worker ready and listening for jobs
   ```

2. **Submit test analysis:**
   ```bash
   curl -X POST https://vett-api-production.up.railway.app/graphql \
     -H "Content-Type: application/json" \
     -d '{
       "query": "mutation { submitAnalysis(input: { text: \"test\", mediaType: \"text/plain\" }) { analysisId status } }"
     }'
   ```

3. **Check worker logs for:**
   - `Worker started processing job`
   - `Analysis job completed`

4. **Check analysis status:**
   ```bash
   curl -X POST https://vett-api-production.up.railway.app/graphql \
     -H "Content-Type: application/json" \
     -d '{
       "query": "query { analysis(id: \"YOUR_ANALYSIS_ID\") { id status } }"
     }'
   ```
   Should show `status: "COMPLETED"` after processing

---

## 📋 Checklist

- [ ] Worker service is deployed in Railway
- [ ] `DATABASE_URL` is set in Worker service variables
- [ ] `REDIS_URL` is set in Worker service variables
- [ ] Worker logs show successful startup
- [ ] Worker logs show "Worker ready and listening for jobs"
- [ ] Jobs are being processed (check logs for "Worker started processing job")
- [ ] Analysis status changes from QUEUED → PROCESSING → COMPLETED

---

## 🆘 Still Having Issues?

1. **Check Railway Logs:**
   - Look for error messages
   - Check startup sequence
   - Verify connections are working

2. **Check Environment Variables:**
   - `DATABASE_URL` must match API service
   - `REDIS_URL` must match API service
   - Both services must use same Redis instance

3. **Restart Worker Service:**
   - Railway Dashboard → Worker Service → Settings → Restart

4. **Check Redis Connection:**
   - Verify `REDIS_URL` is correct
   - Test Redis connection from Railway logs

---

**Once the worker is processing jobs, the "Analyzing..." screen should progress to show results!**

