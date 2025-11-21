# GraphQL Query Depth Limit

## Overview

Vett implements query depth limiting to prevent deeply nested queries that could cause performance issues or DoS attacks.

## Current Limit

**Maximum Query Depth: 15**

This limit allows for complex queries while still protecting against abuse.

## What is Query Depth?

Query depth is the maximum nesting level in a GraphQL query. For example:

```graphql
query {
  analysis {           # Depth 1
    claims {           # Depth 2
      id               # Depth 3
    }
    sources {          # Depth 2
      evaluation {     # Depth 3
        reliability    # Depth 4
      }
    }
  }
}
```

This query has a depth of 4.

## Common Query Patterns

### Analysis Query (Typical Depth: 4-6)

```graphql
query {
  analysis(id: "123") {
    id
    score
    claims {
      text
      verdict
    }
    sources {
      title
      url
      evaluation {
        reliability
      }
    }
  }
}
```

### Deep Analysis Query (Depth: 8-10)

```graphql
query {
  analysis(id: "123") {
    id
    claims {
      id
      text
    }
    sources {
      id
      evaluation {
        reliability
        relevance
        assessment
      }
    }
    ingestionRecords {
      attachment {
        id
        url
      }
      quality {
        level
        score
        reasons
      }
    }
  }
}
```

### Paginated Analyses (Depth: 5-7)

```graphql
query {
  analyses(first: 20) {
    edges {
      node {
        id
        score
        claims {
          text
        }
      }
      cursor
    }
    pageInfo {
      hasNextPage
    }
  }
}
```

## If You Exceed the Limit

### Error Message

```
Query depth of 16 exceeds maximum depth of 15
```

### Solutions

1. **Reduce Nesting**: Remove unnecessary nested fields
2. **Split Queries**: Break into multiple queries
3. **Use Pagination**: For lists, use pagination instead of fetching all nested data

### Example: Optimizing a Deep Query

**Before (Depth 12):**
```graphql
query {
  analyses(first: 10) {
    edges {
      node {
        claims {
          id
        }
        sources {
          evaluation {
            reliability
            relevance
            assessment
          }
        }
        ingestionRecords {
          attachment {
            id
            url
            metadata
          }
          quality {
            level
            score
            reasons
            recommendation
            message
          }
        }
      }
    }
  }
}
```

**After (Depth 8):**
```graphql
# Query 1: Get analyses list
query {
  analyses(first: 10) {
    edges {
      node {
        id
        score
        verdict
      }
      cursor
    }
  }
}

# Query 2: Get full details for specific analysis
query {
  analysis(id: "123") {
    claims {
      id
    }
    sources {
      evaluation {
        reliability
      }
    }
  }
}
```

## Adjusting the Limit

The depth limit is configured in `apps/api/src/plugins/graphql-security.ts`:

```typescript
export const MAX_QUERY_DEPTH = 15;
```

### When to Increase

- Legitimate queries consistently exceed the limit
- Complex data structures require deeper nesting
- After optimizing queries and still hitting limit

### When NOT to Increase

- Only a few queries exceed the limit (optimize those instead)
- Security is a concern (keep limit lower)
- Performance issues are occurring

## Monitoring

Monitor query depths in production:
- Check Sentry for depth limit errors
- Log queries that approach the limit (> 80% of max)
- Track average query depth

## Best Practices

1. **Design Queries Efficiently**: Only request needed fields
2. **Use Pagination**: For lists, paginate instead of fetching all
3. **Split Complex Queries**: Break into multiple simpler queries
4. **Monitor Depth**: Track query depths in production
5. **Document Patterns**: Share efficient query patterns with team

---

**Current Limit**: 15 levels  
**Status**: ✅ Active

