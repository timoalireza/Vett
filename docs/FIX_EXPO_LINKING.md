# Fix Expo Linking Native Module Error

If you're seeing `Cannot find native module 'ExpoLinking'`, follow these steps:

## Quick Fix (Development)

The `scheme: "vett"` is already configured in app.json, which is all that's needed for expo-linking. You need to rebuild the app with native modules:

### Option 1: Development Build (Recommended)

1. **Stop the current Metro bundler**

2. **Rebuild the app:**
   ```bash
   cd apps/mobile
   
   # For iOS
   pnpm exec expo run:ios
   
   # For Android
   pnpm exec expo run:android
   ```

   This creates a development build with all native modules included.

### Option 2: Use Expo Go (Limited)

If you're using Expo Go, `expo-linking` may not work. The code has been updated with a fallback, but OAuth redirects might not work properly.

**To use Expo Go:**
```bash
cd apps/mobile
pnpm exec expo start
# Then scan QR code with Expo Go app
```

**Note:** OAuth flows may not work correctly in Expo Go. Use a development build for full functionality.

## Verify Configuration

Check that `app.json` includes the scheme (no plugin needed):
```json
{
  "expo": {
    "scheme": "vett",
    "plugins": [
      "expo-router"
    ]
  }
}
```

The `scheme` field is sufficient - `expo-linking` doesn't require a plugin entry.

## After Rebuild

Once rebuilt, the `expo-linking` module should be available and OAuth redirects will work correctly.

## Troubleshooting

If errors persist:

1. **Clear caches:**
   ```bash
   cd apps/mobile
   rm -rf .expo node_modules/.cache
   ```

2. **Reinstall:**
   ```bash
   cd ../..
   pnpm install --filter mobile
   ```

3. **Rebuild:**
   ```bash
   cd apps/mobile
   pnpm exec expo prebuild --clean
   pnpm exec expo run:ios  # or run:android
   ```


