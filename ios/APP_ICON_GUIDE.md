# App Icon Setup Guide for Vett iOS App

## Quick Start

### Option 1: Using Xcode (Easiest)

1. **Open the workspace:**
   ```bash
   cd ios
   open vett.xcworkspace
   ```

2. **Navigate to AppIcon:**
   - In Project Navigator (left sidebar), find: `vett` → `Images.xcassets` → `AppIcon`
   - Click on `AppIcon`

3. **Add your icons:**
   - Drag and drop your icon images into the appropriate slots
   - Or click each slot and browse to select your image file
   - Xcode will automatically detect the size

4. **Required Icon Sizes:**

   **iPhone App Icons:**
   - 20pt @2x: 40x40 pixels
   - 20pt @3x: 60x60 pixels
   - 29pt @2x: 58x58 pixels
   - 29pt @3x: 87x87 pixels
   - 40pt @2x: 80x80 pixels
   - 40pt @3x: 120x120 pixels
   - 60pt @2x: 120x120 pixels
   - 60pt @3x: 180x180 pixels

   **App Store:**
   - 1024x1024 pixels (required for submission)

### Option 2: Using Asset Catalog Generator

If you have a single 1024x1024 icon, you can use online tools to generate all sizes:
- https://www.appicon.co/
- https://appicon.build/
- https://makeappicon.com/

Then drag all generated icons into the AppIcon asset catalog in Xcode.

### Option 3: Manual File Replacement

1. **Prepare your icons:**
   - Create all required sizes from your master 1024x1024 icon
   - Name them appropriately (e.g., `icon-40@2x.png`, `icon-60@3x.png`)

2. **Replace files:**
   - Navigate to: `ios/vett/Images.xcassets/AppIcon.appiconset/`
   - Replace the existing `App-Icon-1024x1024@1x.png` with your 1024x1024 icon
   - Add other sizes as needed

3. **Update Contents.json:**
   - The `Contents.json` file maps sizes to filenames
   - Current setup uses universal 1024x1024 icon (works but not optimal)

## Current Setup

Your project currently uses:
- **Universal icon:** 1024x1024 (works for all sizes, but not optimal)
- **Location:** `ios/vett/Images.xcassets/AppIcon.appiconset/`

## Best Practices

1. **Design Guidelines:**
   - No transparency (use solid background)
   - No rounded corners (iOS adds them automatically)
   - No text or UI elements (keep it simple)
   - Use high contrast for visibility

2. **File Format:**
   - PNG format (no alpha channel)
   - RGB color space
   - No color profile needed (iOS handles it)

3. **Testing:**
   - Build and run on device to see how icon looks
   - Test on different iOS versions if possible
   - Check appearance in Settings app and on home screen

## Troubleshooting

**Icon not showing up:**
- Clean build folder: `Product` → `Clean Build Folder` (Shift+Cmd+K)
- Delete derived data
- Rebuild project

**Icon looks blurry:**
- Ensure you're using @2x and @3x versions, not just @1x
- Check that image dimensions match exactly (no scaling)

**Xcode shows warnings:**
- Fill all required slots (especially 1024x1024 for App Store)
- Ensure filenames match what's in Contents.json

## Verification

After adding icons:
1. Build the app: `Product` → `Build` (Cmd+B)
2. Run on simulator or device
3. Check home screen icon appearance
4. Verify icon appears correctly in Settings app

