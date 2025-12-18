# iOS Simulator Launch Timeout Fix

## Problem
When running `pnpm ios`, the build succeeds but the app fails to launch with a timeout error:
```
Error: xcrun simctl openurl ... exited with non-zero code: 60
Operation timed out
```

## Solution

The build actually **succeeds** - the app is installed in the simulator. The timeout only affects the automatic deep link launch.

### Quick Fix (After Build Fails)

1. **The app is already installed** - you can launch it manually:
   ```bash
   pnpm ios:launch
   ```

2. **Start the dev server** in a separate terminal:
   ```bash
   pnpm dev
   ```

3. The app should connect automatically to the dev server.

### Alternative: Two-Step Process

1. **Build and install** (ignore the timeout error):
   ```bash
   pnpm ios
   ```

2. **Manually launch the app**:
   ```bash
   pnpm ios:launch
   ```

3. **Start dev server** (if not already running):
   ```bash
   pnpm dev
   ```

### Boot Simulator First (Prevent Timeout)

If you want to avoid the timeout entirely:

1. **Boot the simulator first**:
   ```bash
   pnpm ios:boot
   ```

2. **Wait a few seconds** for the simulator to fully boot

3. **Then run the build**:
   ```bash
   pnpm ios
   ```

## Why This Happens

The iOS simulator sometimes takes time to fully initialize. When Expo tries to open the deep link immediately after installation, the simulator may not be ready, causing a timeout. The app is still successfully installed - it just needs to be launched manually or after the simulator is fully booted.

## Notes

- The build process itself is working correctly
- The app is successfully installed in the simulator
- Only the automatic deep link launch times out
- Manual launch works perfectly

