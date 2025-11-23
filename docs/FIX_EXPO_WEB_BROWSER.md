# Fix ExpoWebBrowser Native Module Error

## Issue
`Cannot find native module 'ExpoWebBrowser'` error when using Clerk OAuth in Expo development build.

## Root Cause
Clerk requires `expo-web-browser` for OAuth flows, but the native module wasn't included in the iOS build.

## Solution

1. **Install expo-web-browser:**
   ```bash
   cd apps/mobile
   pnpm add expo-web-browser
   ```

2. **Add to plugins in app.json:**
   ```json
   {
     "expo": {
       "plugins": [
         "expo-router",
         "expo-web-browser"
       ]
     }
   }
   ```

3. **Clean rebuild:**
   ```bash
   cd apps/mobile
   rm -rf ios android .expo node_modules/.cache
   pnpm exec expo prebuild --clean --platform ios
   cd ios && pod install
   pnpm exec expo run:ios
   ```

## Important Notes

- **Development Build Required**: This module requires a development build (`expo run:ios`), not Expo Go
- **Plugin Configuration**: Adding `expo-web-browser` to plugins ensures Expo includes the native module
- **Clean Rebuild**: After adding the plugin, a clean rebuild is necessary to include the native module

## Verification

After rebuild, verify:
1. Build completes successfully
2. App launches in simulator
3. No `ExpoWebBrowser` errors
4. OAuth flows work correctly

## Troubleshooting

If error persists:
1. Ensure `expo-web-browser` is in `package.json` dependencies
2. Verify plugin is in `app.json` plugins array
3. Check `ios/Podfile.lock` for Expo modules (though EXWebBrowser may be included via ExpoModulesCore)
4. Do a complete clean rebuild (remove ios/, android/, .expo/)
5. Restart simulator completely


