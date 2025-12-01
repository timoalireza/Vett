# Prometheus & Grafana Setup

## Overview

This guide explains how to set up Prometheus and Grafana for monitoring the Vett API using Docker Compose.

## Prerequisites

- Docker and Docker Compose installed
- Vett API running (or accessible at `api:4000` in Docker network)

## Quick Start

1. **Start Prometheus and Grafana**:
   ```bash
   docker-compose up -d prometheus grafana
   ```

2. **Access Grafana**:
   - Open http://localhost:3000
   - Login with `admin` / `admin` (change password on first login)

3. **Access Prometheus**:
   - Open http://localhost:9090
   - Query metrics using PromQL

## Configuration Files

### Prometheus Configuration

Located at `prometheus/prometheus.yml`:

- **Scrape Interval**: 30 seconds
- **Retention**: 30 days
- **Targets**:
  - `vett-api`: Scrapes `/metrics/prometheus` endpoint
  - `vett-worker`: Scrapes worker metrics (if exposed)
  - `node-exporter`: System metrics (optional)
  - `redis-exporter`: Redis metrics (optional)

### Grafana Configuration

- **Data Source**: Automatically configured to use Prometheus
- **Dashboards**: Pre-configured dashboard at `grafana/dashboards/vett-overview.json`
- **Provisioning**: Automatic dashboard and datasource provisioning

## Metrics Endpoints

### Prometheus Format

The API exposes metrics in Prometheus format at:

```
GET /metrics/prometheus
```

This endpoint returns metrics in Prometheus text format, suitable for scraping by Prometheus.

### JSON Format

The API also exposes metrics in JSON format at:

```
GET /metrics
```

This is useful for programmatic access or debugging.

## Available Metrics

### Request Metrics

- `vett_requests_total`: Total HTTP requests
- `vett_requests_errors_total`: Total HTTP errors
- `vett_requests_error_rate`: Error rate percentage

### Response Time Metrics

- `vett_response_time_seconds`: Response time summary (p50, p95, p99)
- `vett_response_time_seconds_avg`: Average response time
- `vett_response_time_seconds_min`: Minimum response time
- `vett_response_time_seconds_max`: Maximum response time

### GraphQL Metrics

- `vett_graphql_queries_total`: Total GraphQL queries
- `vett_graphql_mutations_total`: Total GraphQL mutations
- `vett_graphql_errors_total`: Total GraphQL errors
- `vett_graphql_error_rate`: GraphQL error rate percentage

### Analysis Metrics

- `vett_analysis_submitted_total`: Total analyses submitted
- `vett_analysis_completed_total`: Total analyses completed
- `vett_analysis_failed_total`: Total analyses failed
- `vett_analysis_in_progress`: Current analyses in progress
- `vett_analysis_success_rate`: Analysis success rate percentage
- `vett_analysis_duration_seconds`: Analysis processing duration

### Queue Metrics

- `vett_queue_waiting`: Jobs waiting in queue
- `vett_queue_active`: Active jobs
- `vett_queue_completed_total`: Total completed jobs
- `vett_queue_failed_total`: Total failed jobs
- `vett_queue_delayed`: Delayed jobs

### Cost Metrics

- `vett_costs_openai_tokens_total`: Total OpenAI tokens consumed
- `vett_costs_openai_requests_total`: Total OpenAI API requests
- `vett_costs_estimated_usd`: Estimated cost in USD
- `vett_costs_per_analysis_usd`: Average cost per analysis

### Memory Metrics

- `vett_memory_heap_used_bytes`: Heap memory used
- `vett_memory_heap_total_bytes`: Total heap memory
- `vett_memory_rss_bytes`: Resident Set Size
- `vett_memory_external_bytes`: External memory

## Alerts

Prometheus alerts are configured in `prometheus/rules/alerts.yml`:

1. **HighErrorRate**: Error rate > 5% for 5 minutes
2. **SlowResponseTime**: p95 response time > 2000ms for 5 minutes
3. **HighQueueDepth**: Waiting jobs > 100 for 10 minutes
4. **HighAnalysisFailureRate**: Analysis failure rate > 10% for 10 minutes
5. **HighMemoryUsage**: Memory usage > 80% for 5 minutes
6. **HighRateLimitHits**: Rate limit hits > 50 per hour
7. **APIDown**: API not responding for 1 minute
8. **WorkerDown**: Worker not responding for 1 minute

### Setting Up Alertmanager (Optional)

To receive alerts via email, Slack, or other channels:

1. Add Alertmanager service to `docker-compose.yml`:
   ```yaml
   alertmanager:
     image: prom/alertmanager:latest
     ports:
       - "9093:9093"
     volumes:
       - ./alertmanager/config.yml:/etc/alertmanager/config.yml
   ```

2. Configure `alertmanager/config.yml` with your notification channels

3. Update Prometheus configuration to point to Alertmanager

## Grafana Dashboards

### Pre-configured Dashboard

The `vett-overview` dashboard includes:

- Request rate and error rate
- Response time percentiles (p50, p95, p99)
- Analysis success rate and processing time
- Queue depth
- Cost per analysis
- Memory usage
- Rate limit hits
- GraphQL operations

### Creating Custom Dashboards

1. In Grafana, go to **Dashboards** → **New Dashboard**
2. Add panels using PromQL queries
3. Export dashboard JSON and save to `grafana/dashboards/`

## PromQL Query Examples

### Request Rate
```promql
rate(vett_requests_total[5m])
```

### Error Rate
```promql
vett_requests_error_rate
```

### Average Analysis Time
```promql
vett_analysis_duration_seconds_avg
```

### Cost per Analysis
```promql
vett_costs_per_analysis_usd
```

### Queue Depth
```promql
vett_queue_waiting
```

### Memory Usage Percentage
```promql
(vett_memory_heap_used_bytes / vett_memory_heap_total_bytes) * 100
```

## Production Deployment

### Docker Compose

For production, update `docker-compose.yml`:

1. **Add authentication** to Prometheus scrape configs:
   ```yaml
   basic_auth:
     username: 'prometheus'
     password: 'your-secure-password'
   ```

2. **Use environment variables** for sensitive values:
   ```yaml
   environment:
     - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
   ```

3. **Add volume mounts** for persistent storage:
   ```yaml
   volumes:
     - prometheus_data:/prometheus
     - grafana_data:/var/lib/grafana
   ```

4. **Configure reverse proxy** (nginx/traefik) for external access

### Kubernetes

For Kubernetes deployment:

1. Create ConfigMaps for Prometheus and Grafana configs
2. Deploy Prometheus and Grafana using Helm charts
3. Configure ServiceMonitor for Prometheus to discover API pods
4. Set up Ingress for external access

## Troubleshooting

### Prometheus Not Scraping Metrics

1. Check Prometheus targets: http://localhost:9090/targets
2. Verify API is accessible: `curl http://api:4000/metrics/prometheus`
3. Check Prometheus logs: `docker-compose logs prometheus`

### Grafana Not Showing Data

1. Verify Prometheus data source is configured correctly
2. Check Grafana logs: `docker-compose logs grafana`
3. Test PromQL query in Prometheus UI first

### Metrics Not Updating

1. Verify API is running and accessible
2. Check scrape interval in Prometheus config
3. Verify `/metrics/prometheus` endpoint returns data

## Next Steps

- [ ] Set up Alertmanager for alert notifications
- [ ] Configure additional exporters (node-exporter, redis-exporter)
- [ ] Create custom Grafana dashboards for specific use cases
- [ ] Set up log aggregation (Loki) for correlation
- [ ] Configure distributed tracing (Jaeger/Tempo)



