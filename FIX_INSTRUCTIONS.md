# Fix for "Malformed calls from JS" Error

## Quick Fix (Recommended)

1. **Stop any running Metro/Expo processes**
   ```bash
   pkill -f "expo start" || true
   pkill -f "metro" || true
   ```

2. **Clean iOS Simulator**
   ```bash
   xcrun simctl erase all
   # or just: Device > Erase All Content and Settings in Simulator
   ```

3. **Rebuild the iOS app**
   ```bash
   cd /Users/timoalireza/Documents/Vett/apps/mobile
   pnpm ios
   ```

   This will:
   - Start Metro bundler
   - Build the native iOS app
   - Launch iOS Simulator automatically
   - Install and run the app

4. **Wait for the build** (3-5 minutes)
   - You'll see compilation progress
   - Simulator will launch automatically
   - App should start without the error

## Alternative: Manual Xcode Build

If `pnpm ios` doesn't work:

1. Open Xcode:
   ```bash
   cd /Users/timoalireza/Documents/Vett/apps/mobile
   open ios/Vett.xcworkspace
   ```

2. In Xcode:
   - Product → Clean Build Folder (⌘⇧K)
   - Select a simulator from the device menu
   - Product → Run (⌘R)

3. Start Metro separately:
   ```bash
   cd /Users/timoalireza/Documents/Vett/apps/mobile
   pnpm dev
   ```

## Why This Happens

The React Native bridge passes data between JavaScript and native code. When you:
- Update dependencies
- Change native code
- Hot reload without rebuilding

The data structures can get out of sync, causing the "field sizes are different" error.

## Prevention

- Always rebuild the native app (`pnpm ios`) after:
  - Installing/updating npm packages
  - Running `pod install`
  - Updating React Native or Expo
- Use `pnpm ios` instead of just `pnpm dev` when in doubt

## Additional Note: Package Version Warnings

Your project has some package version mismatches with Expo SDK 51:
- `@react-native-masked-view/masked-view@0.3.2` (expected: 0.3.1)
- `expo-apple-authentication@7.2.4` (expected: ~6.4.2)
- `expo-auth-session@5.4.0` (expected: ~5.5.2)
- `expo-clipboard@5.0.1` (expected: ~6.0.3)
- `expo-local-authentication@13.8.0` (expected: ~14.0.1)
- `react-native-webview@13.16.0` (expected: 13.8.6)

These may cause issues. Consider running:
```bash
npx expo install --fix
```

To automatically align all package versions with your Expo SDK.


