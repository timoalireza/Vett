# How to Check Worker Service Logs

The API service logs you shared show the API is working fine. However, for the frozen "Analyzing..." screen, we need to check the **Worker Service** logs.

---

## 🔍 Where to Find Worker Logs

### Railway Dashboard Steps:

1. **Go to Railway Dashboard:** https://railway.app
2. **Select your project** (Vett)
3. **Find "Worker Service"** (separate from API Service)
4. **Click on Worker Service**
5. **Click "Logs" tab**

---

## ✅ What to Look For in Worker Logs

### Good Signs (Worker Working):
```
[Startup] Initializing worker...
[Startup] ✅ Database connection successful
[Startup] ✅ Redis connection successful
[Startup] ✅ Worker ready and listening for jobs
Worker started processing job
Analysis job completed
```

### Bad Signs (Worker Not Working):
```
[Startup] ❌ Database connection failed
[Startup] ❌ Database password authentication failed
[Startup] ❌ Worker failed to initialize
password authentication failed for user "postgres"
```

---

## 🐛 Common Issues in Worker Logs

### Issue 1: Database Password Error
**Look for:**
```
password authentication failed for user "postgres"
Error Code: 28P01
```

**Fix:** Update `DATABASE_URL` in Worker Service variables (same as API service)

### Issue 2: Worker Not Starting
**Look for:**
- No `[Startup]` messages
- No "Worker ready" message
- Container keeps restarting

**Fix:** Check environment variables and restart Worker Service

### Issue 3: Worker Not Processing Jobs
**Look for:**
- Worker starts successfully
- But no "Worker started processing job" messages
- Jobs stay in QUEUED status

**Fix:** Check Redis connection and queue configuration

---

## 📋 Quick Checklist

- [ ] Worker Service exists in Railway (separate from API Service)
- [ ] Worker Service is running (not stopped/crashed)
- [ ] Worker logs show `[Startup] ✅ Database connection successful`
- [ ] Worker logs show `[Startup] ✅ Worker ready and listening for jobs`
- [ ] Worker logs show `Worker started processing job` when you submit analysis
- [ ] No database password errors
- [ ] No Redis connection errors

---

## 🔧 If Worker Logs Show Errors

### Database Password Error:
1. Railway Dashboard → Worker Service → Variables
2. Update `DATABASE_URL` with correct password
3. Use same connection string as API service
4. Restart Worker Service

### Redis Connection Error:
1. Railway Dashboard → Worker Service → Variables
2. Verify `REDIS_URL` is set correctly
3. Should match API service `REDIS_URL`
4. Restart Worker Service

### Worker Not Starting:
1. Check all required environment variables are set
2. Check Railway logs for startup errors
3. Restart Worker Service
4. Wait 2-3 minutes for full startup

---

**The API service logs you shared look perfect. Now we need to check the Worker Service logs to see why jobs aren't being processed!**

