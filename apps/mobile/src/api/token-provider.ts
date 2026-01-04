/**
 * Token provider that allows React components to set tokens
 * for use in non-React API functions
 */

export type TokenAuthState = "unknown" | "signedOut" | "signedIn";

let currentToken: string | null = null;
let tokenListeners: Array<(token: string | null) => void> = [];
let authState: TokenAuthState = "unknown";
let authStateListeners: Array<(state: TokenAuthState) => void> = [];
let tokenFetcher: (() => Promise<string | null>) | null = null;

export const tokenProvider = {
  setAuthState(state: TokenAuthState) {
    authState = state;
    authStateListeners.forEach((l) => l(state));
  },

  getAuthState(): TokenAuthState {
    return authState;
  },

  setToken(token: string | null) {
    currentToken = token;
    tokenListeners.forEach(listener => listener(token));
  },
  
  getToken(): string | null {
    return currentToken;
  },

  /**
   * Allow React layer to register a token fetcher (e.g. Clerk `getToken`) so non-React API
   * calls can refresh tokens on-demand (fixes expired token issues).
   */
  setTokenFetcher(fetcher: (() => Promise<string | null>) | null) {
    tokenFetcher = fetcher;
  },

  /**
   * Attempt to fetch a fresh token (if a fetcher is registered) and update provider state.
   */
  async refreshToken(): Promise<string | null> {
    if (!tokenFetcher) return currentToken;
    try {
      const next = await tokenFetcher();
      tokenProvider.setToken(next ?? null);
      return next ?? null;
    } catch {
      // Don't change currentToken on refresh failure
      return currentToken;
    }
  },

  /**
   * Wait for a token to be set (useful to avoid app-start races where Clerk isSignedIn=true
   * but getToken() hasn't resolved yet).
   *
   * Resolves with:
   * - token string when available
   * - null if user is signed out or timeout reached
   */
  waitForToken({ timeoutMs = 1500 }: { timeoutMs?: number } = {}): Promise<string | null> {
    // Fast paths
    if (currentToken) return Promise.resolve(currentToken);
    if (authState === "signedOut") return Promise.resolve(null);

    return new Promise((resolve) => {
      let settled = false;

      const maybeSettle = (token: string | null) => {
        if (settled) return;
        if (token) {
          settled = true;
          cleanup();
          resolve(token);
        }
      };

      const onAuthState = (state: TokenAuthState) => {
        if (settled) return;
        if (state === "signedOut") {
          settled = true;
          cleanup();
          resolve(null);
        }
      };

      const offToken = tokenProvider.subscribe(maybeSettle);
      const offAuth = tokenProvider.subscribeAuthState(onAuthState);

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(currentToken);
      }, timeoutMs);

      function cleanup() {
        clearTimeout(timer);
        offToken();
        offAuth();
      }
    });
  },
  
  subscribe(listener: (token: string | null) => void) {
    tokenListeners.push(listener);
    return () => {
      tokenListeners = tokenListeners.filter(l => l !== listener);
    };
  },

  subscribeAuthState(listener: (state: TokenAuthState) => void) {
    authStateListeners.push(listener);
    return () => {
      authStateListeners = authStateListeners.filter((l) => l !== listener);
    };
  }
};





