import Constants from "expo-constants";

const normalizeBaseUrl = (value?: string | null) => {
  if (!value) return null;
  return value.endsWith("/") ? value.slice(0, -1) : value;
};

const envBaseUrl =
  typeof process.env.EXPO_PUBLIC_API_URL === "string" ? process.env.EXPO_PUBLIC_API_URL : undefined;

const configBaseUrl =
  Constants.expoConfig?.extra && typeof Constants.expoConfig.extra === "object"
    ? (Constants.expoConfig.extra.apiUrl as string | undefined)
    : undefined;

export const API_BASE_URL =
  normalizeBaseUrl(envBaseUrl) ?? normalizeBaseUrl(configBaseUrl) ?? "http://localhost:4000";

export const GRAPHQL_ENDPOINT = `${API_BASE_URL}/graphql`;






