import Purchases, { CustomerInfo, PurchasesOffering, PurchasesPackage } from "react-native-purchases";
import Constants from "expo-constants";
import { Platform } from "react-native";

// Check if we're in sandbox/test mode
const isSandboxMode = (): boolean => {
  const sandboxFlag = process.env.EXPO_PUBLIC_REVENUECAT_SANDBOX_MODE;
  const configSandbox = Constants.expoConfig?.extra?.revenueCatSandboxMode;
  
  // Check if explicitly set to true or "true" (string)
  return sandboxFlag === 'true' || configSandbox === true;
};

// Get API key from config (platform-specific or shared, production or sandbox)
const getRevenueCatApiKey = (): string => {
  const useSandbox = isSandboxMode();
  
  // Sandbox/Test keys (for testing with sandbox/test data)
  const iosSandboxKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_SANDBOX_API_KEY;
  const androidSandboxKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_SANDBOX_API_KEY;
  
  // Production keys (for live app)
  const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
  const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
  
  // Fall back to shared key
  const sharedKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  
  // Also check app.json config
  const configKey = Constants.expoConfig?.extra?.revenueCatApiKey as string | undefined;
  const configIosKey = Constants.expoConfig?.extra?.revenueCatIosApiKey as string | undefined;
  const configAndroidKey = Constants.expoConfig?.extra?.revenueCatAndroidApiKey as string | undefined;
  const configIosSandboxKey = Constants.expoConfig?.extra?.revenueCatIosSandboxApiKey as string | undefined;
  const configAndroidSandboxKey = Constants.expoConfig?.extra?.revenueCatAndroidSandboxApiKey as string | undefined;

  // Select key based on platform and mode
  let apiKey: string | undefined;
  
  if (Platform.OS === 'ios') {
    if (useSandbox) {
      // Use sandbox/test key for sandbox mode
      apiKey = iosSandboxKey || configIosSandboxKey || sharedKey || configKey;
      if (iosSandboxKey || configIosSandboxKey) {
        console.log('[RevenueCat] Using iOS SANDBOX/TEST key');
      }
    } else {
      // Use production key for production mode
      apiKey = iosKey || configIosKey || sharedKey || configKey;
    }
  } else if (Platform.OS === 'android') {
    if (useSandbox) {
      // Use sandbox/test key for sandbox mode
      apiKey = androidSandboxKey || configAndroidSandboxKey || sharedKey || configKey;
      if (androidSandboxKey || configAndroidSandboxKey) {
        console.log('[RevenueCat] Using Android SANDBOX/TEST key');
      }
    } else {
      // Use production key for production mode
      apiKey = androidKey || configAndroidKey || sharedKey || configKey;
    }
  } else {
    apiKey = sharedKey || configKey;
  }

  if (!apiKey) {
    // Generate platform-specific error message
    let errorMsg = `RevenueCat API key not found for platform: ${Platform.OS} (sandbox mode: ${useSandbox}). `;
    
    if (Platform.OS === 'ios') {
      if (useSandbox) {
        errorMsg += `Add EXPO_PUBLIC_REVENUECAT_IOS_SANDBOX_API_KEY to .env for iOS sandbox testing.`;
      } else {
        errorMsg += `Add EXPO_PUBLIC_REVENUECAT_IOS_API_KEY to .env for iOS production.`;
      }
    } else if (Platform.OS === 'android') {
      if (useSandbox) {
        errorMsg += `Add EXPO_PUBLIC_REVENUECAT_ANDROID_SANDBOX_API_KEY to .env for Android sandbox testing.`;
      } else {
        errorMsg += `Add EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY to .env for Android production.`;
      }
    } else {
      errorMsg += `Add EXPO_PUBLIC_REVENUECAT_API_KEY to .env or configure platform-specific keys.`;
    }
    
    throw new Error(errorMsg);
  }

  return apiKey;
};

let revenueCatInitialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize RevenueCat SDK
 * Call this once when your app starts
 * 
 * This function is safe to call multiple times concurrently - it will only initialize once
 * and return the same promise for all concurrent calls.
 */
export async function initializeRevenueCat(userId?: string): Promise<void> {
  // If already initialized, return immediately
  if (revenueCatInitialized) {
    console.log("[RevenueCat] Already initialized");
    return;
  }

  // If initialization is in progress, return the existing promise
  if (initializationPromise) {
    console.log("[RevenueCat] Initialization in progress, waiting...");
    return initializationPromise;
  }

  // Start initialization and store the promise
  initializationPromise = (async () => {
    try {
      const apiKey = getRevenueCatApiKey();
      const sandbox = isSandboxMode();
      
      // Configure RevenueCat with API key
      await Purchases.configure({ apiKey });

      // Set user ID if provided
      if (userId) {
        await Purchases.logIn(userId);
      }

      revenueCatInitialized = true;
      console.log(`[RevenueCat] Initialized successfully for ${Platform.OS} (${sandbox ? 'SANDBOX' : 'PRODUCTION'} mode)`);
    } catch (error) {
      // Reset promise on error so retry is possible
      initializationPromise = null;
      console.error("[RevenueCat] Initialization failed:", error);
      throw error;
    }
  })();

  return initializationPromise;
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

