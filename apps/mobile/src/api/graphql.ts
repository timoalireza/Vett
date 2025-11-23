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

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[GraphQL] Request failed:", response.status, text);
    throw new Error(`GraphQL request failed (${response.status}): ${text}`);
  }

  const json = (await response.json()) as GraphQLResponse<TData>;
  
  // Log full response for debugging
  console.log("[GraphQL] Response:", JSON.stringify(json, null, 2));
  
  if (json.errors?.length) {
    console.error("[GraphQL] Errors:", json.errors);
    const errorMessages = json.errors.map((error) => error.message).join(", ");
    throw new Error(errorMessages);
  }
  if (!json.data) {
    console.error("[GraphQL] No data in response");
    throw new Error("GraphQL response missing data");
  }

  console.log("[GraphQL] Success:", Object.keys(json.data));
  return json.data;
}





