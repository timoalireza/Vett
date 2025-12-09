# Superwall Quick Start Guide

## 🚀 Quick Setup Steps

### 1. Install Superwall SDK

**⚠️ Important**: Superwall doesn't have a direct React Native npm package. You have two options:

**Option A: Use RevenueCat (Recommended)**
```bash
cd apps/mobile
pnpm add react-native-purchases
```

**Option B: Use Superwall Native SDKs**
You'll need to add the native iOS/Android SDKs and create a bridge. See `SUPERWALL_NATIVE_SETUP.md` for details.

**Important**: After adding native dependencies, rebuild your app:
```bash
# Clean and rebuild iOS
pnpm exec expo prebuild --clean
pnpm exec expo run:ios
```

### 2. Get Your Superwall API Key

1. Sign up at [superwall.com](https://superwall.com)
2. Create a new project
3. Go to **Settings** → **API Keys**
4. Copy your API key

### 3. Add API Key to Your App

**Option A: Environment Variable (Recommended)**

Add to `.env` file:
```bash
EXPO_PUBLIC_SUPERWALL_API_KEY=your_api_key_here
```

**Option B: app.json**

Add to `app.json`:
```json
{
  "expo": {
    "extra": {
      "superwallApiKey": "your_api_key_here"
    }
  }
}
```

### 4. Enable Superwall SDK

After installing the package, uncomment the Superwall imports in:
- `src/services/superwall.ts` - Remove comments from Superwall API calls

### 5. Configure Products in Superwall Dashboard

1. **Create Products** (Settings → Products):
   - `com.timoalireza.vett.plus.monthly`
   - `com.timoalireza.vett.plus.annual`
   - `com.timoalireza.vett.pro.monthly`
   - `com.timoalireza.vett.pro.annual`

2. **Create Paywall** (Paywalls → + New Paywall):
   - Design your paywall
   - Link products to purchase buttons
   - Customize pricing display

3. **Create Placement** (Placements → + New Placement):
   - Name: `subscription_modal`
   - Assign your paywall
   - Configure presentation rules

### 6. Configure App Store Connect Products

Make sure your product IDs in App Store Connect **exactly match** the ones in Superwall:
- `com.timoalireza.vett.plus.monthly`
- `com.timoalireza.vett.plus.annual`
- `com.timoalireza.vett.pro.monthly`
- `com.timoalireza.vett.pro.annual`

### 7. Test the Integration

1. Rebuild your app:
   ```bash
   pnpm exec expo run:ios
   ```

2. Sign in to your app
3. Navigate to subscription modal
4. Test paywall presentation

## 📝 What's Already Set Up

✅ Superwall service (`src/services/superwall.ts`)
✅ Paywall hook (`src/hooks/use-paywall.ts`)
✅ App layout integration (`app/_layout.tsx`)
✅ User identification sync (implemented in `src/services/superwall.ts`)
✅ Subscription modal integration (`app/modals/subscription.tsx`)

## 🔧 Next Steps

1. **Install the SDK** (Step 1 above)
2. **Add your API key** (Step 3 above)
3. **Uncomment Superwall code** in `src/services/superwall.ts`
4. **Create paywalls** in Superwall dashboard
5. **Test** the integration

## 📚 Documentation

- Full setup guide: `SUPERWALL_SETUP.md`
- Superwall docs: https://superwall.com/docs
- React Native guide: https://superwall.com/docs/react-native

## ⚠️ Important Notes

- Superwall requires native code, so you **must rebuild** after installation
- Product IDs must match exactly between App Store Connect and Superwall
- Test in sandbox mode before going to production
- The code is currently commented out - uncomment after installing the package

## 🐛 Troubleshooting

**"API key not found"**
- Check `.env` file or `app.json`
- Rebuild app after adding key

**"Paywall not showing"**
- Verify placement ID matches dashboard
- Check user is identified (signed in)
- Review Superwall dashboard logs

**"Package not found"**
- Run `pnpm install` after adding package
- Rebuild native app with `expo prebuild --clean`

