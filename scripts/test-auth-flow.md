# Testing Authentication Flow

## Quick Test Procedure

### Step 1: Clear App State
```bash
cd apps/mobile
rm -rf .expo
pnpm expo start --clear
```

### Step 2: Watch Console Logs
Open the app and watch for these log sequences:

#### Expected Success Flow:
```
[AuthTokenSync] User signed in, fetching token...
[AuthTokenSync] No JWT template configured, using default token
[AuthTokenSync] Token retrieved successfully: { length: 500, prefix: "eyJhbGciOiJSUzI1NiIs", isJwtLike: true }
[GraphQL] Request: { hasToken: true, tokenLength: 500, queryName: "Analysis", ... }
[GraphQL] Response: { data: { analysis: { ... } } }
[GraphQL] Success: ["analysis"]
```

#### Failure Scenario 1: No Token Retrieved
```
[AuthTokenSync] User signed in, fetching token...
[AuthTokenSync] Token is null/undefined despite being signed in
[GraphQL] Request: { hasToken: false, tokenLength: undefined, ... }
[GraphQL] No authentication token available - request may fail if auth is required
[GraphQL] Errors: [{ message: "Unauthorized: Authentication required..." }]
```

**Fix:** Check Clerk configuration, ensure user is properly signed in

#### Failure Scenario 2: Invalid Token
```
[AuthTokenSync] Token retrieved successfully: { length: 100, prefix: "invalid_token_...", isJwtLike: false }
[GraphQL] Request: { hasToken: true, tokenLength: 100, isJwtLike: false, ... }
[GraphQL] Errors: [{ message: "Unauthorized: Authentication required..." }]
```

**Fix:** Check that Clerk keys match (publishable key in mobile, secret key in API)

### Step 3: Test Specific Scenarios

#### Test 1: Anonymous Analysis Access
```typescript
// Should work without authentication
const result = await fetchAnalysis("anonymous_analysis_id");
```

Expected: Success (anonymous analyses can be accessed by anyone)

#### Test 2: User-Owned Analysis Access (Signed In)
```typescript
// Should work with valid token
const result = await fetchAnalysis("user_analysis_id");
```

Expected: Success if token is valid and analysis belongs to user

#### Test 3: User-Owned Analysis Access (Not Signed In)
```typescript
// Should fail with auth error
const result = await fetchAnalysis("user_analysis_id");
```

Expected: Error "Unauthorized: Authentication required to access this analysis"

### Step 4: Verify API Configuration

#### Check Railway Environment Variables:
```bash
# In Railway dashboard, verify these are set:
CLERK_SECRET_KEY=sk_live_... (or sk_test_...)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

#### Check Mobile App Configuration:
```json
// In apps/mobile/app.json
{
  "expo": {
    "extra": {
      "clerkPublishableKey": "pk_live_...",
      "apiUrl": "https://api.vett.xyz"
    }
  }
}
```

### Step 5: Manual Token Verification

#### Get Token from Mobile App:
```typescript
import { tokenProvider } from "../src/api/token-provider";

// In a React component or console
const token = tokenProvider.getToken();
console.log("Current token:", token);
```

#### Verify Token with Clerk:
1. Go to Clerk Dashboard → Sessions
2. Find your active session
3. Compare session ID with token payload (decode JWT at jwt.io)

#### Test Token with API:
```bash
# Replace TOKEN with your actual token
curl -X POST https://api.vett.xyz/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"query":"{ health { status timestamp } }"}'
```

Expected: `{"data":{"health":{"status":"Vett API online","timestamp":"..."}}}`

### Step 6: Common Issues and Fixes

#### Issue: Token is null
**Possible causes:**
- User not signed in
- Clerk not initialized
- JWT template misconfigured

**Fix:**
1. Check `isSignedIn` from `useAuth()`
2. Remove `EXPO_PUBLIC_CLERK_JWT_TEMPLATE` if not needed
3. Wait for Clerk to initialize before making requests

#### Issue: Token is invalid
**Possible causes:**
- Clerk keys mismatch (test vs live)
- Token expired
- Wrong secret key in API

**Fix:**
1. Verify both keys are from same Clerk instance
2. Sign out and sign back in to get fresh token
3. Check `CLERK_SECRET_KEY` in Railway matches publishable key type

#### Issue: API returns 401
**Possible causes:**
- Token verification failed
- User not found in database
- Token format incorrect

**Fix:**
1. Check API logs for Clerk verification errors
2. Ensure user exists in database (API auto-creates on first request)
3. Verify token is being sent in Authorization header

### Step 7: End-to-End Test

1. **Sign out** of the app
2. **Clear app data** (uninstall and reinstall if needed)
3. **Sign in** with a test account
4. **Submit a new analysis**
5. **View the analysis** from history
6. **Check console logs** for any authentication warnings

Expected: All operations succeed with proper token logging

## Automated Testing

### Unit Test: Token Provider
```typescript
import { tokenProvider } from "../src/api/token-provider";

describe("Token Provider", () => {
  it("should set and get token", () => {
    tokenProvider.setToken("test_token");
    expect(tokenProvider.getToken()).toBe("test_token");
  });

  it("should wait for token", async () => {
    tokenProvider.setToken(null);
    setTimeout(() => tokenProvider.setToken("delayed_token"), 100);
    const token = await tokenProvider.waitForToken({ timeoutMs: 500 });
    expect(token).toBe("delayed_token");
  });
});
```

### Integration Test: GraphQL Request
```typescript
import { graphqlRequest } from "../src/api/graphql";
import { tokenProvider } from "../src/api/token-provider";

describe("GraphQL Request", () => {
  it("should include token in request", async () => {
    tokenProvider.setToken("test_token");
    // Mock fetch to verify Authorization header
    const result = await graphqlRequest("{ health { status } }");
    expect(result).toBeDefined();
  });
});
```

## Monitoring

### Key Metrics to Track:
1. **Token retrieval success rate** - Should be 100% for signed-in users
2. **Auth error rate** - Should be 0% for authenticated requests
3. **Token refresh frequency** - Should match Clerk's token expiration (usually 1 hour)
4. **API authentication failures** - Should only occur for invalid/expired tokens

### Logging to Monitor:
```
[AuthTokenSync] Token retrieved successfully
[GraphQL] Request: { hasToken: true }
[GraphQL] Success
```

### Alerts to Set Up:
1. Alert when auth error rate > 5%
2. Alert when token retrieval fails for signed-in users
3. Alert when API returns 401 for valid tokens

## Next Steps After Testing

1. If authentication works: Remove excessive logging or reduce to debug level
2. If authentication fails: Follow troubleshooting guide in `docs/TROUBLESHOOTING_AUTH_ERRORS.md`
3. If issues persist: Check Clerk Dashboard for any service issues or configuration problems
4. Consider implementing token refresh logic if tokens expire frequently

