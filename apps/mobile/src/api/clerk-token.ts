import * as SecureStore from "expo-secure-store";

/**
 * Token provider for Clerk authentication
 * Since getToken from @clerk/clerk-expo requires React context,
 * we'll retrieve tokens directly from SecureStore where Clerk stores them
 */

// Clerk stores tokens in SecureStore with various key patterns
// Based on Clerk Expo source, tokens are stored with keys like:
// - __clerk_db_jwt (JWT token)
// - __clerk_db_session_<sessionId> (session data)
const CLERK_SESSION_KEY_PREFIX = "__clerk_db_session_";
const CLERK_JWT_KEY = "__clerk_db_jwt";
const CLERK_CLIENT_KEY = "__clerk_client";

let cachedToken: string | null = null;
let tokenCacheTime = 0;
const TOKEN_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get Clerk JWT token from SecureStore
 */
export async function getClerkToken(): Promise<string | null> {
  try {
    // Check cache first
    if (cachedToken && Date.now() - tokenCacheTime < TOKEN_CACHE_DURATION) {
      return cachedToken;
    }

    // Try multiple possible Clerk token storage keys
    const tokenKeys = [
      CLERK_JWT_KEY,
      `${CLERK_JWT_KEY}_default`,
      `${CLERK_CLIENT_KEY}_jwt`,
      `${CLERK_CLIENT_KEY}_token`
    ];
    
    let token: string | null = null;
    
    for (const key of tokenKeys) {
      try {
        const value = await SecureStore.getItemAsync(key);
        if (value) {
          // Check if it's a JSON object with token field
          try {
            const parsed = JSON.parse(value);
            if (parsed.token || parsed.jwt || parsed.__token) {
              token = parsed.token || parsed.jwt || parsed.__token;
              cachedToken = token;
              tokenCacheTime = Date.now();
              console.log("[ClerkToken] Token retrieved from:", key);
              return token;
            }
          } catch {
            // If not JSON, assume it's the token directly
            token = value;
            cachedToken = token;
            tokenCacheTime = Date.now();
            console.log("[ClerkToken] Token retrieved from:", key);
            return token;
          }
        }
      } catch (e) {
        // Continue to next key
      }
    }

    // Try to find session token
    // Since SecureStore doesn't support listing, we'll try common patterns
    // Clerk typically stores active session with a timestamp or UUID suffix
    const commonSuffixes = ["", "_active", "_current", "_0", "_1"];
    
    for (const suffix of commonSuffixes) {
      try {
        const sessionKey = `${CLERK_SESSION_KEY_PREFIX}${suffix}`;
        const sessionData = await SecureStore.getItemAsync(sessionKey);
        
        if (sessionData) {
          try {
            // Session data might be JSON with a token field
            const parsed = JSON.parse(sessionData);
            if (parsed.token || parsed.jwt) {
              token = parsed.token || parsed.jwt;
              cachedToken = token;
              tokenCacheTime = Date.now();
              console.log("[ClerkToken] Token retrieved from session data");
              return token;
            }
          } catch {
            // If it's not JSON, it might be the token directly
            token = sessionData;
            cachedToken = token;
            tokenCacheTime = Date.now();
            console.log("[ClerkToken] Token retrieved from session key");
            return token;
          }
        }
      } catch (e) {
        // Continue to next suffix
      }
    }

    console.log("[ClerkToken] No token found in SecureStore");
    cachedToken = null;
    return null;
  } catch (error) {
    console.error("[ClerkToken] Error retrieving token:", error);
    cachedToken = null;
    return null;
  }
}

/**
 * Clear cached token (call this on logout)
 */
export function clearClerkTokenCache(): void {
  cachedToken = null;
  tokenCacheTime = 0;
}

