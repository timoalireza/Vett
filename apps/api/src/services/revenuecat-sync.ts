import { syncSubscriptionFromRevenueCat } from "./revenuecat-service.js";
import { userService } from "./user-service.js";

/**
 * Sync user's subscription from RevenueCat
 * Call this when user logs in or when subscription status needs to be refreshed
 */
export async function syncUserSubscriptionFromRevenueCat(clerkUserId: string): Promise<void> {
  try {
    // Ensure user exists in database first
    await userService.getOrCreateUser(clerkUserId);
    
    // Sync subscription from RevenueCat
    await syncSubscriptionFromRevenueCat(clerkUserId);
  } catch (error: any) {
    // Log error but don't throw - subscription sync failures shouldn't break the app
    console.error("[RevenueCat] Failed to sync subscription:", {
      clerkUserId,
      error: error.message
    });
  }
}

