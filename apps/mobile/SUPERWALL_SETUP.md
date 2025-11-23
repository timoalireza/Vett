# Superwall Setup Guide for Vett Mobile App

This guide will walk you through setting up Superwall for paywall management in your React Native Expo app.

## Prerequisites

1. **Superwall Account**: Sign up at [superwall.com](https://superwall.com)
2. **API Key**: Get your API key from the Superwall dashboard (Settings → API Keys)
3. **App Store Connect Setup**: Configure your in-app purchase products in App Store Connect (iOS) and Google Play Console (Android)

## Step 1: Install Superwall SDK

**Important**: Superwall doesn't have a direct React Native npm package. You'll need to use the native iOS/Android SDKs.

### Option A: Use Native SDKs (Recommended for Expo Dev Client)

Since you're using Expo with a dev client, you can add Superwall's native SDKs:

**For iOS:**
1. Add to `ios/Podfile`:
```ruby
pod 'SuperwallKit', '~> 3.0'
```

2. Run:
```bash
cd ios && pod install && cd ..
```

**For Android:**
1. Add to `android/app/build.gradle`:
```gradle
dependencies {
    implementation 'com.superwall:superwall-android:3.0.0'
}
```

Then create a React Native bridge module to use Superwall from JavaScript.

### Option B: Use Expo Config Plugin (If Available)

Check if Superwall has an Expo config plugin. If not, you'll need to create a custom native module bridge.

### Option C: Use RevenueCat Instead (Alternative)

If Superwall setup is too complex, consider using [RevenueCat](https://www.revenuecat.com/) which has excellent React Native/Expo support:
```bash
pnpm add react-native-purchases
```

**Note**: After adding native dependencies, rebuild your app:
```bash
pnpm exec expo prebuild --clean
pnpm exec expo run:ios
```

## Step 2: Configure Superwall API Key

Add your Superwall API key to `app.json`:

```json
{
  "expo": {
    "extra": {
      "superwallApiKey": "YOUR_SUPERWALL_API_KEY_HERE"
    }
  }
}
```

Or use environment variables:
- Create `.env` file: `EXPO_PUBLIC_SUPERWALL_API_KEY=your_key_here`
- Access via `process.env.EXPO_PUBLIC_SUPERWALL_API_KEY`

## Step 3: Initialize Superwall

Create a Superwall service file to handle initialization and integration:

**File**: `src/services/superwall.ts`

```typescript
import Superwall from 'react-native-superwall';
import Constants from 'expo-constants';
import { useAuth } from '@clerk/clerk-expo';

// Get API key from config
const getSuperwallApiKey = (): string => {
  const envKey = process.env.EXPO_PUBLIC_SUPERWALL_API_KEY;
  const configKey = Constants.expoConfig?.extra?.superwallApiKey;
  
  if (!envKey && !configKey) {
    throw new Error('Superwall API key not found. Add EXPO_PUBLIC_SUPERWALL_API_KEY to .env or superwallApiKey to app.json');
  }
  
  return envKey || configKey;
};

let superwallInitialized = false;

/**
 * Initialize Superwall SDK
 * Call this once when your app starts
 */
export async function initializeSuperwall(userId?: string): Promise<void> {
  if (superwallInitialized) {
    console.log('[Superwall] Already initialized');
    return;
  }

  try {
    const apiKey = getSuperwallApiKey();
    
    await Superwall.configure(apiKey, {
      userId: userId || undefined,
    });
    
    superwallInitialized = true;
    console.log('[Superwall] Initialized successfully');
  } catch (error) {
    console.error('[Superwall] Initialization failed:', error);
    throw error;
  }
}

/**
 * Identify user with Clerk user ID
 * Call this after user signs in
 */
export async function identifyUser(userId: string, email?: string): Promise<void> {
  try {
    await Superwall.identify(userId, {
      email: email,
    });
    console.log('[Superwall] User identified:', userId);
  } catch (error) {
    console.error('[Superwall] User identification failed:', error);
  }
}

/**
 * Reset user session
 * Call this when user signs out
 */
export async function resetUser(): Promise<void> {
  try {
    await Superwall.reset();
    console.log('[Superwall] User session reset');
  } catch (error) {
    console.error('[Superwall] Reset failed:', error);
  }
}

/**
 * Register a placement for paywall presentation
 * @param placementId - The placement identifier from Superwall dashboard
 * @param onDismiss - Callback when paywall is dismissed
 * @param onSkip - Callback when paywall is skipped (user has access)
 */
export async function registerPlacement(
  placementId: string,
  onDismiss?: () => void,
  onSkip?: () => void
): Promise<void> {
  try {
    await Superwall.register(placementId, {
      onDismiss: onDismiss,
      onSkip: onSkip,
    });
  } catch (error) {
    console.error(`[Superwall] Failed to register placement ${placementId}:`, error);
  }
}

/**
 * Present a paywall for a specific placement
 * @param placementId - The placement identifier
 */
export async function presentPaywall(placementId: string): Promise<void> {
  try {
    await Superwall.present(placementId);
  } catch (error) {
    console.error(`[Superwall] Failed to present paywall ${placementId}:`, error);
  }
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(): Promise<boolean> {
  try {
    const subscriptionStatus = await Superwall.getSubscriptionStatus();
    return subscriptionStatus === 'ACTIVE';
  } catch (error) {
    console.error('[Superwall] Failed to check subscription status:', error);
    return false;
  }
}

export default {
  initializeSuperwall,
  identifyUser,
  resetUser,
  registerPlacement,
  presentPaywall,
  hasActiveSubscription,
};
```

## Step 4: Integrate with App Layout

Update `app/_layout.tsx` to initialize Superwall:

```typescript
import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { initializeSuperwall, identifyUser, resetUser } from '../src/services/superwall';

export default function RootLayout() {
  const { userId, isSignedIn } = useAuth();

  useEffect(() => {
    // Initialize Superwall on app start
    initializeSuperwall().catch(console.error);
  }, []);

  useEffect(() => {
    if (isSignedIn && userId) {
      // Identify user when signed in
      identifyUser(userId).catch(console.error);
    } else {
      // Reset when signed out
      resetUser().catch(console.error);
    }
  }, [isSignedIn, userId]);

  // ... rest of your layout code
}
```

## Step 5: Update Subscription Modal

Update `app/modals/subscription.tsx` to use Superwall:

```typescript
import { presentPaywall } from '../../src/services/superwall';

export default function SubscriptionModal() {
  // ... existing code ...

  const handleSubscribe = async (plan: Plan) => {
    try {
      // Present Superwall paywall
      // Replace 'subscription_modal' with your actual placement ID from Superwall dashboard
      await presentPaywall('subscription_modal');
      
      // Paywall will handle the purchase flow
      // You can listen for purchase events if needed
    } catch (error) {
      console.error('Failed to present paywall:', error);
      // Fallback to your custom modal if Superwall fails
    }
  };

  // ... rest of your component
}
```

## Step 6: Set Up Paywall Triggers

Create a hook for paywall triggers:

**File**: `src/hooks/use-paywall.ts`

```typescript
import { useCallback } from 'react';
import { presentPaywall, registerPlacement } from '../services/superwall';

export function usePaywall() {
  /**
   * Trigger paywall when user tries to access premium feature
   */
  const triggerPaywall = useCallback(async (placementId: string) => {
    try {
      await presentPaywall(placementId);
    } catch (error) {
      console.error('Paywall trigger failed:', error);
    }
  }, []);

  /**
   * Register a placement with fallback action
   * Use this for feature gating
   */
  const registerFeatureGate = useCallback(
    async (placementId: string, onGranted: () => void) => {
      await registerPlacement(placementId, undefined, onGranted);
    },
    []
  );

  return {
    triggerPaywall,
    registerFeatureGate,
  };
}
```

## Step 7: Configure Products in Superwall Dashboard

1. **Log in to Superwall Dashboard**: [dashboard.superwall.com](https://dashboard.superwall.com)

2. **Create Products**:
   - Go to **Products** → **+ New Product**
   - Add your products:
     - `com.timoalireza.vett.plus.monthly`
     - `com.timoalireza.vett.plus.annual`
     - `com.timoalireza.vett.pro.monthly`
     - `com.timoalireza.vett.pro.annual`
   - Match these IDs exactly with your App Store Connect product IDs

3. **Create Paywall**:
   - Go to **Paywalls** → **+ New Paywall**
   - Design your paywall using the visual editor
   - Link products to purchase buttons
   - Set up pricing display

4. **Create Placement**:
   - Go to **Placements** → **+ New Placement**
   - Name: `subscription_modal`
   - Assign your paywall to this placement
   - Configure when to show (immediately, after X seconds, etc.)

5. **Set Up Campaigns** (Optional):
   - Create campaigns to A/B test different paywalls
   - Set audience filters (e.g., free users only)
   - Configure presentation rules

## Step 8: Feature Gating Example

Example: Gate premium features behind paywall:

```typescript
import { usePaywall } from '../hooks/use-paywall';

function AnalyzeScreen() {
  const { triggerPaywall } = usePaywall();

  const handlePremiumFeature = async () => {
    // Check if user has subscription
    const hasAccess = await hasActiveSubscription();
    
    if (!hasAccess) {
      // Show paywall
      await triggerPaywall('premium_feature');
      return;
    }
    
    // User has access, proceed
    // ... your premium feature code
  };

  return (
    // ... your UI
  );
}
```

## Step 9: Testing

1. **Test Mode**: Superwall has a test mode - enable it in dashboard settings
2. **Sandbox Testing**: Use App Store Connect sandbox testers
3. **Debug Logs**: Enable debug logging in Superwall dashboard

## Step 10: Production Checklist

- [ ] Add Superwall API key to production environment
- [ ] Configure products in App Store Connect / Google Play Console
- [ ] Match product IDs exactly between stores and Superwall
- [ ] Test purchase flow end-to-end
- [ ] Set up analytics tracking
- [ ] Configure webhook endpoints (if using server-side validation)
- [ ] Test subscription restoration
- [ ] Test subscription cancellation flow

## Troubleshooting

### Common Issues

1. **"API key not found"**
   - Ensure API key is in `.env` or `app.json`
   - Rebuild app after adding key

2. **"Paywall not showing"**
   - Check placement ID matches dashboard
   - Verify user is identified
   - Check campaign rules

3. **"Purchase not completing"**
   - Verify product IDs match App Store Connect
   - Check sandbox tester account
   - Review Superwall dashboard logs

## Additional Resources

- [Superwall Documentation](https://superwall.com/docs)
- [React Native Integration Guide](https://superwall.com/docs/react-native)
- [Paywall Editor Guide](https://superwall.com/docs/dashboard-creating-paywalls)
- [API Reference](https://superwall.com/docs/api-reference)

## Next Steps

1. Install the SDK
2. Add your API key
3. Initialize Superwall in your app
4. Create paywalls in the dashboard
5. Test the integration
6. Deploy to production

