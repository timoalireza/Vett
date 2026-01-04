import { GRAPHQL_ENDPOINT } from "./config";
import { getClerkToken } from "./clerk-token";
import { tokenProvider } from "./token-provider";

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

function isJwtLike(token: string): boolean {
  // Basic heuristic: 3 dot-separated base64url-ish segments
  const parts = token.split(".");
  return parts.length === 3 && parts[0].length > 0 && parts[1].length > 0 && parts[2].length > 0;
}

function isAuthError(errors: Array<{ message?: string; extensions?: any }> | undefined): boolean {
  if (!errors?.length) return false;
  return errors.some((e: any) => {
    const msg = typeof e?.message === "string" ? e.message.toLowerCase() : "";
    const code = typeof e?.extensions?.code === "string" ? e.extensions.code : "";
    return (
      msg.includes("authentication required") ||
      msg.includes("unauthorized") ||
      code === "UNAUTHENTICATED"
    );
  });
}

/**
 * Get authentication token from Clerk
 * Tries token provider first (set by React components), then falls back to SecureStore
 */
async function getAuthToken(): Promise<string | null> {
  // First try token from provider (set by React components)
  const providerToken = tokenProvider.getToken();
  if (providerToken) {
    console.log("[GraphQL] Using token from provider", { jwtLike: isJwtLike(providerToken) });
    return providerToken;
  }

  // Wait briefly for Clerk->tokenProvider sync to complete.
  // This prevents firing authenticated-only queries without a token due to effect timing on app start.
  const state = tokenProvider.getAuthState();
  const waited = await tokenProvider.waitForToken({ timeoutMs: state === "unknown" ? 750 : 2000 });
  if (waited) {
    console.log("[GraphQL] Using token from provider (wait)", { jwtLike: isJwtLike(waited) });
    return waited;
  }

  // Fallback to SecureStore lookup
  const secureStoreToken = await getClerkToken();
  if (secureStoreToken) {
    return secureStoreToken;
  }

  // Last resort: small bounded retry to avoid a "signed in but token not synced yet" race on app start.
  // This prevents authenticated-only queries from firing without a token due to effect timing.
  for (let attempt = 0; attempt < 6; attempt++) {
    await new Promise((r) => setTimeout(r, 150));
    const retryProviderToken = tokenProvider.getToken();
    if (retryProviderToken) {
      console.log("[GraphQL] Using token from provider (retry)");
      return retryProviderToken;
    }
    const retrySecureStoreToken = await getClerkToken();
    if (retrySecureStoreToken) {
      return retrySecureStoreToken;
    }
  }

  return null;
}

export async function graphqlRequest<TData, TVariables = Record<string, unknown>>(
  query: string,
  variables?: TVariables
): Promise<TData> {
  // Get auth token if available
  let token = await getAuthToken();
  const queryName = query.split("query")[1]?.split("(")[0]?.trim() || query.split("mutation")[1]?.split("(")[0]?.trim();
  console.log("[GraphQL] Request:", { 
    hasToken: !!token, 
    tokenLength: token?.length,
    tokenPrefix: token?.substring(0, 20),
    isJwtLike: token ? isJwtLike(token) : false,
    queryName, 
    variables 
  });
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  
  async function doFetch(activeToken: string | null): Promise<GraphQLResponse<TData>> {
    const reqHeaders: Record<string, string> = { ...headers };
    if (activeToken) {
      reqHeaders.Authorization = `Bearer ${activeToken}`;
    } else {
      console.warn("[GraphQL] No authentication token available - request may fail if auth is required");
    }

    let response: Response;
    try {
      response = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify({ query, variables })
      });
    } catch (networkError: any) {
      console.error("[GraphQL] Network error:", {
        message: networkError?.message,
        name: networkError?.name,
        cause: networkError?.cause,
        endpoint: GRAPHQL_ENDPOINT
      });
      throw new Error(
        `Network error: ${networkError?.message || "Failed to connect to API"}. Check if API server is running at ${GRAPHQL_ENDPOINT}`
      );
    }

    if (!response.ok) {
      const text = await response.text();
      console.error("[GraphQL] Request failed:", {
        status: response.status,
        statusText: response.statusText,
        url: GRAPHQL_ENDPOINT,
        body: text
      });
      throw new Error(`GraphQL request failed (${response.status}): ${text.substring(0, 200)}`);
    }

    try {
      return (await response.json()) as GraphQLResponse<TData>;
    } catch (parseError: any) {
      console.error("[GraphQL] Failed to parse response:", parseError);
      const text = await response.text();
      throw new Error(`Invalid JSON response: ${text.substring(0, 200)}`);
    }
  }

  let json = await doFetch(token);
  
  // Log full response for debugging
  console.log("[GraphQL] Response:", JSON.stringify(json, null, 2));
  
  if (json.errors?.length) {
    const authErr = isAuthError(json.errors as any);
    const log = authErr ? console.warn : console.error;
    log("[GraphQL] Errors:", JSON.stringify(json.errors, null, 2));
    
    // If it's an auth error, log additional debugging info
    if (authErr) {
      console.warn("[GraphQL] Authentication error detected. Token status:", {
        hadToken: !!token,
        tokenLength: token?.length,
        authState: tokenProvider.getAuthState(),
        queryName
      });

      // If we think we're signed in, try refreshing token once and retry the request.
      if (tokenProvider.getAuthState() === "signedIn") {
        const refreshed = await tokenProvider.refreshToken();
        if (refreshed && refreshed !== token) {
          console.warn("[GraphQL] Retrying request after token refresh:", {
            queryName,
            refreshedTokenLength: refreshed.length,
            refreshedIsJwtLike: isJwtLike(refreshed)
          });
          token = refreshed;
          json = await doFetch(token);
          console.log("[GraphQL] Response (retry):", JSON.stringify(json, null, 2));
          if (!json.errors?.length && json.data) {
            console.log("[GraphQL] Success (retry):", Object.keys(json.data));
            return json.data;
          }
          // Retry failed with errors - re-evaluate error type for correct log level
          // (don't reuse original `log` variable which was based on the first request)
        }
      }
    }
    
    // Re-evaluate error type after potential retry to use correct log level
    const finalAuthErr = isAuthError(json.errors as any);
    const finalLog = finalAuthErr ? console.warn : console.error;
    
    // Safety check: after retry, json.errors could be null/undefined
    // (we're inside the original if block from line 146, but json was replaced at line 170)
    if (!json.errors || json.errors.length === 0) {
      throw new Error("GraphQL request failed with no error details");
    }
    
    const errorMessages = json.errors.map((error: any) => {
      // Log full error details (use finalLog to get correct severity)
      finalLog("[GraphQL] Error details:", {
        message: error.message,
        extensions: error.extensions,
        path: error.path,
        locations: error.locations
      });
      
      // Provide more context for validation errors
      if (error.message.includes("validation") || error.message.includes("Cannot query field")) {
        return `${error.message}${error.extensions?.code ? ` (${error.extensions.code})` : ""}`;
      }
      
      // Include extension details if available
      if (error.extensions?.code) {
        return `${error.message} (${error.extensions.code}${error.extensions.originalCode ? `, original: ${error.extensions.originalCode}` : ""})`;
      }
      
      return error.message;
    }).join(", ");
    throw new Error(errorMessages);
  }
  if (!json.data) {
    console.error("[GraphQL] No data in response");
    throw new Error("GraphQL response missing data");
  }

  console.log("[GraphQL] Success:", Object.keys(json.data));
  return json.data;
}





