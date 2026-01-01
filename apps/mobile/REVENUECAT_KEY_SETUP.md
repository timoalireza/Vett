# RevenueCat API Key Setup Guide

## 🎯 Current Configuration Status

Your app supports both **PRODUCTION** and **SANDBOX/TEST** modes with RevenueCat for easy testing and development.

## 📋 Key Labels in RevenueCat Dashboard

When you log into [RevenueCat Dashboard](https://app.revenuecat.com) → **Project Settings** → **API Keys**, you'll see:

## ✅ If your key starts with `test_` (RevenueCat Test Store)

If you're using **RevenueCat's Test Store** (RevenueCat-managed sandbox/testing, not Apple/Google), your public SDK key will start with **`test_`**.

- **Where it lives**: RevenueCat Dashboard → **Project Settings** → **API Keys** → **Public app-specific API keys** → **Test Store**
- **Where to put it (this repo)**: `apps/mobile/.env` as:

```bash
EXPO_PUBLIC_REVENUECAT_API_KEY=test_your_test_store_key_here
EXPO_PUBLIC_REVENUECAT_SANDBOX_MODE=true
```

You **do not upload** this `test_...` key to Apple.

### ✅ Use These Keys (Public SDK Keys)

Under **"Public app-specific API keys"** section, you'll see keys for different environments:

#### Production Keys (for live app)
| Platform | Label in Dashboard | Key Format | Environment Variable |
|----------|-------------------|------------|---------------------|
| **iOS Production** | **Apple App Store** (Production section) | `appl_xxxxxxxxxxxxx` | `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` |
| **Android Production** | **Google Play Store** (Production section) | `goog_xxxxxxxxxxxxx` | `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` |

#### Sandbox/Test Keys (for testing)
| Platform | Label in Dashboard | Key Format | Environment Variable |
|----------|-------------------|------------|---------------------|
| **iOS Sandbox** | **Apple App Store** (Sandbox section) | `appl_xxxxxxxxxxxxx` | `EXPO_PUBLIC_REVENUECAT_IOS_SANDBOX_API_KEY` |
| **Android Sandbox** | **Google Play Store** (Sandbox section) | `goog_xxxxxxxxxxxxx` | `EXPO_PUBLIC_REVENUECAT_ANDROID_SANDBOX_API_KEY` |

#### Test Store Key (RevenueCat-only testing)
| Platform | Label in Dashboard | Key Format | Environment Variable |
|----------|-------------------|------------|---------------------|
| **Test Store** | **Test Store** | `test_xxxxxxxxxxxxx` | `EXPO_PUBLIC_REVENUECAT_API_KEY` |

**Note:** In RevenueCat, the **label is the same** ("Apple App Store"), but keys are in different **sections** or **tabs** (Production vs Sandbox). Look for section headers or tabs that say "Production" or "Sandbox"/"Test" to find the right key.

### ❌ DO NOT Use These Keys

| Key Type | Label | Format | Why Not? |
|----------|-------|--------|----------|
| Secret Keys | "Secret API keys" | `sk_xxxxx` | Backend only - never in mobile app |

## 🔧 How to Configure

### Step 1: Get Your Keys from RevenueCat

1. Go to [app.revenuecat.com](https://app.revenuecat.com)
2. Navigate to **Project Settings** → **API Keys**
3. Scroll to **"Public app-specific API keys"** section
4. You'll see keys organized by environment (Production and Sandbox/Test)

**For Production Keys:**
- Look for the **Production** section or tab
- Copy the **Apple App Store** key (starts with `appl_`)
- This is your production/live key

**For Sandbox/Test Keys:**
- Look for the **Sandbox** or **Test** section or tab
- Copy the **Apple App Store** key (starts with `appl_`)
- This is your test/sandbox key for development

**Important:** Both keys have the same label ("Apple App Store"), but they're in **different sections** (Production vs Sandbox). Make sure you copy from the correct section!

### Step 2: Add Keys to Your Mobile App

**Option A: Using .env file (Recommended)**

Edit `apps/mobile/.env`:

```bash
# ============================================
# PRODUCTION KEYS (from Production section in RevenueCat)
# ============================================

# iOS Production Key (REQUIRED for live app)
# From: RevenueCat → API Keys → Production section → "Apple App Store"
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_your_production_ios_key_here

# Android Production Key (ADD LATER when setting up Android)
# From: RevenueCat → API Keys → Production section → "Google Play Store"
# EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_your_production_android_key_here

# ============================================
# SANDBOX/TEST KEYS (from Sandbox section in RevenueCat)
# ============================================

# iOS Sandbox Key (for testing with sandbox data)
# From: RevenueCat → API Keys → Sandbox section → "Apple App Store"
EXPO_PUBLIC_REVENUECAT_IOS_SANDBOX_API_KEY=appl_your_sandbox_ios_key_here

# Android Sandbox Key (ADD LATER when setting up Android testing)
# From: RevenueCat → API Keys → Sandbox section → "Google Play Store"
# EXPO_PUBLIC_REVENUECAT_ANDROID_SANDBOX_API_KEY=goog_your_sandbox_android_key_here

# ============================================
# MODE TOGGLE
# ============================================

# Set to 'true' for sandbox/test mode (uses sandbox keys)
# Set to 'false' or remove for production mode (uses production keys)
EXPO_PUBLIC_REVENUECAT_SANDBOX_MODE=false
```

**Using Test Store instead of Apple/Google (key starts with `test_`)**

If you're not using Apple sandbox testers / Google Play testing yet and just want RevenueCat's Test Store:

```bash
EXPO_PUBLIC_REVENUECAT_API_KEY=test_your_test_store_key_here
EXPO_PUBLIC_REVENUECAT_SANDBOX_MODE=true
```

In sandbox mode, this repo will fall back to `EXPO_PUBLIC_REVENUECAT_API_KEY` if platform-specific sandbox keys are not set.

**Option B: Using app.json**

Edit `apps/mobile/app.json`:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://api.vett.xyz",
      "clerkPublishableKey": "pk_live_Y2xlcmsudmV0dC54eXok",
      "revenueCatIosApiKey": "appl_your_production_ios_key",
      "revenueCatIosSandboxApiKey": "appl_your_sandbox_ios_key",
      "revenueCatSandboxMode": false
    }
  }
}
```

### Step 3: Backend API Configuration

For webhook integration, edit `apps/api/.env`:

```bash
# RevenueCat Secret API Key (from "Secret API keys" section)
# This is DIFFERENT from mobile SDK keys - do NOT use `test_...` here.
# (RevenueCat secret keys are shown in the RevenueCat dashboard under "Secret API keys".)
REVENUECAT_API_KEY=your_revenuecat_secret_api_key_here
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret_here
```

## 🔄 How the App Selects Keys

The app automatically selects the correct key based on:
1. **Platform** (iOS or Android)
2. **Mode** (Sandbox/Test or Production)

```typescript
// PRODUCTION MODE (EXPO_PUBLIC_REVENUECAT_SANDBOX_MODE=false or unset):
// iOS → uses EXPO_PUBLIC_REVENUECAT_IOS_API_KEY (production key)
// Android → uses EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY (production key)

