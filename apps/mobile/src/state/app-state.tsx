import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@clerk/clerk-expo";

import { darkTheme, Theme } from "../theme/index";

type AuthMode = "signedOut" | "guest" | "signedIn";

interface AppStateValue {
  isReady: boolean;
  hasOnboarded: boolean;
  authMode: AuthMode;
  theme: Theme;
  subscriptionPromptShown: boolean;
  markOnboarded: () => Promise<void>;
  setAuthMode: (mode: AuthMode) => Promise<void>;
  markSubscriptionPromptShown: () => Promise<void>;
  resetState: () => Promise<void>;
}

const STORAGE_KEYS = {
  onboarded: "vett.hasOnboarded",
  authMode: "vett.authMode",
  subscriptionPromptShown: "vett.subscriptionPromptShown"
};

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

function AppStateProviderInner({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded: clerkLoaded } = useAuth();
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [authMode, setAuthModeValue] = useState<AuthMode>("signedOut");
  const [isReady, setIsReady] = useState(false);
  const [subscriptionPromptShown, setSubscriptionPromptShown] = useState(false);

  useEffect(() => {
    console.log("[AppState] Clerk loaded:", clerkLoaded, "isSignedIn:", isSignedIn);
  }, [clerkLoaded, isSignedIn]);

  // Sync Clerk auth state with app state
  useEffect(() => {
    if (!clerkLoaded) return;

    if (isSignedIn) {
      setAuthModeValue("signedIn");
      AsyncStorage.setItem(STORAGE_KEYS.authMode, "signedIn").catch(() => {});
    } else {
      // Force sign in - no guest mode
      setAuthModeValue("signedOut");
      AsyncStorage.setItem(STORAGE_KEYS.authMode, "signedOut").catch(() => {});
    }
  }, [isSignedIn, clerkLoaded]);

  useEffect(() => {
    let mounted = true;
    let timer: NodeJS.Timeout | null = null;

    (async () => {
      try {
        const [storedOnboarding, storedSubscriptionPrompt] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.onboarded),
          AsyncStorage.getItem(STORAGE_KEYS.subscriptionPromptShown)
        ]);
        if (mounted) {
          setHasOnboarded(storedOnboarding === "true");
          setSubscriptionPromptShown(storedSubscriptionPrompt === "true");
        }
      } catch (error) {
        console.error("[AppState] Error loading state:", error);
      }

      // Set ready after Clerk loads, or timeout after 1 second (reduced from 2s)
      // Use a shorter timeout to prevent watchdog crashes
      timer = setTimeout(() => {
        if (mounted) {
          setIsReady(true);
          if (!clerkLoaded) {
            console.warn("[AppState] Clerk not loaded yet, but setting ready to prevent timeout");
          }
        }
      }, clerkLoaded ? 50 : 1000); // Reduced timeout to prevent watchdog
    })();

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [clerkLoaded]);

  const markOnboarded = async () => {
    setHasOnboarded(true);
    await AsyncStorage.setItem(STORAGE_KEYS.onboarded, "true");
  };

  const setAuthMode = async (mode: AuthMode) => {
    setAuthModeValue(mode);
    await AsyncStorage.setItem(STORAGE_KEYS.authMode, mode);
  };

  const markSubscriptionPromptShown = async () => {
    setSubscriptionPromptShown(true);
    await AsyncStorage.setItem(STORAGE_KEYS.subscriptionPromptShown, "true");
  };

  const resetState = async () => {
    setHasOnboarded(false);
    setAuthModeValue("signedOut");
    setSubscriptionPromptShown(false);
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.onboarded,
      STORAGE_KEYS.authMode,
      STORAGE_KEYS.subscriptionPromptShown
    ]);
  };

  const theme = darkTheme;

  const value = useMemo(
    () => ({
      isReady,
      hasOnboarded,
      authMode,
      theme,
      subscriptionPromptShown,
      markOnboarded,
      setAuthMode,
      markSubscriptionPromptShown,
      resetState
    }),
    [isReady, hasOnboarded, authMode, theme, subscriptionPromptShown]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  return <AppStateProviderInner>{children}</AppStateProviderInner>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return ctx;
}
