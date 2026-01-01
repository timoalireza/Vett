# RevenueCat Quick Start Guide

## 🚀 Quick Setup Steps

### 1. ✅ Install RevenueCat SDK

Already done! The package `react-native-purchases` is installed.

**Important**: Since RevenueCat requires native code, rebuild your app:

```bash
# Clean and rebuild iOS
pnpm exec expo prebuild --clean
pnpm exec expo run:ios
```

### 2. Get Your RevenueCat API Keys

1. Sign up at [revenuecat.com](https://www.revenuecat.com)
2. Create a new project
3. Go to **Project Settings** → **API Keys**
4. Find **"Public app-specific API keys"** section (NOT "Secret API keys")
5. You'll see keys organized by environment:

**If your key starts with `test_` (RevenueCat Test Store):**
- This is RevenueCat’s **Test Store** key (RevenueCat-only testing; not Apple/Google)
- Copy the **Test Store** key (starts with `test_`)
- You will use it as `EXPO_PUBLIC_REVENUECAT_API_KEY` (see below)

**Production Keys** (for live app):
- Look for **Production** section or tab
- Copy **Apple App Store** key (starts with `appl_`)

**Sandbox Keys** (for testing):
- Look for **Sandbox** or **Test** section or tab
- Copy **Apple App Store** key (starts with `appl_`)

**⚠️ IMPORTANT:**
- Both environments use the same **label** ("Apple App Store")
- Keys are in **different sections** (Production vs Sandbox)
- Copy from the correct section for each purpose
- Use **public SDK** keys (NOT sk_ secret keys)

### 3. Add API Keys to Your App

**Option A: Environment Variable (Recommended)**

Add to `.env` file:
```bash
# RevenueCat Test Store (key starts with `test_`)
# Use this if you're testing via RevenueCat (not Apple sandbox / not Google Play yet)
EXPO_PUBLIC_REVENUECAT_API_KEY=test_your_test_store_key
EXPO_PUBLIC_REVENUECAT_SANDBOX_MODE=true

# Production Keys (from Production section in RevenueCat)
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_your_production_key

# Sandbox Keys (from Sandbox section in RevenueCat) 
EXPO_PUBLIC_REVENUECAT_IOS_SANDBOX_API_KEY=appl_your_sandbox_key

# Mode: 'true' for testing, 'false' or unset for production
EXPO_PUBLIC_REVENUECAT_SANDBOX_MODE=false
```

**Option B: app.json**

Add to `app.json`:
```json
{
  "expo": {
    "extra": {
      "revenueCatIosApiKey": "appl_your_production_key",
      "revenueCatIosSandboxApiKey": "appl_your_sandbox_key",
      "revenueCatSandboxMode": false
    }
  }
}
```

**Switching Modes:**
- For production: Set `EXPO_PUBLIC_REVENUECAT_SANDBOX_MODE=false`
- For testing: Set `EXPO_PUBLIC_REVENUECAT_SANDBOX_MODE=true`

### 4. Configure Products in RevenueCat Dashboard

1. **Create Products** (Products → + New Product):
   - `com.timoalireza.vett.plus.monthly`
   - `com.timoalireza.vett.plus.annual`
   - `com.timoalireza.vett.pro.monthly`
   - `com.timoalireza.vett.pro.annual`

2. **Create Entitlements** (Entitlements → + New Entitlement):
   - `plus` - for PLUS plan features
   - `pro` - for PRO plan features
   - Attach products to entitlements

3. **Create Offering** (Offerings → + New Offering):
   - Name: "default"
   - Add packages:
     - Monthly: `$rc_monthly`
     - Annual: `$rc_annual`
   - Link products to packages

### 5. Configure App Store Connect Products

Make sure your product IDs in App Store Connect **exactly match**:
- `com.timoalireza.vett.plus.monthly`
- `com.timoalireza.vett.plus.annual`
- `com.timoalireza.vett.pro.monthly`
- `com.timoalireza.vett.pro.annual`

> If you're using **RevenueCat Test Store**, you can defer App Store Connect setup until you're ready to test real App Store purchases.

### 6. Test the Integration

1. Rebuild your app:
   ```bash
   pnpm exec expo run:ios
   ```

2. Sign in to your app
3. Navigate to subscription modal
4. Test purchase flow (use sandbox tester)

## 📝 What's Already Set Up

✅ RevenueCat service (`src/services/revenuecat.ts`)
✅ RevenueCat hook (`src/hooks/use-revenuecat.ts`)
✅ App layout integration (`app/_layout.tsx`)
✅ User identification sync (`app/_layout-revenuecat.tsx`)
✅ Subscription modal integration (`app/modals/subscription.tsx`)

## 🔧 Next Steps

1. **Add your API key** (Step 3 above)
2. **Configure products** in RevenueCat dashboard (Step 4)
3. **Configure products** in App Store Connect (Step 5)
4. **Test** the integration (Step 6)

## 📚 Documentation

- Full setup guide: `REVENUECAT_SETUP.md`
- RevenueCat docs: https://docs.revenuecat.com
- React Native guide: https://docs.revenuecat.com/docs/react-native

## ⚠️ Important Notes

- RevenueCat requires native code, so you **must rebuild** after installation
- Product IDs must match exactly between App Store Connect and RevenueCat
- Test in sandbox mode before going to production
- RevenueCat automatically handles receipt validation

## 🐛 Troubleshooting

**"API key not found"**
- Check `.env` file or `app.json`
- Rebuild app after adding key

**"Offerings not loading"**
- Verify API key is correct
- Check RevenueCat dashboard for offerings configuration
- Review network connectivity

**"Purchase not completing"**
- Verify product IDs match App Store Connect
- Check sandbox tester account
- Review RevenueCat dashboard logs

**"Package not found"**
- Run `pnpm install` after adding package
- Rebuild native app with `expo prebuild --clean`

## 💡 Usage Examples

### Check Subscription Status

```typescript
import { hasActiveSubscription } from '../src/services/revenuecat';

const hasAccess = await hasActiveSubscription();
```

### Use in Component

```typescript
import { useRevenueCat } from '../src/hooks/use-revenuecat';

const { hasSubscription, purchase, getMonthlyPackage } = useRevenueCat();

const handlePurchase = async () => {
  const pkg = getMonthlyPackage();
  if (pkg) {
    await purchase(pkg);
  }
};
```

### Feature Gating

```typescript
import { hasEntitlement } from '../src/services/revenuecat';

const hasProAccess = await hasEntitlement('pro');
```

