# Monitoring & Metrics

## Overview

The API includes comprehensive metrics collection for monitoring system health, performance, and costs. Metrics are exposed via HTTP endpoints and can be integrated with monitoring tools like Prometheus, Grafana, or Datadog.

## Metrics Endpoints

### `GET /metrics`

Returns comprehensive metrics in JSON format:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "requests": {
    "total": 10000,
    "errors": 50,
    "errorRate": "0.50%",
    "byMethod": { "GET": 8000, "POST": 2000 },
    "byStatus": { "200": 9500, "400": 30, "500": 20 }
  },
  "responseTime": {
    "average": 150,
    "min": 10,
    "max": 2000,
    "p50": 120,
    "p95": 500,
    "p99": 1000
  },
  "graphql": {
    "queries": 5000,
    "mutations": 2000,
    "errors": 10,
    "errorRate": "0.14%",
    "byOperation": {
      "submitAnalysis": 1500,
      "analyses": 3000
    }
  },
  "database": {
    "queries": 15000,
    "errors": 5,
    "errorRate": "0.03%"
  },
  "analysis": {
    "submitted": 2000,
    "completed": 1900,
    "failed": 100,
    "inProgress": 0,
    "successRate": "95.00%",
    "averageTimeMs": 8500,
    "averageTimeSec": "8.50",
    "byStatus": {
      "COMPLETED": 1900,
      "FAILED": 100
    },
    "byTopic": {
      "health": 500,
      "politics": 300
    }
  },
  "rateLimits": {
    "hits": 25,
    "byTier": {
      "authenticated": 10,
      "anonymous": 15
    }
  },
  "queue": {
    "waiting": 5,
    "active": 2,
    "completed": 10000,
    "failed": 50,
    "delayed": 0
  },
  "costs": {
    "openaiTokens": 5000000,
    "openaiRequests": 10000,
    "estimatedCostUSD": "12.5000",
    "averageCostPerAnalysis": "0.0066"
  },
  "memory": {
    "heapUsed": 150,
    "heapTotal": 200,
    "rss": 300,
    "external": 50
  }
}
```

### `GET /metrics/health`

Lightweight health check endpoint:

```json
{
  "healthy": true,
  "errorRate": "0.50%",
  "avgResponseTime": "150ms",
  "requests": 10000
}
```

Health criteria:
- `healthy: true` if error rate < 5% AND average response time < 2000ms
- Otherwise `healthy: false`

### `POST /metrics/reset`

Resets all metrics (requires authentication in production).

## Metrics Categories

### Request Metrics

- **Total Requests**: Count of all HTTP requests
- **Errors**: Count of 4xx and 5xx responses
- **Error Rate**: Percentage of requests that resulted in errors
- **By Method**: Breakdown by HTTP method (GET, POST, etc.)
- **By Status**: Breakdown by HTTP status code

### Response Time Metrics

- **Average**: Mean response time in milliseconds
- **Min/Max**: Minimum and maximum response times
- **Percentiles**: p50, p95, p99 response times
  - Calculated from last 1000 samples for accuracy
  - Samples are stored in memory for percentile calculation

### GraphQL Metrics

- **Queries**: Count of GraphQL queries executed
- **Mutations**: Count of GraphQL mutations executed
- **Errors**: Count of GraphQL errors
- **By Operation**: Breakdown by operation name (e.g., `submitAnalysis`, `analyses`)

### Database Metrics

- **Queries**: Count of database queries executed
- **Errors**: Count of database errors
- **Error Rate**: Percentage of queries that failed

### Analysis Pipeline Metrics

- **Submitted**: Total analyses submitted
- **Completed**: Successfully completed analyses
- **Failed**: Failed analyses
- **In Progress**: Currently processing analyses
- **Success Rate**: Percentage of analyses that completed successfully
- **Average Time**: Mean analysis processing time (ms and seconds)
- **By Status**: Breakdown by analysis status (COMPLETED, FAILED, etc.)
- **By Topic**: Breakdown by analysis topic

### Rate Limit Metrics

- **Hits**: Total number of rate limit hits (429 responses)
- **By Tier**: Breakdown by user tier (authenticated vs anonymous)

### Queue Metrics

- **Waiting**: Jobs waiting in queue
- **Active**: Jobs currently being processed
- **Completed**: Total completed jobs
- **Failed**: Total failed jobs
- **Delayed**: Jobs scheduled for future execution

Queue metrics are updated every 30 seconds from BullMQ.

### Cost Metrics

- **OpenAI Tokens**: Total tokens consumed
- **OpenAI Requests**: Total API requests made
- **Estimated Cost**: Estimated cost in USD
- **Average Cost Per Analysis**: Mean cost per completed analysis

Cost estimation uses approximate pricing:
- GPT-4o-mini: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- Actual costs may vary based on usage patterns

### Memory Metrics

- **Heap Used**: Memory used by JavaScript heap (MB)
- **Heap Total**: Total heap size allocated (MB)
- **RSS**: Resident Set Size - total memory allocated (MB)
- **External**: Memory used by C++ objects bound to JavaScript objects (MB)

## Integration with Monitoring Tools

### Prometheus

To integrate with Prometheus, create an exporter that scrapes `/metrics`:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'vett-api'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['api.vett.app:4000']
```

### Grafana Dashboard

Create a Grafana dashboard using the metrics endpoint:

1. Add Prometheus data source (or use JSON API data source)
2. Create panels for:
   - Request rate and error rate
   - Response time percentiles (p50, p95, p99)
   - Analysis success rate and average time
   - Queue depth
   - Cost per analysis
   - Memory usage

### Alerts

Recommended alerts:

1. **High Error Rate**: Error rate > 5% for 5 minutes
2. **Slow Response Time**: p95 response time > 2000ms for 5 minutes
3. **High Queue Depth**: Waiting jobs > 100 for 10 minutes
4. **Analysis Failures**: Analysis failure rate > 10% for 10 minutes
5. **High Memory Usage**: Heap used > 80% of heap total
6. **Rate Limit Hits**: Rate limit hits > 50 per hour

## Programmatic Access

Metrics can be accessed programmatically:

```typescript
import { getMetrics } from "./plugins/metrics.js";

const metrics = getMetrics();
console.log(`Total requests: ${metrics.requests.total}`);
console.log(`Analysis success rate: ${metrics.analysis.completed / metrics.analysis.submitted}`);
```

## Tracking Custom Metrics

To track custom metrics:

```typescript
import {
  trackAnalysisSubmitted,
  trackAnalysisCompleted,
  trackAnalysisFailed,
  trackOpenAIUsage
} from "./plugins/metrics.js";

// Track analysis submission
trackAnalysisSubmitted();

// Track analysis completion with duration
trackAnalysisCompleted(8500, "health"); // duration in ms, topic

// Track analysis failure
trackAnalysisFailed("politics");

// Track OpenAI usage
trackOpenAIUsage(1000, 0.0015); // tokens, estimated cost in USD
```

## Performance Considerations

- Metrics are stored in memory (not persisted)
- Response time samples are limited to last 1000 samples
- Queue metrics are updated every 30 seconds
- Metrics reset on server restart
- For production, consider:
  - Exporting metrics to a time-series database
  - Using Redis for distributed metrics
  - Implementing metric retention policies

## Production Checklist

- [ ] Set up Prometheus/Grafana or similar monitoring tool
- [ ] Configure alerts for critical metrics
- [ ] Monitor cost metrics to track API spending
- [ ] Set up dashboards for key metrics
- [ ] Review metrics regularly to identify trends
- [ ] Adjust rate limits based on metrics
- [ ] Monitor queue depth to scale workers if needed



