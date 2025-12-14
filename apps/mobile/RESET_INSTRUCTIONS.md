# Reset App Data for Fresh Start

To test the onboarding flow from scratch, you have several options:

## Option 1: Use Expo's Clear Flag (Recommended)

Simply restart the dev server with the `--clear` flag:

```bash
cd apps/mobile
npm run dev
# or
npx expo start --clear
```

This clears the Metro bundler cache. However, to fully reset AsyncStorage data, use one of the options below.

## Option 2: Use Dev Reset Button (Easiest)

1. Open the app in the simulator
2. Navigate to **Settings** (Profile tab → Settings)
3. Scroll to the bottom
4. Tap **"Reset All App Data (Dev Only)"**
5. Confirm the reset
6. Restart the app

This will clear:
- Onboarding state (`hasOnboarded`)
- Auth state
- Subscription prompt state
- All other Vett-related storage

## Option 3: Clear Simulator/Emulator Data

### iOS Simulator
1. In Simulator menu: **Device → Erase All Content and Settings**
2. Or delete the app and reinstall

### Android Emulator
1. Go to **Settings → Apps → Vett**
2. Tap **Storage → Clear Data**
3. Or uninstall and reinstall the app

## Option 4: Programmatic Reset (For Testing)

You can also call the reset function programmatically:

```typescript
import { clearAllStorage } from './src/utils/clear-storage';

// Clear all storage
await clearAllStorage();

// Or clear just onboarding
import { clearOnboardingStorage } from './src/utils/clear-storage';
await clearOnboardingStorage();
```

## What Gets Cleared

The reset function clears all AsyncStorage keys starting with `vett.`:
- `vett.hasOnboarded`
- `vett.authMode`
- `vett.subscriptionPromptShown`
- `vett.onboarding.*` (if any)

It also attempts to clear Clerk authentication tokens.

## Notes

- The dev reset button only appears in development builds (`__DEV__ === true`)
- After resetting, you'll need to restart the app to see the onboarding flow
- Authentication state (Clerk) may persist separately - you may need to sign out manually

