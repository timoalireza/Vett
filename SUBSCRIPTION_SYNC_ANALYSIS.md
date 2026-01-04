# Subscription Sync Analysis & Fix

## Summary

Analyzed API worker logs and identified the root cause of subscription sync issues. Fixed a critical bug in how the code processes RevenueCat API responses.

---

## Findings from Logs

### ✅ What's Working
1. **API connectivity**: Server starts successfully, all services (Redis, Clerk, Database) connected
2. **RevenueCat API calls**: Successfully fetching subscriber data
3. **Error detection**: Code correctly identifies when subscriptions are expired

### ❌ What Was Wrong

#### Issue 1: Test Subscriptions Expired
From logs at `2026-01-04T16:09:24Z`:
- **Plus Monthly** (`vett_plus_monthly`): Expired at `2026-01-03T22:37:45Z` (~17.5 hours ago)
- **Pro Annual** (`vett_pro_annual`): Expired at `2026-01-04T03:14:15Z` (~13 hours ago)

**Why**: Sandbox/test purchases use accelerated time:
- Real monthly subscription = 5 minutes in sandbox
- Real annual subscription = 1 hour in sandbox

**Impact**: When the sync ran, both subscriptions were genuinely expired, so the system correctly set the user to FREE plan.

#### Issue 2: Code Bug - Incorrect API Response Structure
**Location**: `apps/api/src/services/revenuecat-service.ts:360-373`

**Problem**: Code assumed RevenueCat REST API returns `subscriber.entitlements.active`, but the REST API doesn't have this structure.

**Actual API Structure**:
```json
{
  "subscriber": {
    "entitlements": {
      "plus": {
        "expires_date": "2026-01-03T22:37:45Z",
        "product_identifier": "vett_plus_monthly",
        ...
      },
      "pro": {
        "expires_date": "2026-01-04T03:14:15Z",
        "product_identifier": "vett_pro_annual",
        ...
      }
    }
  }
}
```

**What the code was doing**:
```typescript
// This returns undefined, falls back to {}, resulting in empty array
const activeEntitlements = Object.keys(subscriber.entitlements?.active || {});
```

**Result**: Even if there WERE active subscriptions, the code couldn't find them.

---

## Fix Applied

Updated `syncSubscriptionFromRevenueCat()` to properly filter entitlements by expiration date:

### Before:
```typescript
const activeEntitlements = Object.keys(subscriber.entitlements?.active || {});
const entitlement = subscriber.entitlements.active[entitlementId];
```

### After:
```typescript
// Get all entitlements and filter by expiration date
const allEntitlements = subscriber.entitlements || {};
const now = Date.now();

const activeEntitlements = Object.entries(allEntitlements)
  .filter(([_id, entitlement]: [string, any]) => {
    const expiresDate = entitlement.expires_date;
    if (!expiresDate) return false;
    
    const expiresMs = new Date(expiresDate).getTime();
    return expiresMs > now; // Only include non-expired entitlements
  })
  .map(([id]) => id);

const entitlement = allEntitlements[entitlementId];
```

**Added logging** to show detailed expiration checking:
- Logs each entitlement's ID
- Shows expiration date
- Shows whether it's active
- Shows time until expiry in hours

### Property Name Fix:
The initial fix incorrectly tried to access `expires_date_ms` and `purchase_date_ms`, but the RevenueCat API actually returns:
- `expires_date` (ISO string like "2026-01-04T03:14:15Z")
- `purchase_date` (ISO string like "2026-01-03T22:32:45Z")

Updated to:
```typescript
// Convert date strings to milliseconds
const purchaseMs = entitlement.purchase_date 
  ? new Date(entitlement.purchase_date).getTime() 
  : undefined;
const expiresMs = entitlement.expires_date 
  ? new Date(entitlement.expires_date).getTime() 
  : undefined;
```

---

## Testing Instructions

### Why Previous Tests Showed FREE Plan

Your test purchases expired hours ago. The system is working correctly by showing FREE plan for expired subscriptions.

### How to Test the Fix

#### Option 1: Make New Test Purchase (Recommended)
1. Open the mobile app
2. Go to subscription/paywall screen
3. Make a NEW sandbox purchase (Plus or Pro)
4. **Immediately** check subscription status (within minutes for monthly, within ~1 hour for annual)
5. The app should now show the correct plan

#### Option 2: Verify Logs
After making a new purchase, check the API logs for:
```
[RevenueCat Sync] Checking entitlement: {
  id: 'pro',
  expires_date: '2026-01-04T17:15:00Z',
  is_active: true,
  time_until_expiry_hours: '0.92'
}
[RevenueCat Sync] Active entitlements: [ 'pro' ]
[RevenueCat Sync] Processing entitlement: { ... }
```

#### Option 3: Manual Sync via GraphQL
```graphql
mutation {
  syncSubscription {
    success
    subscription {
      plan
      status
      currentPeriodEnd
    }
    error
  }
}
```

---

## Sandbox Subscription Durations

For future testing reference:

| Production Duration | Sandbox Duration |
|---------------------|------------------|
| 7 days trial        | 3 minutes        |
| 1 month             | 5 minutes        |
| 3 months            | 15 minutes       |
| 6 months            | 30 minutes       |
| 1 year              | 1 hour           |

**Important**: Sandbox subscriptions auto-renew up to 6 times (total ~6 hours for annual), then expire.

---

## Expected Behavior After Fix

### Scenario 1: Active Subscription
```
User makes purchase → Sync runs → Finds active entitlement → Sets correct plan (PLUS/PRO)
```

### Scenario 2: Expired Subscription
```
Subscription expires → Sync runs → No active entitlements → Sets FREE plan
```

### Scenario 3: Multiple Entitlements
```
User has multiple entitlements → Sync processes first active one → Sets highest tier plan
```

---

## Related Files Modified

1. **apps/api/src/services/revenuecat-service.ts** (lines 359-391)
   - Fixed entitlement filtering logic
   - Added detailed expiration logging
   - Now correctly handles RevenueCat REST API response structure

---

## Previous Fixes Recap

### Fix 1: Error Propagation (from earlier session)
- Modified `syncUserSubscriptionFromRevenueCat()` to re-throw errors
- Ensures GraphQL resolver returns `success: false` on failures

### Fix 2: Environment Variable Consistency (from earlier session)
- Changed `process.env.REVENUECAT_API_KEY` to `env.REVENUECAT_API_KEY`
- Ensures consistent environment variable normalization

### Fix 3: API Response Structure (current fix)
- Fixed entitlement filtering to work with actual REST API response
- Added expiration date checking
- Enhanced logging for debugging
- Fixed property name inconsistency: using `expires_date` and `purchase_date` (strings) instead of non-existent `_ms` versions
- Added proper date-to-milliseconds conversion for webhook event creation

---

## Next Steps

1. **Deploy the fix** to your Railway environment
2. **Make a new test purchase** in the mobile app
3. **Verify** the subscription type updates correctly within the sandbox expiration window
4. **Monitor logs** to confirm the new filtering logic works as expected

---

## Additional Notes

- The original issue was a **combination** of expired test purchases AND incorrect API response handling
- With this fix, the code will correctly identify active subscriptions when they exist
- The enhanced logging will help diagnose any future issues more quickly
- Consider adding webhook support for real-time updates (webhooks would catch subscription changes immediately rather than relying on sync polling)

