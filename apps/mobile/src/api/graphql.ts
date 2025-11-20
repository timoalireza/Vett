import { GRAPHQL_ENDPOINT } from "./config";

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

/**
 * Get authentication token from Clerk
 * This will be implemented when Clerk React Native SDK is added
 */
async function getAuthToken(): Promise<string | null> {
  // TODO: Implement Clerk token retrieval
  // Example with Clerk React Native:
  // import { useAuth } from "@clerk/clerk-react-native";
  // const { getToken } = useAuth();
  // return await getToken();
  
  // For now, return null (unauthenticated requests)
  return null;
}

export async function graphqlRequest<TData, TVariables = Record<string, unknown>>(
  query: string,
  variables?: TVariables
): Promise<TData> {
  // Get auth token if available
  const token = await getAuthToken();
  
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
    throw new Error(`GraphQL request failed (${response.status}): ${text}`);
  }

  const json = (await response.json()) as GraphQLResponse<TData>;
  if (json.errors?.length) {
    throw new Error(json.errors.map((error) => error.message).join(", "));
  }
  if (!json.data) {
    throw new Error("GraphQL response missing data");
  }

  return json.data;
}





