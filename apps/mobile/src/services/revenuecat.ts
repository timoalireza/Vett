import Purchases, { CustomerInfo, PurchasesOffering, PurchasesPackage } from "react-native-purchases";
import Constants from "expo-constants";
import { Platform } from "react-native";

// Get API key from config
const getRevenueCatApiKey = (): string => {
  const envKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  const configKey = Constants.expoConfig?.extra?.revenueCatApiKey as string | undefined;

  if (!envKey && !configKey) {
    throw new Error(
      "RevenueCat API key not found. Add EXPO_PUBLIC_REVENUECAT_API_KEY to .env or revenueCatApiKey to app.json"
    );
  }

  return envKey || configKey || "";
};

let revenueCatInitialized = false;

/**
 * Initialize RevenueCat SDK
 * Call this once when your app starts
 */
export async function initializeRevenueCat(userId?: string): Promise<void> {
  if (revenueCatInitialized) {
    console.log("[RevenueCat] Already initialized");
    return;
  }

  try {
    const apiKey = getRevenueCatApiKey();
    
    // Configure RevenueCat with API key
    // Note: RevenueCat provides separate keys for iOS and Android
    // You can use the same key for both if configured, or get platform-specific keys
    await Purchases.configure({ apiKey });

    // Set user ID if provided
    if (userId) {
      await Purchases.logIn(userId);
    }

    revenueCatInitialized = true;
    console.log("[RevenueCat] Initialized successfully");
  } catch (error) {
    console.error("[RevenueCat] Initialization failed:", error);
    throw error;
  }
}

/**
 * Identify user with Clerk user ID
 * Call this after user signs in
 */
export async function identifyUser(userId: string, email?: string): Promise<void> {
  try {
    await Purchases.logIn(userId);
    
    // Set user attributes if email provided
    if (email) {
      await Purchases.setEmail(email);
    }
    
    console.log("[RevenueCat] User identified:", userId);
  } catch (error) {
    console.error("[RevenueCat] User identification failed:", error);
  }
}

/**
 * Reset user session
 * Call this when user signs out
 */
export async function resetUser(): Promise<void> {
  try {
    // Check if user is anonymous before logging out
    // RevenueCat throws an error if you try to log out an anonymous user
    const customerInfo = await Purchases.getCustomerInfo();
    // Only log out if user is not anonymous (has an app user ID)
    if (customerInfo.originalAppUserId && !customerInfo.originalAppUserId.startsWith("$RCAnonymousID:")) {
      await Purchases.logOut();
      console.log("[RevenueCat] User session reset");
    } else {
      console.log("[RevenueCat] User is anonymous, skipping logout");
    }
  } catch (error: any) {
    // Silently handle the case where user is already anonymous
    if (error?.message?.includes("anonymous")) {
      console.log("[RevenueCat] User is anonymous, no logout needed");
    } else {
      console.error("[RevenueCat] Reset failed:", error);
    }
  }
}

/**
 * Get available offerings (paywall packages)
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error("[RevenueCat] Failed to get offerings:", error);
    return null;
  }
}

/**
 * Purchase a package
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (error: any) {
    // Handle purchase errors
    if (error.userCancelled) {
      throw new Error("Purchase cancelled by user");
    }
    throw error;
  }
}

/**
 * Restore purchases
 */
export async function restorePurchases(): Promise<CustomerInfo> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  } catch (error) {
    console.error("[RevenueCat] Failed to restore purchases:", error);
    throw error;
  }
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    // entitlements.active is an object (dictionary), not an array
    return Object.keys(customerInfo.entitlements.active).length > 0;
  } catch (error) {
    console.error("[RevenueCat] Failed to check subscription status:", error);
    return false;
  }
}

/**
 * Get customer info
 */
export async function getCustomerInfo(): Promise<CustomerInfo> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error("[RevenueCat] Failed to get customer info:", error);
    throw error;
  }
}

/**
 * Check if user has specific entitlement
 */
export async function hasEntitlement(entitlementId: string): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[entitlementId] !== undefined;
  } catch (error) {
    console.error("[RevenueCat] Failed to check entitlement:", error);
    return false;
  }
}

export default {
  initializeRevenueCat,
  identifyUser,
  resetUser,
  getOfferings,
  purchasePackage,
  restorePurchases,
  hasActiveSubscription,
  getCustomerInfo,
  hasEntitlement
};

