import { ReactNode, createContext, useContext, useCallback, useEffect, useMemo, useState } from "react";
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
  userIntent: string | null;
  trustLevel: number | null;
  alertStyle: string | null;
  markOnboarded: () => Promise<void>;
  setAuthMode: (mode: AuthMode) => Promise<void>;
  markSubscriptionPromptShown: () => Promise<void>;
  setUserIntent: (intent: string) => Promise<void>;
  setTrustLevel: (level: number) => Promise<void>;
  setAlertStyle: (style: string) => Promise<void>;
  resetState: () => Promise<void>;
}

const STORAGE_KEYS = {
  onboarded: "vett.hasOnboarded",
  authMode: "vett.authMode",
  subscriptionPromptShown: "vett.subscriptionPromptShown",
  userIntent: "vett.userIntent",
  trustLevel: "vett.trustLevel",
  alertStyle: "vett.alertStyle",
};

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

function AppStateProviderInner({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded: clerkLoaded } = useAuth();
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [authMode, setAuthModeValue] = useState<AuthMode>("signedOut");
  const [isReady, setIsReady] = useState(false);
  const [subscriptionPromptShown, setSubscriptionPromptShown] = useState(false);
  const [userIntent, setUserIntentValue] = useState<string | null>(null);
  const [trustLevel, setTrustLevelValue] = useState<number | null>(null);
  const [alertStyle, setAlertStyleValue] = useState<string | null>(null);

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
        const [
          storedOnboarding,
          storedSubscriptionPrompt,
          storedUserIntent,
          storedTrustLevel,
          storedAlertStyle,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.onboarded),
          AsyncStorage.getItem(STORAGE_KEYS.subscriptionPromptShown),
          AsyncStorage.getItem(STORAGE_KEYS.userIntent),
          AsyncStorage.getItem(STORAGE_KEYS.trustLevel),
          AsyncStorage.getItem(STORAGE_KEYS.alertStyle),
        ]);
        if (mounted) {
          setHasOnboarded(storedOnboarding === "true");
          setSubscriptionPromptShown(storedSubscriptionPrompt === "true");
          setUserIntentValue(storedUserIntent);
          setTrustLevelValue(
            storedTrustLevel ? parseInt(storedTrustLevel, 10) : null
          );
          setAlertStyleValue(storedAlertStyle);
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

  const markOnboarded = useCallback(async () => {
    setHasOnboarded(true);
    await AsyncStorage.setItem(STORAGE_KEYS.onboarded, "true");
  }, []);

  const setAuthMode = useCallback(async (mode: AuthMode) => {
    setAuthModeValue(mode);
    await AsyncStorage.setItem(STORAGE_KEYS.authMode, mode);
  }, []);

  const markSubscriptionPromptShown = useCallback(async () => {
    setSubscriptionPromptShown(true);
    await AsyncStorage.setItem(STORAGE_KEYS.subscriptionPromptShown, "true");
  }, []);

  const setUserIntent = useCallback(async (intent: string) => {
    setUserIntentValue(intent);
    await AsyncStorage.setItem(STORAGE_KEYS.userIntent, intent);
  }, []);

  const setTrustLevel = useCallback(async (level: number) => {
    setTrustLevelValue(level);
    await AsyncStorage.setItem(STORAGE_KEYS.trustLevel, level.toString());
  }, []);

  const setAlertStyle = useCallback(async (style: string) => {
    setAlertStyleValue(style);
    await AsyncStorage.setItem(STORAGE_KEYS.alertStyle, style);
  }, []);

  const resetState = useCallback(async () => {
    setHasOnboarded(false);
    setAuthModeValue("signedOut");
    setSubscriptionPromptShown(false);
    setUserIntentValue(null);
    setTrustLevelValue(null);
    setAlertStyleValue(null);
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.onboarded,
      STORAGE_KEYS.authMode,
      STORAGE_KEYS.subscriptionPromptShown,
      STORAGE_KEYS.userIntent,
      STORAGE_KEYS.trustLevel,
      STORAGE_KEYS.alertStyle,
    ]);
  }, []);

  const theme = darkTheme;

  const value = useMemo(
    () => ({
      isReady,
      hasOnboarded,
      authMode,
      theme,
      subscriptionPromptShown,
      userIntent,
      trustLevel,
      alertStyle,
      markOnboarded,
      setAuthMode,
      markSubscriptionPromptShown,
      setUserIntent,
      setTrustLevel,
      setAlertStyle,
      resetState
    }),
    [
      isReady,
      hasOnboarded,
      authMode,
      theme,
      subscriptionPromptShown,
      userIntent,
      trustLevel,
      alertStyle,
      markOnboarded,
      setAuthMode,
      markSubscriptionPromptShown,
      setUserIntent,
      setTrustLevel,
      setAlertStyle,
      resetState,
    ]
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
