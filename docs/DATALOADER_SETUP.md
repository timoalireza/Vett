# DataLoader Implementation

## Overview

Vett uses DataLoader to prevent N+1 query problems in GraphQL resolvers. DataLoader batches multiple database queries into a single request and caches results within a single GraphQL query execution.

## What is N+1 Problem?

The N+1 problem occurs when:
1. You fetch a list of N items
2. For each item, you make an additional query to fetch related data
3. Result: 1 query for the list + N queries for related data = N+1 queries

**Example without DataLoader:**
```graphql
query {
  analyses {
    id
    user {
      email  # This triggers N user queries!
    }
  }
}
```

**With DataLoader:**
- All user lookups are batched into 1 query
- Results are cached for the duration of the request

## Implemented DataLoaders

### 1. User by External ID Loader

**Purpose**: Batch user lookups by Clerk user ID

**Usage**:
```typescript
const user = await context.loaders.userByExternalId.load(clerkUserId);
```

**Benefits**:
- Batches multiple `getUserByExternalId` calls
- Caches results within a single request
- Used in: `subscription`, `usage`, `analysis` resolvers

### 2. User by Internal ID Loader

**Purpose**: Batch user lookups by internal database ID

**Usage**:
```typescript
const user = await context.loaders.userById.load(userId);
```

**Benefits**:
- Batches multiple `getUserById` calls
- Useful when you have user IDs from analyses or other relations

### 3. Analysis by ID Loader

**Purpose**: Batch analysis lookups with request-level caching

**Usage**:
```typescript
const analysis = await context.loaders.analysisById.load({
  id: analysisId,
  userId: context.userId
});
```

**Benefits**:
- Caches analysis results within a single GraphQL query
- If the same analysis is requested multiple times in one query, returns cached result
- Delegates to `analysisService` for business logic (watermark calculation, etc.)

## How It Works

### Request Lifecycle

1. **GraphQL Request Starts**: DataLoaders are created per request
2. **Resolvers Execute**: Multiple resolvers may call `load()` with different keys
3. **Batching**: DataLoader collects all keys and batches them
4. **Single Query**: One database query fetches all requested items
5. **Caching**: Results are cached for the duration of the request
6. **Request Ends**: DataLoaders are discarded (fresh loaders for next request)

### Example Flow

```graphql
query {
  subscription {
    plan
  }
  usage {
    analysesCount
  }
  analysis(id: "123") {
    score
  }
}
```

**Without DataLoader**: 3 separate user queries
**With DataLoader**: 1 batched user query

## Integration

### GraphQL Context

DataLoaders are added to the GraphQL context:

```typescript
context: (request) => ({
  userId: request.userId,
  user: request.user,
  loaders: createDataLoaders()  // Fresh loaders per request
})
```

### Resolver Usage

```typescript
// Before (N+1 problem)
const user = await userService.getUserByExternalId(context.userId);

// After (batched)
const user = await context.loaders.userByExternalId.load(context.userId);
```

## Performance Impact

### Expected Improvements

- **Query Reduction**: 50-90% reduction in database queries for complex queries
- **Response Time**: Faster responses for queries with multiple related data fetches
- **Database Load**: Significant reduction in database connections

### Example Scenarios

**Scenario 1: Multiple User Lookups**
- Without DataLoader: 5 queries (subscription, usage, analysis, etc.)
- With DataLoader: 1 query (all batched)

**Scenario 2: Same Analysis Requested Multiple Times**
- Without DataLoader: 3 queries (if requested 3 times)
- With DataLoader: 1 query (cached after first load)

## Best Practices

### ✅ Do

- Use DataLoaders for all database lookups in resolvers
- Let DataLoader handle batching automatically
- Trust the cache (DataLoader caches within a request)

### ❌ Don't

- Manually batch queries when DataLoader can do it
- Cache DataLoader results outside the request scope
- Create DataLoaders outside the GraphQL context

## Monitoring

### Check DataLoader Effectiveness

1. **Database Query Logs**: Monitor query counts before/after
2. **Response Times**: Compare query execution times
3. **Query Patterns**: Look for batched queries in logs

### Debugging

Enable query logging to see DataLoader batching:

```typescript
// In loader creation
console.log(`Batching ${keys.length} user lookups`);
```

## Future Enhancements

- [ ] Add DataLoader for claims by analysis ID
- [ ] Add DataLoader for sources by analysis ID
- [ ] Add DataLoader for collections
- [ ] Metrics for DataLoader hit rates
- [ ] Performance monitoring dashboard

## Troubleshooting

### DataLoader Not Batching

**Problem**: Multiple queries still happening

**Solution**: 
- Ensure you're using `context.loaders` in resolvers
- Check that DataLoaders are created per request (not shared)
- Verify batch function is correct

### Stale Data

**Problem**: DataLoader returns cached but outdated data

**Solution**: 
- DataLoader cache is per-request only (correct behavior)
- For cross-request caching, use Redis cache service
- Clear DataLoader cache if needed: `loader.clear(key)`

### Type Errors

**Problem**: TypeScript errors with DataLoader types

**Solution**:
- Ensure `DataLoaderContext` is properly typed
- Check that loader return types match expected types

---

**Status**: ✅ Implemented and Active

