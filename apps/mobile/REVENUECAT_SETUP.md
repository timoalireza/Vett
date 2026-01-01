# RevenueCat Setup Guide for Vett Mobile App

This guide will walk you through setting up RevenueCat for subscription management in your React Native Expo app.

## Prerequisites

1. **RevenueCat Account**: Sign up at [revenuecat.com](https://www.revenuecat.com)
2. **API Key**: Get your API key from RevenueCat dashboard (Project Settings → API Keys)
3. **App Store Connect Setup**: Configure your in-app purchase products in App Store Connect (iOS) and Google Play Console (Android)

## Step 1: Install RevenueCat SDK

The package is already installed:
```bash
pnpm add react-native-purchases
```

**Note**: RevenueCat requires native code, so you'll need to rebuild your app after installation:
```bash
pnpm exec expo prebuild --clean
pnpm exec expo run:ios
```

## Step 2: Configure RevenueCat API Key

Add your RevenueCat API key to your app configuration.

**Option A: Environment Variable (Recommended)**

Add to `.env` file:
```bash
# RevenueCat Test Store (starts with `test_`) OR a shared public SDK key
EXPO_PUBLIC_REVENUECAT_API_KEY=your_key_here

# Toggle sandbox/test mode (uses sandbox keys when present, otherwise falls back to shared key above)
EXPO_PUBLIC_REVENUECAT_SANDBOX_MODE=true
```

**Option B: app.json**

Add to `app.json`:
```json
{
  "expo": {
    "extra": {
      "revenueCatApiKey": "your_key_here",
      "revenueCatSandboxMode": true
    }
  }
}
```

**Important**: RevenueCat provides separate API keys for iOS and Android. You'll need to handle this in your code or use the same key for both platforms if configured.

## Step 3: Configure Products in RevenueCat Dashboard

1. **Log in to RevenueCat Dashboard**: [app.revenuecat.com](https://app.revenuecat.com)

2. **Create Products**:
   - Go to **Products** → **+ New Product**
   - Add your products:
     - `com.timoalireza.vett.plus.monthly`
     - `com.timoalireza.vett.plus.annual`
     - `com.timoalireza.vett.pro.monthly`
     - `com.timoalireza.vett.pro.annual`
   - Match these IDs exactly with your App Store Connect product IDs

3. **Create Entitlements**:
   - Go to **Entitlements** → **+ New Entitlement**
   - Create entitlements:
     - `plus` - for PLUS plan features
     - `pro` - for PRO plan features
   - Attach products to entitlements

4. **Create Offerings**:
   - Go to **Offerings** → **+ New Offering**
   - Create an offering (e.g., "default")
   - Add packages:
     - Monthly package: `$rc_monthly` (or custom identifier)
     - Annual package: `$rc_annual` (or custom identifier)
   - Link products to packages

## Step 4: Configure Products in App Store Connect

Make sure your product IDs in App Store Connect **exactly match** the ones in RevenueCat:
- `com.timoalireza.vett.plus.monthly`
- `com.timoalireza.vett.plus.annual`
- `com.timoalireza.vett.pro.monthly`
- `com.timoalireza.vett.pro.annual`

## Step 5: Initialize RevenueCat

RevenueCat is already initialized in `app/_layout.tsx`. The initialization happens automatically when the app starts.

## Step 6: User Identification

RevenueCat automatically syncs with Clerk authentication via `RevenueCatAuthSync` component in `app/_layout-revenuecat.tsx`.

## Step 7: Using RevenueCat in Your App

### Check Subscription Status

```typescript
import { hasActiveSubscription } from '../src/services/revenuecat';

const hasAccess = await hasActiveSubscription();
```

### Purchase a Package

```typescript
import { useRevenueCat } from '../src/hooks/use-revenuecat';

const { purchase, getMonthlyPackage } = useRevenueCat();

const handlePurchase = async () => {
  const pkg = getMonthlyPackage();
  if (pkg) {
    await purchase(pkg);
  }
};
```

### Restore Purchases

```typescript
import { restorePurchases } from '../src/services/revenuecat';

await restorePurchases();
```

## Step 8: Feature Gating Example

Example: Gate premium features behind subscription:

```typescript
import { hasEntitlement } from '../src/services/revenuecat';

const handlePremiumFeature = async () => {
  const hasAccess = await hasEntitlement('pro');
  
  if (!hasAccess) {
    // Show subscription modal
    router.push('/modals/subscription');
    return;
  }
  
  // User has access, proceed
  // ... your premium feature code
};
```

## Step 9: Testing

1. **Sandbox Testing**: Use App Store Connect sandbox testers
2. **Test Purchases**: RevenueCat has a test mode - enable it in dashboard settings
3. **Debug Logs**: Enable debug logging in RevenueCat dashboard

## Step 10: Production Checklist

- [ ] Add RevenueCat API key to production environment
- [ ] Configure products in App Store Connect / Google Play Console
- [ ] Match product IDs exactly between stores and RevenueCat
- [ ] Test purchase flow end-to-end
- [ ] Set up webhook endpoints (if using server-side validation)
- [ ] Test subscription restoration
- [ ] Test subscription cancellation flow
- [ ] Configure analytics tracking

## Troubleshooting

### Common Issues

1. **"API key not found"**
   - Ensure API key is in `.env` or `app.json`
   - Rebuild app after adding key

2. **"Offerings not loading"**
   - Check RevenueCat dashboard for offerings configuration
   - Verify API key is correct
   - Check network connectivity

3. **"Purchase not completing"**
   - Verify product IDs match App Store Connect
   - Check sandbox tester account
   - Review RevenueCat dashboard logs

4. **"User not identified"**
   - Ensure Clerk authentication is working
   - Check RevenueCatAuthSync component is mounted
   - Verify user ID is being passed correctly

## Additional Resources

- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [React Native Integration Guide](https://docs.revenuecat.com/docs/react-native)
- [RevenueCat Dashboard](https://app.revenuecat.com)
- [API Reference](https://docs.revenuecat.com/docs/api-overview)

## What's Already Set Up

✅ RevenueCat service (`src/services/revenuecat.ts`)
✅ RevenueCat hook (`src/hooks/use-revenuecat.ts`)
✅ App layout integration (`app/_layout.tsx`)
✅ User identification sync (`app/_layout-revenuecat.tsx`)
✅ Subscription modal integration (`app/modals/subscription.tsx`)

## Next Steps

1. **Add your API key** (Step 2 above)
2. **Configure products** in RevenueCat dashboard (Step 3)
3. **Configure products** in App Store Connect (Step 4)
4. **Test** the integration (Step 9)
5. **Deploy** to production (Step 10)

