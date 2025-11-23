import { useCallback } from "react";
import { presentPaywall, registerPlacement, hasActiveSubscription } from "../services/superwall";

export function usePaywall() {
  /**
   * Trigger paywall when user tries to access premium feature
   */
  const triggerPaywall = useCallback(async (placementId: string) => {
    try {
      await presentPaywall(placementId);
    } catch (error) {
      console.error("Paywall trigger failed:", error);
    }
  }, []);

  /**
   * Register a placement with fallback action
   * Use this for feature gating
   */
  const registerFeatureGate = useCallback(
    async (placementId: string, onGranted: () => void) => {
      await registerPlacement(placementId, undefined, onGranted);
    },
    []
  );

  /**
   * Check if user has active subscription
   */
  const checkSubscription = useCallback(async (): Promise<boolean> => {
    return await hasActiveSubscription();
  }, []);

  /**
   * Gate a premium feature behind paywall
   * Returns true if user has access, false if paywall was shown
   */
  const gateFeature = useCallback(
    async (placementId: string, onAccessGranted: () => void): Promise<boolean> => {
      const hasAccess = await hasActiveSubscription();
      
      if (hasAccess) {
        onAccessGranted();
        return true;
      }
      
      await triggerPaywall(placementId);
      return false;
    },
    [triggerPaywall]
  );

  return {
    triggerPaywall,
    registerFeatureGate,
    checkSubscription,
    gateFeature
  };
}

