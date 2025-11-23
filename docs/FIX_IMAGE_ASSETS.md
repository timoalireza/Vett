# Fix Image Assets for iOS Build

## Issue
The image assets (`icon.png`, `splash.png`, `adaptive-icon.png`) were corrupted (only 88 bytes), causing CRC errors during prebuild.

## Temporary Fix Applied
Removed icon and splash image references from `app.json` to allow prebuild to succeed. The app will use default Expo icons.

## To Add Proper Images Later

1. **Create proper image assets:**
   - `icon.png`: 1024x1024px PNG
   - `splash.png`: 1284x2778px PNG (or appropriate size)
   - `adaptive-icon.png`: 1024x1024px PNG

2. **Add them back to `app.json`:**
   ```json
   {
     "expo": {
       "icon": "./assets/icon.png",
       "splash": {
         "image": "./assets/splash.png",
         "resizeMode": "contain",
         "backgroundColor": "#05070D"
       },
       "android": {
         "adaptiveIcon": {
           "foregroundImage": "./assets/adaptive-icon.png",
           "backgroundColor": "#05070D"
         }
       }
     }
   }
   ```

3. **Regenerate native projects:**
   ```bash
   cd apps/mobile
   rm -rf ios android
   pnpm exec expo prebuild
   ```

## Current Status
- Prebuild works without image references
- iOS build can proceed
- Default Expo icons will be used until proper images are added


