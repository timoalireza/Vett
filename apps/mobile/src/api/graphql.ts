import { GRAPHQL_ENDPOINT } from "./config";
import { getClerkToken } from "./clerk-token";
import { tokenProvider } from "./token-provider";

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

/**
 * Get authentication token from Clerk
 * Tries token provider first (set by React components), then falls back to SecureStore
 */
async function getAuthToken(): Promise<string | null> {
  // First try token from provider (set by React components)
  const providerToken = tokenProvider.getToken();
  if (providerToken) {
    console.log("[GraphQL] Using token from provider");
    return providerToken;
  }
  
  // Fallback to SecureStore lookup
  return getClerkToken();
}

export async function graphqlRequest<TData, TVariables = Record<string, unknown>>(
  query: string,
  variables?: TVariables
): Promise<TData> {
  // Get auth token if available
  const token = await getAuthToken();
  console.log("[GraphQL] Request:", { hasToken: !!token, queryName: query.split("query")[1]?.split("(")[0]?.trim(), variables });
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  
  // Add Authorization header if token is available
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables })
  });
  } catch (networkError: any) {
    console.error("[GraphQL] Network error:", {
      message: networkError?.message,
      name: networkError?.name,
      cause: networkError?.cause,
      endpoint: GRAPHQL_ENDPOINT
    });
    throw new Error(`Network error: ${networkError?.message || "Failed to connect to API"}. Check if API server is running at ${GRAPHQL_ENDPOINT}`);
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

  let json: GraphQLResponse<TData>;
  try {
    json = (await response.json()) as GraphQLResponse<TData>;
  } catch (parseError: any) {
    console.error("[GraphQL] Failed to parse response:", parseError);
    const text = await response.text();
    throw new Error(`Invalid JSON response: ${text.substring(0, 200)}`);
  }
  
  // Log full response for debugging
  console.log("[GraphQL] Response:", JSON.stringify(json, null, 2));
  
  if (json.errors?.length) {
    console.error("[GraphQL] Errors:", JSON.stringify(json.errors, null, 2));
    const errorMessages = json.errors.map((error: any) => {
      // Log full error details
      console.error("[GraphQL] Error details:", {
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





