# Fix Clerk Module Resolution Issue

If you're seeing `Unable to resolve "@clerk/clerk-expo"` error, follow these steps:

## Quick Fix

1. **Stop the Metro bundler** (Ctrl+C in the terminal running Expo)

2. **Clear all caches:**
   ```bash
   cd apps/mobile
   rm -rf node_modules/.cache
   rm -rf .expo
   rm -rf .metro
   ```

3. **Reinstall dependencies:**
   ```bash
   cd ../..
   pnpm install --filter mobile
   ```

4. **Restart Expo with cleared cache:**
   ```bash
   cd apps/mobile
   pnpm exec expo start --clear
   ```

## Alternative: Full Clean

If the above doesn't work:

1. **Stop Metro bundler**

2. **Clear watchman (if installed):**
   ```bash
   watchman watch-del-all
   ```

3. **Clear all caches:**
   ```bash
   cd apps/mobile
   rm -rf node_modules
   rm -rf .expo
   rm -rf .metro
   rm -rf node_modules/.cache
   ```

4. **Reinstall:**
   ```bash
   cd ../..
   pnpm install
   ```

5. **Restart:**
   ```bash
   cd apps/mobile
   pnpm exec expo start --clear
   ```

## Verify Installation

Check that Clerk is installed:
```bash
cd apps/mobile
pnpm list @clerk/clerk-expo
```

Should show: `@clerk/clerk-expo 2.19.4`

## If Still Not Working

1. Check that `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is set in your environment
2. Verify `apps/mobile/package.json` includes `@clerk/clerk-expo` in dependencies
3. Try restarting your IDE/editor
4. Check Metro bundler logs for more specific errors


