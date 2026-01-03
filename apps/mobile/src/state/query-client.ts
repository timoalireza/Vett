import { QueryClient } from "@tanstack/react-query";

// Helper function to check if an error is authentication-related
function isAuthError(error: unknown): boolean {
  const message = (error as any)?.message;
  return typeof message === "string" && message.toLowerCase().includes("authentication required");
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Smart retry logic: don't retry authentication errors
      retry: (failureCount, error) => {
        // Don't retry authentication errors - they won't resolve with a simple retry
        if (isAuthError(error)) {
          return false;
        }
        // Retry other errors once
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000 // 5 minutes
    },
    mutations: {
      // Don't retry authentication errors in mutations either
      retry: (failureCount, error) => {
        if (isAuthError(error)) {
          return false;
        }
        return failureCount < 1;
      }
    }
  }
});

