# Troubleshooting GraphQL Authentication Errors

## Problem: "Unauthorized: Authentication required to access this analysis"

This error occurs when the mobile app tries to access an analysis that requires authentication, but the authentication token is not being sent properly to the API.

## Root Causes

### 1. Token Not Being Retrieved from Clerk
The `AuthTokenSync` component in `app/_layout.tsx` is responsible for fetching the JWT token from Clerk and storing it in the `tokenProvider`. If this fails, GraphQL requests will not include the `Authorization` header.

**Symptoms:**
- Console shows: `[GraphQL] No authentication token available`
- Error: "Authentication required to access this analysis"

**Solutions:**
- Check that user is actually signed in with Clerk
- Verify `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is set correctly in `app.json` or environment
- Check console logs for `[AuthTokenSync]` messages to see if token retrieval is failing

### 2. JWT Template Misconfiguration
If `EXPO_PUBLIC_CLERK_JWT_TEMPLATE` is set but the template doesn't exist in Clerk, token retrieval will fail.

**Symptoms:**
- Console shows: `[AuthTokenSync] Failed to get token with template`
- Token is null despite being signed in

**Solutions:**
- Remove `EXPO_PUBLIC_CLERK_JWT_TEMPLATE` from environment if not needed
- OR create the JWT template in Clerk Dashboard → JWT Templates
- The app will automatically fall back to default token if template fails

**Important:** If the template exists and the app is using it successfully, the API must be able to verify that token type.
Make sure the API has `CLERK_JWT_KEY` set (Clerk Dashboard → JWT Templates → Public key), otherwise the API may log
“Auth verification failed” and GraphQL resolvers will behave as unauthenticated.

**PEM formatting tip:** `CLERK_JWT_KEY` is a multi-line PEM. If your hosting UI doesn’t support multi-line env vars,
use a single-line representation with `\n` between lines.

### 3. Token Not Stored in SecureStore
The fallback mechanism tries to retrieve tokens from SecureStore, but Clerk may not have stored them yet.

**Symptoms:**
- Console shows: `[ClerkToken] No token found in SecureStore`
- Token retrieval falls through all retry attempts

**Solutions:**
- Wait for Clerk to fully initialize before making GraphQL requests
- The `tokenProvider.waitForToken()` method already handles this with timeouts
- Increase timeout if needed (currently 750-2000ms depending on auth state)

### 4. Accessing Non-Anonymous Analysis Without Auth
The API enforces that only anonymous analyses (userId = null) can be accessed without authentication. User-owned analyses require authentication.

**Symptoms:**
- Error: "Unauthorized: Authentication required to access this analysis"
- Error code: `INTERNAL_ERROR`

**Solutions:**
- Ensure user is signed in before accessing their analyses
- Check that the analysis belongs to the current user
- Anonymous analyses can be accessed by anyone

## Debugging Steps

### Step 1: Check Console Logs
Look for these log messages in the mobile app console:

```
[AuthTokenSync] User signed in, fetching token...
[AuthTokenSync] Token retrieved successfully: { length: 500, prefix: "eyJhbGciOiJSUzI1NiIs..." }
[GraphQL] Request: { hasToken: true, tokenLength: 500, queryName: "Analysis" }
```

### Step 2: Verify Token Format
A valid JWT token should:
- Be a string with 3 parts separated by dots (e.g., `xxx.yyy.zzz`)
- Start with `eyJ` (base64-encoded JSON)
- Be around 500-1000 characters long

### Step 3: Check API Logs
On the API side, check for:

```
[GraphQL] User not found for externalId: user_xxx analysisId: analysis_xxx
[GraphQL] Authorization mismatch: { analysisId, analysisUserId, userInternalId, userExternalId }
```

### Step 4: Verify Clerk Configuration
1. **Mobile App** (`app.json`):
   ```json
   {
     "expo": {
       "extra": {
         "clerkPublishableKey": "pk_live_..."
       }
     }
   }
   ```

2. **API** (Railway environment variables):
   ```
   CLERK_SECRET_KEY=sk_live_...
   ```

3. **Ensure keys match the same Clerk instance** (both live or both test)

## Enhanced Logging

The following improvements have been added to help debug authentication issues:

### In `graphql.ts`:
- Token status logging before each request
- JWT format validation
- Detailed error logging for auth failures
- Warning when no token is available

### In `_layout.tsx`:
- Detailed logging of token retrieval process
- JWT template configuration logging
- Token format validation logging
- Error stack traces for token retrieval failures

## Common Fixes

### Fix 1: Force Token Refresh
If the token is stale or invalid:

1. Sign out and sign back in
2. Clear app data and reinstall
3. Check that Clerk keys are correct

### Fix 2: Check Network Connectivity
Ensure the mobile app can reach the API:

```typescript
// In app.json or environment
"apiUrl": "https://api.vett.xyz"  // Production
// OR
"apiUrl": "http://localhost:4000"  // Development
```

### Fix 3: Verify User Exists in Database
The API automatically creates users on first request, but if this fails:

1. Check API logs for user creation errors
2. Verify DATABASE_URL is correct
3. Check that the users table exists

### Fix 4: Clear Token Cache
If tokens are cached incorrectly:

```typescript
import { clearClerkTokenCache } from "../src/api/clerk-token";

// Call on sign out or when debugging
clearClerkTokenCache();
```

## Testing Authentication

### Test 1: Check Token Retrieval
```typescript
import { tokenProvider } from "../src/api/token-provider";

// In a React component
const token = await tokenProvider.waitForToken({ timeoutMs: 2000 });
console.log("Token:", token ? "Retrieved" : "Failed");
```

### Test 2: Manual GraphQL Request
```typescript
import { graphqlRequest } from "../src/api/graphql";

const result = await graphqlRequest(`
  query {
    health {
      status
      timestamp
    }
  }
`);
console.log("Health check:", result);
```

### Test 3: Check Auth State
```typescript
import { tokenProvider } from "../src/api/token-provider";
import { useAuth } from "@clerk/clerk-expo";

const { isSignedIn } = useAuth();
const authState = tokenProvider.getAuthState();
console.log("Clerk isSignedIn:", isSignedIn);
console.log("TokenProvider authState:", authState);
```

## Prevention

To avoid authentication errors in the future:

1. **Always wait for auth to be ready** before making authenticated requests
2. **Use the `tokenProvider.waitForToken()` method** instead of `getToken()` directly
3. **Handle auth errors gracefully** and prompt user to sign in again
4. **Monitor token expiration** and refresh tokens proactively
5. **Test with both authenticated and anonymous users**

## Related Files

- `apps/mobile/src/api/graphql.ts` - GraphQL request handler
- `apps/mobile/app/_layout.tsx` - Authentication token sync
- `apps/mobile/src/api/token-provider.ts` - Token management
- `apps/mobile/src/api/clerk-token.ts` - SecureStore token retrieval
- `apps/api/src/plugins/auth.ts` - API authentication middleware
- `apps/api/src/resolvers/index.ts` - GraphQL resolvers with auth checks

## Additional Resources

- [Clerk Expo Documentation](https://clerk.com/docs/quickstarts/expo)
- [Clerk JWT Templates](https://clerk.com/docs/backend-requests/making/jwt-templates)
- [GraphQL Authentication Best Practices](https://www.apollographql.com/docs/apollo-server/security/authentication/)

