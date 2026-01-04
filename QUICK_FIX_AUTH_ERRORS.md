# Quick Fix: GraphQL Authentication Errors

## ⚡ Immediate Actions

### 1. Restart the Mobile App
```bash
cd apps/mobile
rm -rf .expo
pnpm expo start --clear
```

### 2. Watch Console for These Messages

#### ✅ Success Pattern:
```
[AuthTokenSync] Token retrieved successfully: { length: 500, ... }
[GraphQL] Request: { hasToken: true, ... }
```

#### ❌ Failure Pattern:
```
[AuthTokenSync] Token is null/undefined despite being signed in
[GraphQL] No authentication token available
[GraphQL] Errors: [{ message: "Unauthorized: Authentication required..." }]
```

## 🔍 Quick Diagnosis

| Symptom | Likely Cause | Quick Fix |
|---------|--------------|-----------|
| Token is null | User not signed in | Sign in again |
| Token is null | Clerk not initialized | Wait 2-3 seconds after sign in |
| Token invalid | Keys mismatch | Check Clerk keys match (test vs live) |
| API rejects token | Wrong secret key | Verify `CLERK_SECRET_KEY` in Railway |
| Auth works but still fails | Wrong analysis ID | Check analysis belongs to user |

## 🛠️ Configuration Checklist

### Mobile App (`apps/mobile/app.json`):
```json
{
  "expo": {
    "extra": {
      "clerkPublishableKey": "pk_live_Y2xlcmsudmV0dC54eXok",
      "apiUrl": "https://api.vett.xyz"
    }
  }
}
```

### API (Railway Environment Variables):
```
CLERK_SECRET_KEY=sk_live_... (must match mobile key type)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

### Key Matching Rules:
- `pk_live_...` ↔ `sk_live_...` ✅
- `pk_test_...` ↔ `sk_test_...` ✅
- `pk_live_...` ↔ `sk_test_...` ❌ (MISMATCH!)

## 🧪 Quick Tests

### Test 1: Check Token
```typescript
import { tokenProvider } from "../src/api/token-provider";
console.log("Token:", tokenProvider.getToken()?.substring(0, 20));
```

### Test 2: Check Auth State
```typescript
import { useAuth } from "@clerk/clerk-expo";
const { isSignedIn } = useAuth();
console.log("Signed in:", isSignedIn);
```

### Test 3: Test API Connection
```bash
curl https://api.vett.xyz/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ health { status } }"}'
```

## 🚨 Common Errors and Instant Fixes

### Error: "Authentication required to access this analysis"
**Instant Fix:**
1. Check if user is signed in: `useAuth().isSignedIn`
2. If signed in, wait 2 seconds and try again
3. If still fails, sign out and sign back in

### Error: "User not found"
**Instant Fix:**
1. User doesn't exist in database yet
2. API auto-creates on first request
3. Try submitting a new analysis first

### Error: Token is null
**Instant Fix:**
1. Remove `EXPO_PUBLIC_CLERK_JWT_TEMPLATE` from environment
2. Restart app
3. Sign in again

## 📚 Full Documentation

- **Troubleshooting Guide**: `docs/TROUBLESHOOTING_AUTH_ERRORS.md`
- **Test Procedures**: `scripts/test-auth-flow.md`
- **Clerk Setup**: `docs/CLERK_SETUP.md`

## 🎯 What Changed

### Enhanced Logging:
- ✅ Token status logged before each GraphQL request
- ✅ JWT format validation
- ✅ Auth state tracking
- ✅ Detailed error messages

### Files Modified:
- `apps/mobile/src/api/graphql.ts` - Enhanced request logging
- `apps/mobile/app/_layout.tsx` - Enhanced token sync logging

### Files Created:
- `docs/TROUBLESHOOTING_AUTH_ERRORS.md` - Full troubleshooting guide
- `scripts/test-auth-flow.md` - Testing procedures
- `QUICK_FIX_AUTH_ERRORS.md` - This file

## 💡 Pro Tips

1. **Always check logs first** - The enhanced logging will tell you exactly what's wrong
2. **Token takes time** - Wait 1-2 seconds after sign in before making requests
3. **Keys must match** - Live keys with live keys, test keys with test keys
4. **Anonymous analyses** - Don't require authentication, user analyses do
5. **Sign out/in** - Fixes 90% of token issues

## 🔄 Next Steps

1. Restart the mobile app with clearing
2. Sign in and watch console logs
3. Try accessing an analysis
4. If errors persist, check full troubleshooting guide
5. Verify Clerk configuration in dashboard

---

**Need Help?** Check the full troubleshooting guide at `docs/TROUBLESHOOTING_AUTH_ERRORS.md`

