# GraphQL Query Caching

## Overview

Vett implements Redis-based caching for GraphQL queries to improve performance and reduce database load. Queries are automatically cached with user-specific keys, and mutations automatically invalidate relevant cache entries.

## Features

- ✅ **Automatic Query Caching**: All GraphQL queries are cached for 5 minutes
- ✅ **User-Specific Cache Keys**: Each user's queries are cached separately
- ✅ **Mutation Cache Invalidation**: Mutations automatically invalidate related cache
- ✅ **Redis Backend**: Uses Redis database index 1 (separate from rate limiting)
- ✅ **Graceful Degradation**: Falls back to no caching if Redis is unavailable

## How It Works

### Query Caching

1. **Cache Check**: When a GraphQL query arrives, the system checks Redis for a cached result
2. **Cache Hit**: If found, the cached result is returned immediately (no database query)
3. **Cache Miss**: If not found, the query executes normally
4. **Cache Write**: Successful query results are cached for 5 minutes

### Cache Key Generation

Cache keys are generated from:
- Query string (normalized)
- Variables (sorted for consistency)
- User ID (for user-specific queries)

Example cache key:
```
graphql:query:query { analysis(id: "123") { score } }:{"id":"123"}:user:user_abc123
```

### Mutation Handling

- Mutations are **never cached** (always execute)
- Mutations automatically invalidate related cache entries
- User cache is invalidated when usage changes

## Configuration

### Environment Variables

No additional configuration needed! The cache service uses the existing `REDIS_URL` environment variable.

### Cache TTL

Default cache TTL is **5 minutes (300 seconds)**. This can be adjusted in `apps/api/src/services/cache-service.ts`:

```typescript
await cacheService.cacheGraphQLQuery(
  query,
  variables,
  result,
  300, // TTL in seconds - adjust here
  userId
);
```

### Redis Database Index

The cache service uses Redis database index **1** (separate from rate limiting which uses index 0). This keeps cache and rate limit data separate.

## Cache Invalidation

### Automatic Invalidation

Cache is automatically invalidated when:
- User submits a new analysis (invalidates user's cache)
- Analysis is updated (invalidates analysis-specific cache)

### Manual Invalidation

You can manually invalidate cache:

```typescript
import { cacheService } from "./services/cache-service.js";

// Invalidate all cache for a user
await cacheService.invalidateUserCache(userId);

// Invalidate cache for a specific analysis
await cacheService.invalidateAnalysis(analysisId, userId);
```

## Performance Impact

### Expected Improvements

- **Query Response Time**: 50-90% reduction for cached queries
- **Database Load**: Significant reduction for frequently accessed data
- **API Throughput**: Increased capacity for read-heavy workloads

### Cache Hit Rate

Monitor cache effectiveness:
- Check Redis keys: `redis-cli KEYS "graphql:query:*"`
- Monitor cache hit/miss metrics (future enhancement)

## Testing

### Disable Caching in Tests

Caching is automatically disabled in test environment (`NODE_ENV=test`).

### Manual Testing

1. **First Request**: Should hit database (cache miss)
2. **Second Request**: Should return cached result (cache hit) - much faster
3. **After Mutation**: Cache should be invalidated, next query hits database

### Example Test Query

```graphql
query {
  analysis(id: "test-id") {
    score
    verdict
  }
}
```

Run this query twice - the second should be significantly faster if caching is working.

## Monitoring

### Redis Commands

```bash
# Check cache keys
redis-cli -n 1 KEYS "graphql:query:*"

# Check cache size
redis-cli -n 1 DBSIZE

# Clear all cache (use with caution!)
redis-cli -n 1 FLUSHDB
```

### Health Check

The cache service logs initialization status:
- ✅ `Redis cache initialized` - Cache is active
- ⚠️ `Redis cache not available, caching disabled` - Cache is disabled (graceful fallback)

## Troubleshooting

### Cache Not Working

1. **Check Redis Connection**: Verify `REDIS_URL` is set correctly
2. **Check Logs**: Look for cache initialization messages
3. **Verify Redis**: `redis-cli -n 1 PING` should return `PONG`

### Cache Too Aggressive

If cache is causing stale data:
- Reduce TTL in `cache-service.ts`
- Add more cache invalidation points
- Use shorter TTL for frequently updated data

### Cache Not Invalidating

Check that mutations are calling `cacheService.invalidateUserCache()` or `cacheService.invalidateAnalysis()`.

## Future Enhancements

- [ ] Cache hit/miss metrics
- [ ] Per-query TTL configuration
- [ ] Cache warming strategies
- [ ] Cache compression for large responses
- [ ] Cache analytics dashboard

---

**Status**: ✅ Implemented and Active

