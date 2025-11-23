import { useCallback, useEffect, useState } from "react";
import { PurchasesOffering, PurchasesPackage } from "react-native-purchases";
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  hasActiveSubscription,
  getCustomerInfo
} from "../services/revenuecat";

export function useRevenueCat() {
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);

  // Load offerings on mount
  useEffect(() => {
    loadOfferings();
    checkSubscriptionStatus();
  }, []);

  const loadOfferings = useCallback(async () => {
    try {
      setLoading(true);
      const currentOfferings = await getOfferings();
      setOfferings(currentOfferings);
    } catch (error) {
      console.error("Failed to load offerings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkSubscriptionStatus = useCallback(async () => {
    try {
      const hasActive = await hasActiveSubscription();
      setHasSubscription(hasActive);
    } catch (error) {
      console.error("Failed to check subscription status:", error);
    }
  }, []);

  /**
   * Purchase a package
   */
  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    try {
      const customerInfo = await purchasePackage(pkg);
      await checkSubscriptionStatus(); // Refresh subscription status
      return customerInfo;
    } catch (error) {
      console.error("Purchase failed:", error);
      throw error;
    }
  }, [checkSubscriptionStatus]);

  /**
   * Restore purchases
   */
  const restore = useCallback(async () => {
    try {
      const customerInfo = await restorePurchases();
      await checkSubscriptionStatus(); // Refresh subscription status
      return customerInfo;
    } catch (error) {
      console.error("Restore failed:", error);
      throw error;
    }
  }, [checkSubscriptionStatus]);

  /**
   * Get package by identifier
   */
  const getPackage = useCallback(
    (identifier: string): PurchasesPackage | null => {
      if (!offerings) return null;
      
      // Check monthly packages
      const monthlyPackage = offerings.availablePackages.find(
        (pkg) => pkg.identifier === identifier || pkg.packageType === identifier
      );
      
      if (monthlyPackage) return monthlyPackage;
      
      // Fallback: find by package type
      return offerings.availablePackages.find(
        (pkg) => pkg.packageType === identifier
      ) || null;
    },
    [offerings]
  );

  /**
   * Get monthly package
   */
  const getMonthlyPackage = useCallback((): PurchasesPackage | null => {
    return getPackage("$rc_monthly") || offerings?.monthly || null;
  }, [offerings, getPackage]);

  /**
   * Get annual package
   */
  const getAnnualPackage = useCallback((): PurchasesPackage | null => {
    return getPackage("$rc_annual") || offerings?.annual || null;
  }, [offerings, getPackage]);

  return {
    offerings,
    loading,
    hasSubscription,
    purchase,
    restore,
    getPackage,
    getMonthlyPackage,
    getAnnualPackage,
    refresh: loadOfferings,
    checkSubscriptionStatus
  };
}

