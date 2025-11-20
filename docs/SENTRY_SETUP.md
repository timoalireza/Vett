# Sentry Error Tracking Setup

## Overview

Sentry is configured for error tracking and performance monitoring in the Vett API. It's **optional** but **highly recommended** for production.

## Quick Setup

### Step 1: Create Sentry Project

1. Go to https://sentry.io
2. Sign up / Log in
3. Create a new project:
   - **Platform:** Node.js
   - **Framework:** Fastify
   - **Name:** Vett API

### Step 2: Get DSN

1. After creating the project, Sentry will show your DSN
2. Copy the DSN (format: `https://xxx@xxx.ingest.sentry.io/xxx`)

### Step 3: Configure Environment Variables

Add to your `.env` file:

```bash
# Production
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions
```

Or for development/testing:

```bash
# Development (optional - won't send events, just logs)
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=1.0  # 100% in dev for testing
```

### Step 4: Restart API

```bash
pnpm --filter vett-api dev
```

You should see: `✅ Sentry error tracking enabled`

---

## Configuration Options

### SENTRY_DSN
- **Required:** Yes (if you want error tracking)
- **Format:** `https://xxx@xxx.ingest.sentry.io/xxx`
- **Description:** Your Sentry project DSN

### SENTRY_ENVIRONMENT
- **Required:** No (defaults to `NODE_ENV`)
- **Options:** `production`, `staging`, `development`
- **Description:** Environment name for filtering errors in Sentry

### SENTRY_TRACES_SAMPLE_RATE
- **Required:** No (defaults to `0.1` in production, `1.0` in development)
- **Range:** `0.0` to `1.0`
- **Description:** Percentage of transactions to trace
  - `0.1` = 10% (recommended for production)
  - `1.0` = 100% (for testing/debugging)
  - `0.0` = No performance monitoring

---

## Features

### ✅ Automatic Error Tracking

All unhandled errors are automatically sent to Sentry with:
- Stack traces
- Request context (method, URL, headers)
- User context (if authenticated)
- Request ID for tracing

### ✅ User Context

When a user is authenticated, Sentry automatically tracks:
- User ID
- Email address
- Username

This helps you see which users are experiencing errors.

### ✅ Request ID Tracking

Every request gets a unique ID that:
- Appears in logs
- Appears in Sentry events
- Helps trace errors across services

### ✅ Performance Monitoring

Sentry tracks:
- API response times
- Slow queries
- External API call performance

### ✅ Filtered Errors

The following are **not** sent to Sentry:
- Health check endpoints (`/health`, `/ready`, `/live`)
- Rate limit errors (expected behavior)
- Client errors (4xx status codes)

---

## Testing

### Test Error Tracking

```bash
# Trigger a test error
curl http://localhost:4000/test-error

# Or in GraphQL:
# mutation { testError }
```

### Verify in Sentry

1. Go to Sentry Dashboard → Issues
2. You should see the error appear within seconds
3. Click on it to see full details

---

## Production Checklist

- [ ] Sentry project created
- [ ] DSN added to production `.env`
- [ ] `SENTRY_ENVIRONMENT=production` set
- [ ] `SENTRY_TRACES_SAMPLE_RATE=0.1` configured
- [ ] Test error sent successfully
- [ ] Alerts configured in Sentry
- [ ] Team members added to Sentry project

---

## Alerts Setup

### Recommended Alerts

1. **High Error Rate**
   - Trigger: > 10 errors in 5 minutes
   - Action: Email/Slack notification

2. **New Error Type**
   - Trigger: New error type detected
   - Action: Email notification

3. **Performance Degradation**
   - Trigger: P95 latency > 2s
   - Action: Email notification

### Setting Up Alerts

1. Go to Sentry → Alerts
2. Click "Create Alert Rule"
3. Configure conditions
4. Add notification channels (Email, Slack, etc.)

---

## Troubleshooting

### Errors Not Appearing in Sentry

1. **Check DSN is set:**
   ```bash
   echo $SENTRY_DSN
   ```

2. **Check API logs:**
   - Look for "✅ Sentry error tracking enabled"
   - Check for Sentry-related errors

3. **Test with a manual error:**
   ```typescript
   Sentry.captureException(new Error("Test error"));
   ```

### Too Many Events

- Lower `SENTRY_TRACES_SAMPLE_RATE` (e.g., `0.05` = 5%)
- Add more filters in `beforeSend` hook
- Check if health checks are being filtered

### Performance Impact

- Sentry is async and non-blocking
- Sample rate controls overhead
- Use `0.1` (10%) in production for minimal impact

---

## Cost Considerations

**Sentry Free Tier:**
- 5,000 events/month
- 10,000 performance units/month
- 1 project
- 1 team member

**Sentry Team Tier ($26/month):**
- 50,000 events/month
- 100,000 performance units/month
- Unlimited projects
- Unlimited team members

**Recommendation:** Start with free tier, upgrade when needed.

---

## Next Steps

1. ✅ Set up Sentry project
2. ✅ Add DSN to production `.env`
3. ✅ Configure alerts
4. ✅ Test error tracking
5. ✅ Monitor errors in production

---

**Need Help?**
- Sentry Docs: https://docs.sentry.io/platforms/javascript/guides/node/
- Sentry Support: https://sentry.io/support/

