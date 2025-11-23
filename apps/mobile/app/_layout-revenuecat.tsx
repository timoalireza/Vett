/**
 * RevenueCat Integration Component
 * 
 * This component handles RevenueCat user identification based on Clerk auth state.
 */

import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { identifyUser, resetUser } from "../src/services/revenuecat";

export function RevenueCatAuthSync() {
  const { userId, isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn && userId) {
      // Identify user when signed in
      identifyUser(userId).catch(console.error);
    } else if (!isSignedIn) {
      // Only reset if user was previously signed in
      // Don't reset on initial mount if user is already signed out
      resetUser().catch((error) => {
        // Silently handle anonymous user errors
        if (!error?.message?.includes("anonymous")) {
          console.error("[RevenueCat] Reset error:", error);
        }
      });
    }
  }, [isSignedIn, userId]);

  return null; // This component doesn't render anything
}

