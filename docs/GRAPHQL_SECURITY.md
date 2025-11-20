# GraphQL Security Implementation

## ✅ Completed

GraphQL security features have been implemented to protect against common attacks:

### 1. Query Depth Limiting
- **Maximum Depth**: 10 levels
- **Protection**: Prevents deeply nested queries that can cause DoS
- **Error**: Returns `QUERY_DEPTH_EXCEEDED` error with details

### 2. Query Complexity Analysis
- **Maximum Complexity**: 1000 points
- **Scoring**:
  - Scalar fields: 1 point
  - Object fields: 1 point
  - List fields: 10x multiplier
- **Protection**: Prevents resource exhaustion attacks
- **Error**: Returns `QUERY_COMPLEXITY_EXCEEDED` error

### 3. Input Validation
- **File Uploads**: Type and extension validation
- **Size Limits**: 20MB maximum
- **MIME Type Validation**: Only allowed types accepted
- **Filename Sanitization**: Prevents path traversal

### 4. Error Handling
- **Production**: Hides internal error details
- **Development**: Shows detailed error messages
- **Security Errors**: Clear, actionable error messages

## Configuration

### Depth Limit
```typescript
MAX_QUERY_DEPTH = 10
```

### Complexity Limit
```typescript
MAX_QUERY_COMPLEXITY = 1000
```

### File Upload Limits
```typescript
MAX_FILE_SIZE = 20MB
ALLOWED_MIME_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf", "text/plain", "text/markdown"
]
```

## Testing

### Test Depth Limiting

```graphql
# This query exceeds depth limit (11 levels)
query {
  analysis(id: "123") {
    claims {
      analysis {
        claims {
          analysis {
            claims {
              analysis {
                claims {
                  analysis {
                    claims {
                      text
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Expected Error:**
```json
{
  "errors": [{
    "message": "Query depth of 11 exceeds maximum depth of 10",
    "extensions": {
      "code": "QUERY_DEPTH_EXCEEDED",
      "maxDepth": 10,
      "actualDepth": 11
    }
  }]
}
```

### Test Complexity Limiting

```graphql
# This query requests many nested lists (high complexity)
query {
  analysis(id: "123") {
    claims {
      text
      extractionConfidence
      verdict
      confidence
    }
    sources {
      provider
      title
      url
      reliability
      summary
      evaluation {
        reliability
        relevance
        assessment
      }
    }
    explanationSteps {
      description
      supportingSourceIds
      confidence
    }
    attachments {
      kind
      url
      mediaType
      title
      summary
      altText
      caption
    }
  }
}
```

If complexity exceeds 1000, you'll get:
```json
{
  "errors": [{
    "message": "Query complexity of 1200 exceeds maximum complexity of 1000",
    "extensions": {
      "code": "QUERY_COMPLEXITY_EXCEEDED"
    }
  }]
}
```

### Test File Upload Validation

```bash
# Test invalid file type
curl -X POST http://localhost:4000/uploads \
  -F "file=@script.exe"

# Expected: 400 error - "File type not allowed"

# Test file size limit
curl -X POST http://localhost:4000/uploads \
  -F "file=@large-file.pdf" # > 20MB

# Expected: 413 error - "Uploaded file exceeds size limit"
```

## Security Features

### 1. Depth Limiting
- Prevents recursive queries
- Stops deeply nested queries
- Protects against DoS attacks

### 2. Complexity Analysis
- Tracks query cost
- Prevents expensive queries
- Protects server resources

### 3. Input Validation
- File type checking
- Size limits
- Extension validation
- Filename sanitization

### 4. Error Messages
- Production: Generic errors (no info leakage)
- Development: Detailed errors (for debugging)
- Security errors: Clear, actionable messages

## Customization

### Adjust Depth Limit

Edit `apps/api/src/plugins/graphql-security.ts`:

```typescript
export const MAX_QUERY_DEPTH = 15; // Increase to 15
```

### Adjust Complexity Limit

```typescript
export const MAX_QUERY_COMPLEXITY = 2000; // Increase to 2000
```

### Add Custom Complexity Costs

```typescript
export function createComplexityValidationRule() {
  return createComplexityRule({
    maximumComplexity: MAX_QUERY_COMPLEXITY,
    scalarCost: 1,
    objectCost: 1,
    listFactor: 10,
    // Add custom field costs
    estimators: [
      // Expensive operations cost more
      fieldExtensionsEstimator(),
      directiveEstimator()
    ]
  });
}
```

## Monitoring

### Log Expensive Queries

The complexity rule logs queries that exceed 80% of the limit:

```
Expensive query detected: 850 complexity
```

### Track Depth Limit Hits

Monitor for `QUERY_DEPTH_EXCEEDED` errors in your logs to identify potential attacks.

### Track Complexity Limit Hits

Monitor for `QUERY_COMPLEXITY_EXCEEDED` errors to identify resource-intensive queries.

## Best Practices

1. **Start Conservative**: Begin with strict limits and relax as needed
2. **Monitor**: Track limit hits to adjust thresholds
3. **Document**: Keep limits documented for your team
4. **Test**: Regularly test security rules to ensure they work
5. **Review**: Periodically review and adjust limits based on usage

## Next Steps

- [ ] Monitor depth/complexity limit hits in production
- [ ] Adjust limits based on actual usage patterns
- [ ] Add custom complexity costs for expensive operations
- [ ] Set up alerts for security rule violations
- [ ] Document query patterns for your team

