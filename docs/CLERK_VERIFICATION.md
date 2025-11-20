# Clerk Connection Verification Guide

This guide helps you verify that Clerk is properly connected and configured.

## ✅ Improvements Made

1. **Startup Validation**: Clerk connection is tested on server startup
2. **Secret Key Format Check**: Validates that the key starts with `sk_test_` or `sk_live_`
3. **Health Check Endpoint**: `/health` now includes Clerk status
4. **Test Endpoint**: `/auth/test` endpoint to verify Clerk connection
5. **Better Error Handling**: Improved error messages and logging

## 🔍 Verification Steps

### 1. Check Environment Variable

Ensure `CLERK_SECRET_KEY` is set in `apps/api/.env`:

```bash
# Should start with sk_test_ (development) or sk_live_ (production)
CLERK_SECRET_KEY=sk_test_...
```

### 2. Check Server Startup Logs

When you start the API server, you should see:

```
✅ Clerk client initialized successfully
✅ Clerk connection verified
```

If you see errors:
- `❌ Clerk secret key is invalid` - Check your CLERK_SECRET_KEY
- `⚠️ Could not verify Clerk connection` - May be network issue, but key format is correct

### 3. Test Health Endpoint

```bash
curl http://localhost:4000/health
```

Expected response:
```json
{
  "status": "ok",
  "uptime": 123.45,
  "timestamp": "2025-01-XX...",
  "checks": {
    "clerk": true
  }
}
```

If `clerk: false`, there's a connection issue.

### 4. Test Clerk Connection Endpoint

```bash
curl http://localhost:4000/auth/test
```

Expected response:
```json
{
  "status": "connected",
  "clerkConfigured": true,
  "secretKeyFormat": "test",
  "canListUsers": true,
  "timestamp": "2025-01-XX..."
}
```

### 5. Test Authentication Flow

#### Get a Clerk Token

First, authenticate via Clerk (in your mobile app or web app) and get a session token.

#### Make Authenticated Request

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_SESSION_TOKEN" \
  -d '{
    "query": "query { health { status } }"
  }'
```

The request should succeed and include user context.

## 🐛 Troubleshooting

### Issue: "Clerk secret key is invalid"

**Solution:**
1. Go to https://dashboard.clerk.com
2. Select your application
3. Go to **API Keys**
4. Copy the **Secret Key** (starts with `sk_test_` or `sk_live_`)
5. Update `apps/api/.env`:
   ```
   CLERK_SECRET_KEY=sk_test_YOUR_KEY_HERE
   ```
6. Restart the server

### Issue: "Could not verify Clerk connection"

**Possible causes:**
- Network connectivity issue
- Clerk API is temporarily unavailable
- Firewall blocking outbound requests

**Solution:**
- Check internet connection
- Verify Clerk status: https://status.clerk.com
- Check firewall rules

### Issue: Authentication not working

**Check:**
1. Token format: Should be `Bearer <token>`
2. Token expiration: Clerk tokens expire, get a fresh one
3. Token type: Make sure you're using a session token, not an API key

**Debug:**
- Check server logs for auth errors
- Verify token in Clerk dashboard
- Test with `/auth/test` endpoint

## 📝 Testing Authentication

### Using GraphQL Playground

1. Start the server: `pnpm dev:api`
2. Open http://localhost:4000/graphql
3. In the headers section, add:
   ```json
   {
     "Authorization": "Bearer YOUR_CLERK_TOKEN"
   }
   ```
4. Run a query that requires auth:
   ```graphql
   query {
     subscription {
       plan
       status
     }
   }
   ```

### Using curl

```bash
# Get your Clerk session token first (from mobile app or web app)
TOKEN="your_clerk_session_token_here"

curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "query { subscription { plan status } }"
  }'
```

## 🔐 Security Notes

1. **Never commit** `.env` files with real keys
2. **Use test keys** (`sk_test_`) for development
3. **Use live keys** (`sk_live_`) only in production
4. **Rotate keys** if compromised
5. **Monitor** Clerk dashboard for suspicious activity

## 📊 Monitoring

Check Clerk dashboard regularly:
- **Users**: Verify users are being created
- **Sessions**: Monitor active sessions
- **API Usage**: Check API call limits
- **Logs**: Review authentication logs

## ✅ Checklist

- [ ] `CLERK_SECRET_KEY` is set in `.env`
- [ ] Key format is correct (`sk_test_` or `sk_live_`)
- [ ] Server starts without Clerk errors
- [ ] `/health` endpoint shows `clerk: true`
- [ ] `/auth/test` endpoint returns success
- [ ] Authenticated requests work
- [ ] User context is set correctly in GraphQL resolvers

## 🚀 Next Steps

Once Clerk is verified:
1. Test user creation flow
2. Test authentication in mobile app
3. Verify user sync to database
4. Test subscription association with users

