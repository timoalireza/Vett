import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Clear all Vett app storage data for fresh start
 * Useful for testing onboarding flow
 */
export async function clearAllStorage(): Promise<void> {
  try {
    // Get all keys
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Filter to only Vett-related keys
    const vettKeys = allKeys.filter((key) => key.startsWith("vett."));
    
    // Remove all Vett keys
    if (vettKeys.length > 0) {
      await AsyncStorage.multiRemove(vettKeys);
      console.log(`[ClearStorage] Cleared ${vettKeys.length} keys:`, vettKeys);
    } else {
      console.log("[ClearStorage] No Vett keys found to clear");
    }
    
    // Also clear Clerk tokens if they exist
    const clerkKeys = allKeys.filter((key) => 
      key.includes("clerk") || key.includes("Clerk")
    );
    
    if (clerkKeys.length > 0) {
      await AsyncStorage.multiRemove(clerkKeys);
      console.log(`[ClearStorage] Cleared ${clerkKeys.length} Clerk keys`);
    }
    
    console.log("[ClearStorage] All storage cleared successfully");
  } catch (error) {
    console.error("[ClearStorage] Error clearing storage:", error);
    throw error;
  }
}

/**
 * Clear only onboarding-related storage
 */
export async function clearOnboardingStorage(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      "vett.hasOnboarded",
      "vett.onboarding.currentStep",
      "vett.onboarding.completedSteps",
      "vett.onboarding.skippedSteps",
      "vett.onboarding.preferences",
    ]);
    console.log("[ClearStorage] Onboarding storage cleared");
  } catch (error) {
    console.error("[ClearStorage] Error clearing onboarding storage:", error);
    throw error;
  }
}