// SANDBOX MODE (EXPO_PUBLIC_REVENUECAT_SANDBOX_MODE=true):
// iOS → uses EXPO_PUBLIC_REVENUECAT_IOS_SANDBOX_API_KEY (sandbox key)
// Android → uses EXPO_PUBLIC_REVENUECAT_ANDROID_SANDBOX_API_KEY (sandbox key)
```

### Switching Between Modes

**For Testing (Sandbox Mode):**
```bash
EXPO_PUBLIC_REVENUECAT_SANDBOX_MODE=true
```
- Uses sandbox keys from RevenueCat
- Shows sandbox/test data in RevenueCat dashboard
- Works with Apple sandbox testers
- Perfect for development and testing

**For Production:**
```bash
EXPO_PUBLIC_REVENUECAT_SANDBOX_MODE=false
# or simply remove the line
```
- Uses production keys from RevenueCat
- Shows real subscription data
- Works with real App Store purchases

## ✅ Verification Checklist

### For Production Setup:
- [ ] Copied production **Apple App Store** key from **Production section** (starts with `appl_`)
- [ ] Added production key to `.env` as `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
- [ ] Set `EXPO_PUBLIC_REVENUECAT_SANDBOX_MODE=false` (or removed the line)
- [ ] Backend has **Secret API key** (starts with `sk_`)

