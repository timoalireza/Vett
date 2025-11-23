/**
 * Token provider that allows React components to set tokens
 * for use in non-React API functions
 */

let currentToken: string | null = null;
let tokenListeners: Array<(token: string | null) => void> = [];

export const tokenProvider = {
  setToken(token: string | null) {
    currentToken = token;
    tokenListeners.forEach(listener => listener(token));
  },
  
  getToken(): string | null {
    return currentToken;
  },
  
  subscribe(listener: (token: string | null) => void) {
    tokenListeners.push(listener);
    return () => {
      tokenListeners = tokenListeners.filter(l => l !== listener);
    };
  }
};





