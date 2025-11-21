# Response Compression

## Overview

Vett uses HTTP response compression to reduce bandwidth usage and improve response times. The API automatically compresses responses using gzip, deflate, or Brotli encoding based on client support.

## Features

- ✅ **Automatic Compression**: All responses > 1KB are automatically compressed
- ✅ **Multiple Encodings**: Supports gzip, deflate, and Brotli
- ✅ **Client Negotiation**: Automatically selects best encoding based on client `Accept-Encoding` header
- ✅ **Threshold**: Only compresses responses larger than 1KB (configurable)
- ✅ **CPU Optimized**: Balanced compression level for good ratio without excessive CPU usage

## How It Works

### Compression Flow

1. **Client Request**: Client sends `Accept-Encoding: gzip, deflate, br` header
2. **Server Processing**: Fastify compress plugin checks response size
3. **Compression**: If response > threshold, compresses using best available encoding
4. **Response**: Sends compressed response with `Content-Encoding` header

### Supported Encodings

1. **Brotli (br)**: Best compression ratio, modern browsers support it
2. **Gzip**: Widely supported, good compression ratio
3. **Deflate**: Fallback option, less common

The server automatically selects the best encoding based on client support.

## Configuration

### Current Settings

```typescript
{
  global: true,              // Apply to all routes
  threshold: 1024,            // Only compress responses > 1KB
  encodings: ["gzip", "deflate", "br"],
  zlibOptions: {
    level: 6                 // Compression level 1-9 (6 = balanced)
  },
  brotliOptions: {
    params: {
      [BROTLI_PARAM_QUALITY]: 4  // Brotli quality 0-11 (4 = balanced)
    }
  }
}
```

### Compression Levels

**Gzip/Deflate (zlibOptions.level)**:
- `1`: Fastest, least compression
- `6`: Balanced (default)
- `9`: Best compression, slower

**Brotli (brotliOptions.params.quality)**:
- `0`: Fastest, least compression
- `4`: Balanced (default)
- `11`: Best compression, slower

## Performance Impact

### Expected Improvements

- **Bandwidth Reduction**: 60-80% reduction for JSON/GraphQL responses
- **Response Time**: Faster transfer times, especially on slow connections
- **Mobile Performance**: Significant improvement for mobile users
- **Cost Savings**: Reduced bandwidth costs

### Example Sizes

**Uncompressed GraphQL Response**: ~50KB
**Compressed (gzip)**: ~10-15KB (70% reduction)

**Uncompressed JSON**: ~100KB
**Compressed (brotli)**: ~15-20KB (80% reduction)

## Testing

### Verify Compression

**Using curl:**
```bash
curl -H "Accept-Encoding: gzip" http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ health { status } }"}' \
  --compressed -v
```

Look for:
- `Content-Encoding: gzip` header in response
- Smaller response body size

**Using browser DevTools:**
1. Open Network tab
2. Check response headers for `Content-Encoding: gzip`
3. Compare "Size" vs "Transferred" columns
4. "Transferred" should be smaller than "Size"

### Test Different Encodings

**Gzip:**
```bash
curl -H "Accept-Encoding: gzip" http://localhost:4000/health -v
```

**Brotli:**
```bash
curl -H "Accept-Encoding: br" http://localhost:4000/health -v
```

**No compression:**
```bash
curl -H "Accept-Encoding: identity" http://localhost:4000/health -v
```

## What Gets Compressed

### ✅ Compressed

- GraphQL responses (JSON)
- Health check responses
- API JSON responses
- Error responses
- Any response > 1KB

### ❌ Not Compressed

- Responses < 1KB (threshold)
- Already compressed content (images, videos, etc.)
- Streaming responses
- Responses with `Content-Encoding` header already set

## Browser Support

### Automatic Support

All modern browsers automatically:
- Send `Accept-Encoding` header
- Decompress responses automatically
- Handle multiple encoding types

### Mobile Apps

Mobile apps need to:
- Include `Accept-Encoding` header in requests
- Handle compressed responses (most HTTP clients do this automatically)

**Example (React Native with fetch):**
```typescript
fetch('https://api.vett.app/graphql', {
  headers: {
    'Accept-Encoding': 'gzip, deflate, br',
    'Content-Type': 'application/json'
  }
})
// Response is automatically decompressed
```

## Monitoring

### Check Compression Effectiveness

1. **Response Headers**: Look for `Content-Encoding` header
2. **Size Comparison**: Compare compressed vs uncompressed sizes
3. **Bandwidth Metrics**: Monitor bandwidth usage reduction

### Metrics to Track

- Compression ratio (compressed / uncompressed)
- Average response size reduction
- Bandwidth savings
- CPU usage (compression overhead)

## Troubleshooting

### Compression Not Working

**Problem**: Responses not compressed

**Solutions**:
1. Check response size (must be > 1KB)
2. Verify `Accept-Encoding` header is sent
3. Check server logs for compression errors
4. Ensure `@fastify/compress` is registered

### High CPU Usage

**Problem**: Compression causing high CPU usage

**Solutions**:
1. Reduce compression level (lower `level` or `quality`)
2. Increase threshold (compress fewer responses)
3. Disable Brotli (use only gzip)
4. Use hardware acceleration if available

### Client Errors

**Problem**: Client can't decompress response

**Solutions**:
1. Ensure client sends `Accept-Encoding` header
2. Check client supports the encoding used
3. Verify client HTTP library handles compression
4. Test with different encodings

## Best Practices

### ✅ Do

- Keep compression enabled (default settings are good)
- Monitor compression ratios
- Test with different clients
- Use Brotli for modern clients (better compression)

### ❌ Don't

- Compress already compressed content (images, videos)
- Use maximum compression levels (too slow)
- Compress very small responses (< 1KB)
- Disable compression without good reason

## Configuration Tuning

### For High Traffic

```typescript
{
  threshold: 2048,        // Higher threshold (compress less)
  zlibOptions: { level: 4 },  // Faster compression
  encodings: ["gzip"]     // Only gzip (faster)
}
```

### For Maximum Compression

```typescript
{
  threshold: 512,         // Lower threshold (compress more)
  zlibOptions: { level: 9 },  // Maximum compression
  encodings: ["br", "gzip"]   // Prefer Brotli
}
```

### For Development

```typescript
{
  threshold: 0,          // Compress everything (for testing)
  zlibOptions: { level: 1 }  // Fast compression
}
```

---

**Status**: ✅ Implemented and Active

