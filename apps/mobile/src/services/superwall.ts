import Constants from "expo-constants";

// Note: You'll need to install react-native-superwall first
// import Superwall from 'react-native-superwall';

// Get API key from config
const getSuperwallApiKey = (): string => {
  const envKey = process.env.EXPO_PUBLIC_SUPERWALL_API_KEY;
  const configKey = Constants.expoConfig?.extra?.superwallApiKey as string | undefined;

  if (!envKey && !configKey) {
    throw new Error(
      "Superwall API key not found. Add EXPO_PUBLIC_SUPERWALL_API_KEY to .env or superwallApiKey to app.json"
    );
  }

  return envKey || configKey || "";
};

let superwallInitialized = false;

/**
 * Initialize Superwall SDK
 * Call this once when your app starts
 * 
 * IMPORTANT: Uncomment the Superwall import at the top after installing the package
 */
export async function initializeSuperwall(userId?: string): Promise<void> {
  if (superwallInitialized) {
    console.log("[Superwall] Already initialized");
    return;
  }

  try {
    const apiKey = getSuperwallApiKey();
    
    // Uncomment after installing react-native-superwall:
    // await Superwall.configure(apiKey, {
    //   userId: userId || undefined,
    // });
    
    console.log("[Superwall] Configuration ready. Install react-native-superwall to enable.");
    console.log("[Superwall] API Key:", apiKey ? "Found" : "Missing");
    
    superwallInitialized = true;
  } catch (error) {
    console.error("[Superwall] Initialization failed:", error);
    throw error;
  }
}

/**
 * Identify user with Clerk user ID
 * Call this after user signs in
 */
export async function identifyUser(userId: string, email?: string): Promise<void> {
  try {
    // Uncomment after installing react-native-superwall:
    // await Superwall.identify(userId, {
    //   email: email,
    // });
    
    console.log("[Superwall] User identified:", userId);
  } catch (error) {
    console.error("[Superwall] User identification failed:", error);
  }
}

/**
 * Reset user session
 * Call this when user signs out
 */
export async function resetUser(): Promise<void> {
  try {
    // Uncomment after installing react-native-superwall:
    // await Superwall.reset();
    
    console.log("[Superwall] User session reset");
  } catch (error) {
    console.error("[Superwall] Reset failed:", error);
  }
}

/**
 * Register a placement for paywall presentation
 * @param placementId - The placement identifier from Superwall dashboard
 * @param onDismiss - Callback when paywall is dismissed
 * @param onSkip - Callback when paywall is skipped (user has access)
 */
export async function registerPlacement(
  placementId: string,
  onDismiss?: () => void,
  onSkip?: () => void
): Promise<void> {
  try {
    // Uncomment after installing react-native-superwall:
    // await Superwall.register(placementId, {
    //   onDismiss: onDismiss,
    //   onSkip: onSkip,
    // });
    
    console.log(`[Superwall] Placement registered: ${placementId}`);
  } catch (error) {
    console.error(`[Superwall] Failed to register placement ${placementId}:`, error);
  }
}

/**
 * Present a paywall for a specific placement
 * @param placementId - The placement identifier
 */
export async function presentPaywall(placementId: string): Promise<void> {
  try {
    // Uncomment after installing react-native-superwall:
    // await Superwall.present(placementId);
    
    console.log(`[Superwall] Presenting paywall: ${placementId}`);
    console.warn("[Superwall] Install react-native-superwall to enable paywall presentation");
  } catch (error) {
    console.error(`[Superwall] Failed to present paywall ${placementId}:`, error);
  }
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(): Promise<boolean> {
  try {
    // Uncomment after installing react-native-superwall:
    // const subscriptionStatus = await Superwall.getSubscriptionStatus();
    // return subscriptionStatus === 'ACTIVE';
    
    return false;
  } catch (error) {
    console.error("[Superwall] Failed to check subscription status:", error);
    return false;
  }
}

export default {
  initializeSuperwall,
  identifyUser,
  resetUser,
  registerPlacement,
  presentPaywall,
  hasActiveSubscription
};

