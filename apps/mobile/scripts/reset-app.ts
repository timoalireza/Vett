#!/usr/bin/env node

/**
 * Reset App Script
 * 
 * This script clears all stored data for a fresh start.
 * Run this before testing onboarding flow.
 * 
 * Usage:
 *   npx tsx scripts/reset-app.ts
 *   or
 *   node scripts/reset-app.ts (if compiled)
 */

import { clearAllStorage } from "../src/utils/clear-storage";

async function main() {
  console.log("🔄 Resetting Vett app storage...");
  
  try {
    // Note: This won't work in Node.js environment
    // This is meant to be called from within the React Native app
    // For simulator reset, use the Expo/React Native dev tools or:
    // - iOS Simulator: Device > Erase All Content and Settings
    // - Android Emulator: Settings > Apps > Vett > Clear Data
    // - Or use: npx expo start --clear
    
    console.log("📱 To reset the app:");
    console.log("   1. Stop the app");
    console.log("   2. Run: npx expo start --clear");
    console.log("   3. Or manually clear in simulator/emulator settings");
    console.log("");
    console.log("💡 Or call clearAllStorage() from within the app");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

