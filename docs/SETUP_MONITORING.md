# Set Up Monitoring & Alerts

**Status:** ✅ API Server Working | ⏳ Monitoring Setup Needed

---

## 🎯 Step 1: Railway Alerts

### Enable Email Notifications

1. **Railway Dashboard** → **API Service** → **Settings** → **Notifications**
2. **Enable:**
   - ✅ Email notifications
   - ✅ Deployment failures
   - ✅ Service crashes
   - ✅ High resource usage (>80% CPU/Memory)
   - ✅ Service restarts

3. **Add Email Address:**
   - Enter your email
   - Click "Save"

### Set Up Slack Notifications (Optional)

1. **Railway Dashboard** → **Settings** → **Integrations**
2. **Add Slack Integration:**
   - Connect Slack workspace
   - Select channel for notifications
   - Choose notification types

---

## 🎯 Step 2: Sentry Alerts (If Configured)

### Check Sentry Setup

1. **Verify Sentry is Working:**
   - Check Railway logs for: `"Sentry initialized"`
   - Go to Sentry Dashboard → Your Project
   - Should see project and releases

### Create Alert Rules

1. **Sentry Dashboard** → Your Project → **Settings** → **Alerts**
2. **Create Alert Rules:**

   **Rule 1: High Error Rate**
   - **Name:** "High Error Rate"
   - **Condition:** Error rate > 5% in 5 minutes
   - **Action:** Send email/Slack notification

   **Rule 2: New Issues**
   - **Name:** "New Issues Detected"
   - **Condition:** New issue detected
   - **Action:** Send email/Slack notification

   **Rule 3: Performance Degradation**
   - **Name:** "Slow API Responses"
   - **Condition:** P95 latency > 2 seconds
   - **Action:** Send email/Slack notification

   **Rule 4: Failed Transactions**
   - **Name:** "Failed GraphQL Queries"
   - **Condition:** Transaction failure rate > 10%
   - **Action:** Send email/Slack notification

---

## 🎯 Step 3: Uptime Monitoring (Optional but Recommended)

### Set Up UptimeRobot (Free)

1. **Create Account:**
   - Go to https://uptimerobot.com
   - Sign up for free account

2. **Add Monitor:**
   - Click **"Add New Monitor"**
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** "Vett API Health"
   - **URL:** `https://vett-api-production.up.railway.app/health`
   - **Monitoring Interval:** 5 minutes
   - **Alert Contacts:** Add your email

3. **Add Readiness Monitor:**
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** "Vett API Readiness"
   - **URL:** `https://vett-api-production.up.railway.app/ready`
   - **Expected Status Code:** 200
   - **Monitoring Interval:** 5 minutes

4. **Configure Alerts:**
   - Email notifications
   - SMS notifications (optional, paid)
   - Slack/Telegram (optional)

---

## 🎯 Step 4: Railway Metrics Dashboard

### View Real-Time Metrics

1. **Railway Dashboard** → **API Service** → **Metrics** tab
2. **Monitor:**
   - CPU usage
   - Memory usage
   - Network traffic
   - Request rate
   - Error rate

### Set Up Custom Dashboards (Optional)

1. **Railway Dashboard** → **Metrics** → **Create Dashboard**
2. **Add Widgets:**
   - CPU usage over time
   - Memory usage over time
   - Request rate
   - Error rate
   - Response time (p50, p95, p99)

---

## 🎯 Step 5: Log Monitoring

### View Railway Logs

1. **Railway Dashboard** → **API Service** → **Logs** tab
2. **Filter Logs:**
   - By level (error, warn, info)
   - By search term
   - By time range

### Set Up Log Alerts

1. **Railway Dashboard** → **API Service** → **Settings** → **Alerts**
2. **Create Log-Based Alert:**
   - **Trigger:** Log contains "ERROR" or "FATAL"
   - **Action:** Send notification

---

## ✅ Monitoring Checklist

- [ ] Railway email notifications enabled
- [ ] Railway deployment failure alerts enabled
- [ ] Railway service crash alerts enabled
- [ ] Sentry alert rules created (if Sentry configured)
- [ ] UptimeRobot monitors set up (optional)
- [ ] Railway metrics dashboard reviewed
- [ ] Log monitoring configured

---

## 📊 What to Monitor

### Critical Metrics:
- **API Availability:** Should be >99.9%
- **Error Rate:** Should be <1%
- **Response Time:** P95 should be <2 seconds
- **Database Connection:** Should be healthy
- **Redis Connection:** Should be healthy

### Warning Signs:
- ⚠️ Error rate > 5%
- ⚠️ Response time P95 > 2 seconds
- ⚠️ CPU usage > 80%
- ⚠️ Memory usage > 80%
- ⚠️ Database/Redis connection failures

---

## 🚨 Alert Response Plan

### When You Receive an Alert:

1. **Check Railway Logs:**
   - Identify the error
   - Check recent deployments
   - Review error patterns

2. **Check Service Health:**
   - Test `/health` endpoint
   - Test `/ready` endpoint
   - Check database/Redis connections

3. **Take Action:**
   - If deployment issue: Rollback or fix
   - If resource issue: Scale up
   - If code issue: Fix and redeploy

---

**Next Step:** Test end-to-end flow to ensure everything works together!

