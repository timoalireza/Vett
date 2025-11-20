# Monitoring & Metrics Setup

## Overview

Vett includes built-in metrics collection for monitoring API performance and health. This guide covers both the built-in metrics and options for advanced monitoring.

## Built-in Metrics

### Metrics Endpoint

The API exposes metrics at `/metrics`:

```bash
curl http://localhost:4000/metrics
```

**Response includes:**
- Request statistics (total, errors, by method, by status code)
- Response time metrics (average, min, max, p95, p99)
- GraphQL metrics (queries, mutations, errors)
- Database metrics (queries, errors)
- Memory usage (heap, RSS)

### Health Metrics Endpoint

Lightweight health check with key metrics:

```bash
curl http://localhost:4000/metrics/health
```

**Response:**
```json
{
  "healthy": true,
  "errorRate": "2.5%",
  "avgResponseTime": "150ms",
  "requests": 1000
}
```

### Reset Metrics

Reset metrics (development/testing only):

```bash
curl -X POST http://localhost:4000/metrics/reset
```

---

## Advanced Monitoring Options

### Option 1: Sentry Performance Monitoring (Recommended - Already Set Up)

**Pros:**
- Already integrated
- Free tier available
- Error tracking + performance in one place
- Easy setup

**Setup:**
1. Add `SENTRY_DSN` to `.env`
2. Sentry automatically tracks:
   - Request performance
   - Error rates
   - Slow queries
   - User context

**See:** `docs/SENTRY_SETUP.md`

---

### Option 2: Prometheus + Grafana (Self-Hosted)

**Pros:**
- Free and open-source
- Full control
- Rich dashboards
- Industry standard

**Setup:**

1. **Install Prometheus client:**
   ```bash
   pnpm --filter vett-api add prom-client
   ```

2. **Create Prometheus plugin:**
   ```typescript
   // apps/api/src/plugins/prometheus.ts
   import client from 'prom-client';
   
   const register = new client.Registry();
   client.collectDefaultMetrics({ register });
   
   // Custom metrics
   const httpRequestDuration = new client.Histogram({
     name: 'http_request_duration_seconds',
     help: 'Duration of HTTP requests in seconds',
     labelNames: ['method', 'route', 'status_code'],
     registers: [register]
   });
   ```

3. **Expose metrics endpoint:**
   ```typescript
   app.get('/metrics', async (request, reply) => {
     reply.type('text/plain');
     return register.metrics();
   });
   ```

4. **Set up Grafana:**
   - Install Grafana
   - Add Prometheus as data source
   - Create dashboards

**Estimated Time:** 2-3 hours

---

### Option 3: Datadog (SaaS - Easiest)

**Pros:**
- Easiest setup
- Great dashboards
- APM included
- Alerting built-in

**Cons:**
- Paid service (~$15-31/month per host)

**Setup:**

1. **Sign up:** https://www.datadoghq.com

2. **Install agent:**
   ```bash
   # On your server
   DD_API_KEY=xxx DD_SITE=datadoghq.com bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script_agent7.sh)"
   ```

3. **Add Node.js APM:**
   ```bash
   pnpm --filter vett-api add dd-trace
   ```

4. **Initialize in code:**
   ```typescript
   // apps/api/src/index.ts (first line)
   import 'dd-trace/init';
   ```

5. **Configure:**
   ```bash
   # .env
   DD_SERVICE=vett-api
   DD_ENV=production
   DD_VERSION=0.1.0
   ```

**Estimated Time:** 30 minutes

---

### Option 4: New Relic (SaaS)

**Pros:**
- Good free tier
- Easy setup
- APM included

**Setup:**

1. **Sign up:** https://newrelic.com

2. **Install agent:**
   ```bash
   pnpm --filter vett-api add newrelic
   ```

3. **Create config file:**
   ```javascript
   // apps/api/newrelic.js
   exports.config = {
     app_name: ['Vett API'],
     license_key: 'YOUR_LICENSE_KEY',
     logging: {
       level: 'info'
     }
   };
   ```

4. **Initialize:**
   ```typescript
   // apps/api/src/index.ts (first line)
   import 'newrelic';
   ```

**Estimated Time:** 30 minutes

---

## Recommended Setup for Production

### Minimum (Free):
1. ✅ Built-in metrics (`/metrics` endpoint)
2. ✅ Sentry (error tracking + basic performance)
3. ✅ Health checks (`/health`, `/ready`, `/live`)

### Recommended (Paid):
1. ✅ Built-in metrics
2. ✅ Sentry (error tracking)
3. ✅ Datadog or New Relic (full APM)
4. ✅ Custom dashboards

---

## Key Metrics to Monitor

### API Metrics
- **Request Rate:** Requests per second
- **Error Rate:** Percentage of failed requests (< 5% target)
- **Latency:** P95, P99 response times (< 2s target)
- **Status Codes:** Distribution of 2xx, 4xx, 5xx

### GraphQL Metrics
- **Query Performance:** Slow queries (> 1s)
- **Query Complexity:** High complexity queries
- **Error Rate:** GraphQL errors

### Database Metrics
- **Query Performance:** Slow queries (> 500ms)
- **Connection Pool:** Active/idle connections
- **Query Rate:** Queries per second

### Worker Metrics
- **Queue Depth:** Number of pending jobs (< 100 target)
- **Processing Time:** Average job duration
- **Failure Rate:** Failed jobs (< 1% target)

### Infrastructure Metrics
- **Memory Usage:** Heap, RSS (< 80% target)
- **CPU Usage:** (< 80% target)
- **Disk Space:** (< 80% target)

---

## Alerting Rules

### Critical Alerts (P0)
- API error rate > 5%
- API latency p95 > 2s
- Database connection failures
- Redis connection failures
- Worker queue depth > 100

### Warning Alerts (P1)
- API error rate > 2%
- API latency p95 > 1s
- Memory usage > 80%
- CPU usage > 80%
- Disk space < 20%

### Info Alerts (P2)
- New error types detected
- Unusual traffic patterns
- Slow query detected

---

## Dashboard Examples

### Operational Dashboard
- Request rate (line chart)
- Error rate (line chart)
- Response time p95/p99 (line chart)
- Status code distribution (pie chart)
- Memory/CPU usage (gauge)

### Business Metrics Dashboard
- Analyses per day (bar chart)
- Average processing time (line chart)
- Success rate (gauge)
- User growth (line chart)
- Subscription conversions (funnel)

---

## Quick Start

### Test Built-in Metrics

```bash
# Start API
pnpm --filter vett-api dev

# Check metrics
curl http://localhost:4000/metrics

# Check health metrics
curl http://localhost:4000/metrics/health
```

### Set Up Sentry (Recommended First Step)

1. Add `SENTRY_DSN` to `.env`
2. Restart API
3. View errors/performance in Sentry dashboard

**See:** `docs/SENTRY_SETUP.md`

---

## Next Steps

1. ✅ Built-in metrics (already implemented)
2. [ ] Set up Sentry DSN (5 minutes)
3. [ ] Set up Datadog/New Relic (30 minutes)
4. [ ] Create dashboards (1-2 hours)
5. [ ] Configure alerts (30 minutes)

---

**Need Help?**
- Sentry: `docs/SENTRY_SETUP.md`
- Prometheus: https://prometheus.io/docs/
- Datadog: https://docs.datadoghq.com/
- New Relic: https://docs.newrelic.com/

