/**
 * Superwall Integration Component
 * 
 * This component handles Superwall user identification based on Clerk auth state.
 * Add this to your NavigationGate or create a separate component.
 * 
 * Usage: Add <SuperwallAuthSync /> inside ClerkProvider
 */

import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { identifyUser, resetUser } from "../src/services/superwall";

export function SuperwallAuthSync() {
  const { userId, isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn && userId) {
      // Identify user when signed in
      identifyUser(userId).catch(console.error);
    } else {
      // Reset when signed out
      resetUser().catch(console.error);
    }
  }, [isSignedIn, userId]);

  return null; // This component doesn't render anything
}