### For Sandbox/Test Setup:
- [ ] Copied sandbox **Apple App Store** key from **Sandbox section** (starts with `appl_`)
- [ ] Added sandbox key to `.env` as `EXPO_PUBLIC_REVENUECAT_IOS_SANDBOX_API_KEY`
- [ ] Set `EXPO_PUBLIC_REVENUECAT_SANDBOX_MODE=true` when testing
- [ ] Have Apple sandbox tester account configured

### General:
- [ ] **NOT** using sk_ keys in mobile app (those are for backend only)
- [ ] Keys from Production and Sandbox sections are **different values**

## 🚀 After Configuration

1. **Rebuild your app** (required for .env changes):
   ```bash
   cd apps/mobile
   pnpm exec expo prebuild --clean
   pnpm exec expo run:ios
   ```

2. **Test the integration**:
   - Open the app
   - Check console logs for:
     - Production: `[RevenueCat] Initialized successfully for ios (PRODUCTION mode)`
     - Sandbox: `[RevenueCat] Initialized successfully for ios (SANDBOX mode)`
   - Try accessing subscription features
   - Check RevenueCat dashboard shows data in correct environment

## 🐛 Troubleshooting

### "API key not found" error
- Check that key is in `.env` file
- Verify key name: `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` (not just `REVENUECAT_API_KEY`)
- Rebuild app after adding key

### "Invalid API key" error
- Ensure you're using **Apple App Store** key from correct section
- Verify key starts with `appl_` (not `sk_`)
- For production: use key from **Production section**
- For sandbox: use key from **Sandbox section**
- Check you're using the right key for your mode setting

### Key not being read
- Environment variables must start with `EXPO_PUBLIC_` to be accessible
- Rebuild app after changing `.env` file
- Check `apps/mobile/.env` file exists and is not in `.gitignore`

### Sandbox mode not working
- Verify `EXPO_PUBLIC_REVENUECAT_SANDBOX_MODE=true` is set
- Check you have a sandbox key from **Sandbox section** in RevenueCat
- Ensure sandbox key is different from production key
- Sign out of production App Store account on device
- Use Apple sandbox tester account
- Check RevenueCat dashboard - data should appear in sandbox/test environment

### Wrong data showing in RevenueCat dashboard
- **Production mode** shows data in production environment
- **Sandbox mode** shows data in sandbox/test environment
- Verify `EXPO_PUBLIC_REVENUECAT_SANDBOX_MODE` matches your intent
- Check console logs to confirm which mode app is running in

## 📱 When Adding Android Support

When you're ready to add Google Play Store:

1. Get **Google Play Store** key from RevenueCat dashboard
2. Add to `.env`:
   ```bash
   EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_your_android_key
   ```
3. Rebuild app for Android
4. The app will automatically use the Android key on Android devices

## 🔐 Security Notes

- ✅ Public SDK keys (appl_, goog_) are **safe** to embed in mobile apps
- ✅ These keys are meant to be public and are not secret
- ❌ Secret keys (sk_) should **NEVER** be in mobile app code
- ❌ Never commit actual keys to git (use .env which is in .gitignore)

## 📚 Related Documentation

- [RevenueCat Quick Start](./REVENUECAT_QUICKSTART.md)
- [RevenueCat Full Setup](./REVENUECAT_SETUP.md)
- [RevenueCat Docs](https://docs.revenuecat.com/docs/react-native)

