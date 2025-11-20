# Rate Limiting Implementation

## ✅ Completed

Rate limiting has been implemented with the following configuration:

### Global Rate Limits

- **All Routes**: 100 requests per 15 minutes per IP/user
- **File Uploads**: 5 requests per minute per IP/user
- **Health Endpoints**: 10 requests per minute per IP

### Features

1. **User-Based Rate Limiting**
   - Authenticated users are rate-limited by user ID
   - Unauthenticated users are rate-limited by IP address

2. **Redis Support**
   - In production, uses Redis for distributed rate limiting
   - Falls back to in-memory store if Redis unavailable
   - Works across multiple server instances

3. **Rate Limit Headers**
   - `x-ratelimit-limit`: Maximum requests allowed
   - `x-ratelimit-remaining`: Remaining requests in window
   - `x-ratelimit-reset`: Time when limit resets
   - `retry-after`: Seconds until retry is allowed

4. **Error Responses**
   - Returns 429 Too Many Requests when limit exceeded
   - Includes helpful error message and retry information

## Configuration

Rate limits are configured in `apps/api/src/plugins/rate-limit.ts`:

```typescript
// Global: 100 requests per 15 minutes
max: 100
timeWindow: "15 minutes"

// Uploads: 5 requests per minute
max: 5
timeWindow: "1 minute"

// Health: 10 requests per minute
max: 10
timeWindow: "1 minute"
```

## Testing

### Test Rate Limiting

```bash
# Make 101 requests quickly
for i in {1..101}; do
  curl http://localhost:4000/health
done

# Should see 429 error on 101st request
```

### Check Rate Limit Headers

```bash
curl -i http://localhost:4000/health

# Response headers:
# x-ratelimit-limit: 100
# x-ratelimit-remaining: 99
# x-ratelimit-reset: 1234567890
```

## Production Considerations

1. **Redis Required**: For production with multiple instances, Redis is required for distributed rate limiting
2. **Adjust Limits**: Review and adjust limits based on your traffic patterns
3. **Monitor**: Track rate limit hits to identify abuse or adjust limits

## Customization

To adjust rate limits, edit `apps/api/src/plugins/rate-limit.ts`:

```typescript
// Change global limit
max: 200, // Increase to 200 requests
timeWindow: "15 minutes"

// Change upload limit
max: 10, // Increase to 10 uploads per minute
timeWindow: "1 minute"
```

## Next Steps

- [ ] Monitor rate limit hits in production
- [ ] Adjust limits based on actual usage
- [ ] Consider per-endpoint limits for expensive operations
- [ ] Add rate limit metrics to monitoring dashboard

