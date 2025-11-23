# Troubleshooting Frozen "Analyzing..." Screen

If your mobile app is stuck on "Analyzing...", follow these steps to diagnose and fix the issue.

## Quick Checks

### 1. Check Worker Service Logs in Railway

1. Go to Railway Dashboard → Worker Service → **Logs** tab
2. Look for these messages:
   - `🚀 Worker process starting - calling startWorker()...`
   - `[Startup] ✅ Worker ready and listening for jobs`
   - `Worker started processing job`

**If you see errors:**
- Database connection errors → Check `DATABASE_URL` in Worker service variables
- Redis connection errors → Check `REDIS_URL` in Worker service variables
- Worker not starting → Check if the start command is correct (`node dist/index.js`)

### 2. Check API Service Logs

1. Go to Railway Dashboard → API Service → **Logs** tab
2. Look for:
   - `[AnalysisService] Analysis {id} enqueued as job {jobId}`
   - Any errors when submitting analysis

**If you see enqueue errors:**
- Redis connection issues → Check `REDIS_URL` in API service variables
- Database errors → Check `DATABASE_URL` in API service variables

### 3. Verify Environment Variables

**For API Service:**
- `DATABASE_URL` - Supabase Connection Pooler URL
- `REDIS_URL` - Upstash Redis URL
- `CLERK_SECRET_KEY` - Clerk secret key
- `RAILWAY_DOCKERFILE_PATH` - Should be `apps/api/Dockerfile`

**For Worker Service:**
- `DATABASE_URL` - Same Supabase Connection Pooler URL as API
- `REDIS_URL` - Same Upstash Redis URL as API
- `RAILWAY_DOCKERFILE_PATH` - Should be `apps/worker/Dockerfile`
- `START_COMMAND` - Should be `node dist/index.js` (or leave empty)

### 4. Check Analysis Status via GraphQL

You can query the analysis status directly:

```graphql
query {
  analysis(id: "YOUR_ANALYSIS_ID") {
    id
    status
    createdAt
    score
    verdict
  }
}
```

**Possible statuses:**
- `QUEUED` - Job is waiting to be processed (normal initially)
- `PROCESSING` - Worker is currently processing (good!)
- `COMPLETED` - Analysis finished successfully
- `FAILED` - Analysis failed (check logs for errors)

### 5. Common Issues and Fixes

#### Issue: Worker Not Processing Jobs

**Symptoms:**
- Analysis stuck in `QUEUED` status
- Worker logs show no job processing messages

**Fixes:**
1. Verify worker is running: Check Railway logs for worker startup messages
2. Check Redis connection: Worker needs Redis to receive jobs
3. Verify BullMQ queue name matches: Both API and Worker use `analysis` queue
4. Restart worker service: Sometimes a restart fixes connection issues

#### Issue: Jobs Not Being Enqueued

**Symptoms:**
- No `[AnalysisService] Analysis enqueued` messages in API logs
- GraphQL mutation succeeds but analysis never starts

**Fixes:**
1. Check API Redis connection: API needs Redis to enqueue jobs
2. Verify BullMQ queue is initialized: Check API startup logs
3. Check for enqueue errors: Look for `Failed to enqueue analysis` in logs

#### Issue: Worker Processing But Failing

**Symptoms:**
- Analysis moves to `PROCESSING` then `FAILED`
- Worker logs show error messages

**Fixes:**
1. Check database connection: Worker needs database access
2. Check API keys: Worker needs OpenAI, Serper, etc.
3. Review error logs: Worker logs will show specific failure reason

### 6. Manual Testing

Test the flow manually:

1. **Submit an analysis** via mobile app
2. **Check API logs** - Should see job enqueued
3. **Check Worker logs** - Should see job processing
4. **Query analysis status** - Should progress from QUEUED → PROCESSING → COMPLETED

### 7. Reset Stuck Analysis

If an analysis is stuck, you can manually update its status in the database:

```sql
UPDATE analyses 
SET status = 'FAILED', 
    summary = 'Manually reset - stuck in processing'
WHERE id = 'YOUR_ANALYSIS_ID' 
  AND status IN ('QUEUED', 'PROCESSING');
```

## Still Stuck?

1. **Check Railway Status**: Ensure both API and Worker services are running
2. **Review Recent Changes**: Check if recent deployments broke something
3. **Compare Logs**: Compare API and Worker logs to see where the flow breaks
4. **Test Locally**: Try running worker locally to see if it processes jobs
