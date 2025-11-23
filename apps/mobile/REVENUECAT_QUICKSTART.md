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

### 2. Get Your RevenueCat API Key

1. Sign up at [revenuecat.com](https://www.revenuecat.com)
2. Create a new project
3. Go to **Project Settings** → **API Keys**
4. Copy your API key (you'll get separate keys for iOS and Android)

### 3. Add API Key to Your App

**Option A: Environment Variable (Recommended)**

Add to `.env` file:
```bash
EXPO_PUBLIC_REVENUECAT_API_KEY=your_api_key_here
```

**Option B: app.json**

Add to `app.json`:
```json
{
  "expo": {
    "extra": {
      "revenueCatApiKey": "your_api_key_here"
    }
  }
}
```

**Note**: If you have separate iOS/Android keys, you can modify `src/services/revenuecat.ts` to handle them separately.

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

