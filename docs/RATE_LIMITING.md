# Rate Limiting Implementation

## Overview

Rate limiting has been implemented to prevent API abuse, control costs, and ensure fair usage across all users. The system uses tier-based rate limits that scale with subscription plans.

## Configuration

Rate limiting can be configured via environment variables:

```bash
# Enable/disable rate limiting (default: true)
RATE_LIMIT_ENABLED=true

# Global rate limit for authenticated users (default: 1000 requests per window)
RATE_LIMIT_GLOBAL_MAX=1000

# Rate limit window (default: "15 minutes")
RATE_LIMIT_GLOBAL_WINDOW=15 minutes

# Rate limit for anonymous/unauthenticated users (default: 100 requests per window)
RATE_LIMIT_ANONYMOUS_MAX=100

# Rate limit for GraphQL mutations (default: 50 mutations per window)
RATE_LIMIT_MUTATION_MAX=50

# Rate limit for file uploads (default: 20 uploads per window)
RATE_LIMIT_UPLOAD_MAX=20
```

## Rate Limits by Subscription Tier

### FREE Tier
- **Global Requests**: 200 per 15 minutes
- **Mutations**: 30 per 15 minutes
- **Uploads**: 10 per 15 minutes

### PLUS Tier
- **Global Requests**: 1,000 per 15 minutes
- **Mutations**: 100 per 15 minutes
- **Uploads**: 50 per 15 minutes

### PRO Tier
- **Global Requests**: 5,000 per 15 minutes
- **Mutations**: 500 per 15 minutes
- **Uploads**: 200 per 15 minutes

### Anonymous/Unauthenticated
- **Global Requests**: 100 per 15 minutes (configurable via `RATE_LIMIT_ANONYMOUS_MAX`)
- **Mutations**: 25 per 15 minutes (half of `RATE_LIMIT_MUTATION_MAX`)
- **Uploads**: 10 per 15 minutes (half of `RATE_LIMIT_UPLOAD_MAX`)

## Implementation Details

### Global Rate Limiting
- Applied to all routes via `@fastify/rate-limit`
- Uses Redis for distributed rate limiting in production
- Falls back to in-memory store if Redis is unavailable
- Rate limits are per-user (authenticated) or per-IP (anonymous)

### GraphQL Mutation Rate Limiting
- Separate, stricter limits for mutations (`submitAnalysis`, `deleteAnalysis`, etc.)
- Implemented via custom hook in GraphQL plugin
- Uses in-memory store (can be upgraded to Redis for distributed limiting)
- Applied before mutation execution

### Upload Rate Limiting
- Separate limits for file upload endpoints
- Stricter than global limits to prevent abuse
- Per-user or per-IP based on authentication

### Health Endpoint Rate Limiting
- More lenient limits (60 requests per minute)
- Prevents health check abuse while allowing monitoring

## Rate Limit Headers

All rate-limited responses include the following headers:

- `x-ratelimit-limit`: Maximum number of requests allowed in the window
- `x-ratelimit-remaining`: Number of requests remaining in the current window
- `x-ratelimit-reset`: Unix timestamp when the rate limit resets
- `retry-after`: Number of seconds to wait before retrying (when rate limited)

## Error Response

When rate limited, the API returns:

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Maximum X requests per 15 minutes.",
  "retryAfter": 123
}
```

HTTP Status Code: `429 Too Many Requests`

## Redis Configuration

In production, rate limiting uses Redis for distributed rate limiting across multiple server instances. The Redis client is configured with:
- Unlimited retries (`maxRetriesPerRequest: null`)
- Automatic fallback to in-memory store on Redis failure
- Graceful degradation to ensure service availability

## Monitoring

Rate limiting metrics should be monitored:
- Rate limit hit frequency
- Distribution of rate limits by tier
- Peak usage patterns
- Redis connection health for distributed limiting

## Future Enhancements

1. **Redis-based mutation rate limiting**: Currently uses in-memory store
2. **Dynamic rate limit adjustment**: Adjust limits based on system load
3. **Rate limit exemptions**: Allow certain operations to bypass limits
4. **Rate limit analytics**: Dashboard showing rate limit usage by user/tier

## Testing

To test rate limiting:

```bash
# Test global rate limit
for i in {1..150}; do
  curl -H "Authorization: Bearer $TOKEN" https://api.vett.app/graphql \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"query": "{ health { status } }"}'
done

# Test mutation rate limit
for i in {1..60}; do
  curl -H "Authorization: Bearer $TOKEN" https://api.vett.app/graphql \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"query": "mutation { submitAnalysis(input: { ... }) { analysisId } }"}'
done
```

## Production Checklist

- [ ] Verify `RATE_LIMIT_ENABLED=true` in production
- [ ] Configure appropriate limits for your expected traffic
- [ ] Ensure Redis is available for distributed rate limiting
- [ ] Monitor rate limit hit rates
- [ ] Set up alerts for high rate limit hit frequency
- [ ] Test rate limiting with production-like traffic
