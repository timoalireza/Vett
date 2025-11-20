# CORS Configuration Guide

## ✅ Implementation Complete

CORS (Cross-Origin Resource Sharing) has been properly configured with environment-based restrictions.

## Configuration

### Development Mode
- **All origins allowed** - For local development
- No restrictions

### Production Mode
- **Restricted origins** - Only allows origins specified in `ALLOWED_ORIGINS`
- **Mobile apps allowed** - Requests without origin header are allowed (React Native/Expo apps)
- **Strict validation** - Invalid origins are rejected with clear error messages

## Environment Variable

### `ALLOWED_ORIGINS`

Comma-separated list of allowed origins for production:

```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com,https://web.yourdomain.com
```

**Important Notes:**
- Only required in production
- Leave empty in development (allows all origins)
- Mobile apps don't send origin headers, so they're automatically allowed
- Must include protocol (`https://` or `http://`)
- No trailing slashes

## CORS Headers

### Allowed Methods
- GET, POST, PUT, DELETE, OPTIONS, PATCH

### Allowed Headers
- Content-Type
- Authorization
- X-Requested-With
- Accept
- Origin

### Exposed Headers
- x-ratelimit-limit
- x-ratelimit-remaining
- x-ratelimit-reset
- retry-after

### Credentials
- `credentials: true` - Allows cookies and authentication headers

### Max Age
- 24 hours (86400 seconds) - Preflight cache duration

## Mobile App Considerations

React Native and Expo apps don't send traditional CORS origin headers. The configuration handles this by:

1. **Allowing requests without origin** - Mobile apps are automatically allowed
2. **No origin validation** - Requests without `Origin` header pass CORS check
3. **Same security** - Authentication still required via Authorization header

## Testing CORS

### Test Endpoint

```bash
# Test CORS configuration
curl http://localhost:4000/cors-test

# Response shows:
# - Current origin
# - Allowed origins
# - CORS configuration status
```

### Test from Browser

```javascript
// Test from allowed origin
fetch('https://api.yourdomain.com/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  credentials: 'include',
  body: JSON.stringify({ query: '{ health { status } }' })
})
.then(res => res.json())
.then(data => console.log(data));
```

### Test CORS Rejection

```bash
# From disallowed origin (should fail in production)
curl -H "Origin: https://evil.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     http://localhost:4000/graphql
```

## Production Setup

### Step 1: Identify Your Origins

List all domains that need API access:
- Web app domain: `https://app.yourdomain.com`
- Admin panel: `https://admin.yourdomain.com`
- Marketing site (if needed): `https://yourdomain.com`

### Step 2: Set Environment Variable

```bash
# In production .env file
ALLOWED_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com
```

### Step 3: Verify Configuration

```bash
# Check CORS test endpoint
curl https://api.yourdomain.com/cors-test

# Should show:
# - allowedOrigins: ["https://app.yourdomain.com", "https://admin.yourdomain.com"]
# - corsConfigured: true
```

### Step 4: Test from Each Origin

Test API access from each allowed origin to ensure CORS works correctly.

## Common Issues

### Issue: "Origin not allowed by CORS"

**Cause:** Origin not in `ALLOWED_ORIGINS` list

**Solution:**
1. Add origin to `ALLOWED_ORIGINS` environment variable
2. Restart server
3. Ensure exact match (including protocol and no trailing slash)

### Issue: CORS works in dev but not production

**Cause:** `ALLOWED_ORIGINS` not set or incorrect

**Solution:**
1. Check `ALLOWED_ORIGINS` is set in production environment
2. Verify origins match exactly (case-sensitive)
3. Check server logs for CORS warnings

### Issue: Mobile app can't connect

**Cause:** Mobile apps don't send origin headers

**Solution:**
- This should work automatically (requests without origin are allowed)
- Check authentication token is being sent correctly
- Verify API URL is correct in mobile app config

## Security Best Practices

1. **Always set ALLOWED_ORIGINS in production**
   - Don't rely on the warning fallback
   - Be explicit about allowed origins

2. **Use HTTPS in production**
   - All origins should use `https://`
   - Never allow `http://` origins in production

3. **Regularly review allowed origins**
   - Remove unused origins
   - Audit who has access

4. **Monitor CORS rejections**
   - Log rejected origins
   - Alert on suspicious patterns

## Example Configurations

### Development
```bash
# .env.development
ALLOWED_ORIGINS=  # Empty = allow all
```

### Staging
```bash
# .env.staging
ALLOWED_ORIGINS=https://staging.yourdomain.com,https://staging-app.yourdomain.com
```

### Production
```bash
# .env.production
ALLOWED_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com
```

## Next Steps

- [ ] Set `ALLOWED_ORIGINS` for production environment
- [ ] Test CORS from each allowed origin
- [ ] Verify mobile app connectivity
- [ ] Monitor CORS rejections in production logs
- [ ] Document your specific origins for team reference

