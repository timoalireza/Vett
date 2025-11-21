# GraphQL Pagination

## Overview

Vett implements cursor-based pagination (Relay-style) for list queries. This provides efficient, consistent pagination that works well with large datasets and real-time data.

## Features

- ✅ **Cursor-Based Pagination**: Uses cursors instead of offsets for better performance
- ✅ **Forward & Backward Pagination**: Support for both `first/after` and `last/before`
- ✅ **Consistent Ordering**: Results ordered by `createdAt` descending (newest first)
- ✅ **Page Info**: Includes `hasNextPage`, `hasPreviousPage`, and cursors
- ✅ **User-Specific**: Only returns analyses for the authenticated user

## GraphQL Schema

### Query

```graphql
query {
  analyses(
    first: Int      # Number of items to fetch (max 100)
    after: String   # Cursor for forward pagination
    last: Int       # Number of items to fetch (backward)
    before: String  # Cursor for backward pagination
  ) {
    edges {
      node {
        id
        score
        verdict
        createdAt
        # ... other fields
      }
      cursor
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}
```

### Types

- **AnalysisConnection**: Contains edges, pageInfo, and optional totalCount
- **AnalysisEdge**: Contains node (AnalysisSummary) and cursor
- **PageInfo**: Contains pagination metadata

## Usage Examples

### First Page (Forward Pagination)

```graphql
query {
  analyses(first: 20) {
    edges {
      node {
        id
        score
        createdAt
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Next Page

```graphql
query {
  analyses(first: 20, after: "eyJpZCI6IjEyMyIsImNyZWF0ZWRBdCI6IjIwMjQtMDEtMDEifQ==") {
    edges {
      node {
        id
        score
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Previous Page (Backward Pagination)

```graphql
query {
  analyses(last: 20, before: "eyJpZCI6IjEyMyIsImNyZWF0ZWRBdCI6IjIwMjQtMDEtMDEifQ==") {
    edges {
      node {
        id
        score
      }
      cursor
    }
    pageInfo {
      hasPreviousPage
      startCursor
    }
  }
}
```

## Cursor Format

Cursors are base64-encoded JSON strings containing:
```json
{
  "id": "analysis-uuid",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## Pagination Rules

### Limits

- **Default**: 20 items per page
- **Maximum**: 100 items per page
- **Minimum**: 0 items per page

### Direction

- **Forward Pagination**: Use `first` and `after`
- **Backward Pagination**: Use `last` and `before`
- **Cannot mix**: Cannot use both `first` and `last` in the same query

### Ordering

Results are always ordered by `createdAt` descending (newest first).

## Implementation Details

### Cursor-Based Pagination

Cursor-based pagination uses the `createdAt` timestamp and `id` to determine position:

1. **Forward (first/after)**:
   - Fetches items with `createdAt < cursor.createdAt`
   - Ordered DESC (newest first)
   - Returns next page of older items

2. **Backward (last/before)**:
   - Fetches items with `createdAt > cursor.createdAt`
   - Ordered DESC (newest first)
   - Returns previous page of newer items
   - Results are reversed to maintain correct order

### Performance

- **Efficient**: Uses indexed `createdAt` column for fast queries
- **Consistent**: Cursor-based pagination avoids issues with offset-based pagination
- **Scalable**: Works well with large datasets

## Error Handling

### Invalid Arguments

```graphql
# Error: Cannot use both first and last
query {
  analyses(first: 20, last: 20) { ... }
}

# Error: Limit exceeds maximum
query {
  analyses(first: 200) { ... }
}
```

### Authentication Required

```graphql
# Error: Authentication required
query {
  analyses(first: 20) { ... }
}
```

## Best Practices

### ✅ Do

- Use `first` for initial page loads
- Store `endCursor` for next page navigation
- Use `last` and `before` for "previous page" functionality
- Handle `hasNextPage` / `hasPreviousPage` for UI controls
- Use reasonable page sizes (20-50 items)

### ❌ Don't

- Use very large page sizes (> 100)
- Mix `first` and `last` in same query
- Use offset-based pagination (not supported)
- Assume `totalCount` is available (may be null for performance)

## Mobile App Integration

### React Native Example

```typescript
const { data, fetchMore } = useQuery(ANALYSES_QUERY, {
  variables: { first: 20 },
  fetchPolicy: 'cache-and-network'
});

const loadMore = () => {
  if (data?.analyses.pageInfo.hasNextPage) {
    fetchMore({
      variables: {
        after: data.analyses.pageInfo.endCursor
      }
    });
  }
};
```

### Infinite Scroll

```typescript
const { data, fetchMore } = useQuery(ANALYSES_QUERY, {
  variables: { first: 20 }
});

const handleScroll = (event: ScrollEvent) => {
  const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
  const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
  
  if (isCloseToBottom && data?.analyses.pageInfo.hasNextPage) {
    fetchMore({
      variables: {
        after: data.analyses.pageInfo.endCursor
      }
    });
  }
};
```

## Future Enhancements

- [ ] Add filtering options (by status, topic, date range)
- [ ] Add sorting options (by score, confidence, etc.)
- [ ] Add `totalCount` calculation (with performance considerations)
- [ ] Add search functionality
- [ ] Add date range filtering

---

**Status**: ✅ Implemented and Active

