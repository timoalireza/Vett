# Onboarding Carousel Image Display Fix

## Problem
Images were not displaying in the onboarding carousel (`apps/mobile/app/onboarding/welcome.tsx`).

## Root Cause
The images were being loaded using `require()` statements directly inside an object literal. While this can work, Metro bundler (React Native's JavaScript bundler) sometimes has issues with this pattern, especially in production builds or when the bundle cache is stale.

## Solution Applied

### 1. Extracted require() calls to top-level constants
Changed from:
```typescript
const SLIDE_BACKGROUNDS: { [key: number]: ImageSourcePropType | null } = {
  0: require("../../assets/onboarding/slide-1-info-moves-fast.png"),
  1: require("../../assets/onboarding/slide-2-verification.png"),
  // ...
};
```

To:
```typescript
const SLIDE_IMAGE_1 = require("../../assets/onboarding/slide-1-info-moves-fast.png");
const SLIDE_IMAGE_2 = require("../../assets/onboarding/slide-2-verification.png");
const SLIDE_IMAGE_3 = require("../../assets/onboarding/slide-3-frictionless.png");
const SLIDE_IMAGE_4 = require("../../assets/onboarding/slide-4-truth-layer.png");

const SLIDE_BACKGROUNDS: { [key: number]: ImageSourcePropType | null } = {
  0: SLIDE_IMAGE_1,
  1: SLIDE_IMAGE_2,
  2: SLIDE_IMAGE_3,
  3: SLIDE_IMAGE_4,
  4: null,
};
```

This ensures Metro bundler can properly resolve and bundle the images.

### 2. Code cleanup
Ensured the code is production-ready without temporary debugging statements.

## Next Steps for User

### 1. Clear Metro Bundler Cache
You'll need to restart the Metro bundler with a clean cache. Run one of these commands:

```bash
# From apps/mobile directory
pnpm expo start --clear

# Or if you prefer npm
npx expo start --clear

# Or if already running, stop it and run
rm -rf apps/mobile/.expo
pnpm expo start
```

### 2. Restart the App
After Metro restarts, reload the app on your device/simulator:
- iOS Simulator: Cmd+R
- Android Emulator: RR (double tap R)
- Physical device: Shake device and select "Reload"

### 3. Verify Images Display
Open the app and navigate to the welcome/onboarding screen to verify all carousel images display correctly as you swipe through them.

## Additional Notes

### Image Sizes
The current images are quite large (4-7 MB each):
- slide-1-info-moves-fast.png: 4.1 MB
- slide-2-verification.png: 6.2 MB
- slide-3-frictionless.png: 7.1 MB
- slide-4-truth-layer.png: 6.4 MB

**Recommendation:** Consider optimizing these images for mobile:
- Target size: < 500 KB per image
- Use image optimization tools like:
  - ImageOptim (Mac)
  - TinyPNG (online)
  - Sharp (Node.js)
  - Expo's built-in image optimization

Example optimization command:
```bash
# Using sharp-cli
npx sharp-cli -i slide-1-info-moves-fast.png -o slide-1-optimized.png --quality 80 --width 1170
```

### Missing Image
Note that slide 5 (`slide-5-vett-it.png`) is not yet added. You can add it following the same pattern:
1. Add the image file to `apps/mobile/assets/onboarding/`
2. Add the constant: `const SLIDE_IMAGE_5 = require("../../assets/onboarding/slide-5-vett-it.png");`
3. Update the object: `4: SLIDE_IMAGE_5,`

## Testing
To verify the fix:
1. Navigate to the welcome screen in your app
2. Images should now display in the carousel
3. Check Metro bundler console for success/error messages
4. Try swiping through all carousel slides to ensure all images load

## If Issues Persist
If images still don't display after these steps:
1. Check Metro bundler console for error messages
2. Verify all image files exist in `apps/mobile/assets/onboarding/`
3. Try deleting `node_modules` and reinstalling: `pnpm install`
4. Check device/simulator storage (large images might fail on low-memory devices)

