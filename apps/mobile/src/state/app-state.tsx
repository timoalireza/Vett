import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { darkTheme, Theme } from "../theme/index";

type AuthMode = "signedOut" | "guest" | "signedIn";

interface AppStateValue {
  isReady: boolean;
  hasOnboarded: boolean;
  authMode: AuthMode;
  theme: Theme;
  markOnboarded: () => Promise<void>;
  setAuthMode: (mode: AuthMode) => Promise<void>;
  resetState: () => Promise<void>;
}

const STORAGE_KEYS = {
  onboarded: "vett.hasOnboarded",
  authMode: "vett.authMode"
};

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [authMode, setAuthModeValue] = useState<AuthMode>("signedOut");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [storedOnboarding, storedAuthMode] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.onboarded),
          AsyncStorage.getItem(STORAGE_KEYS.authMode)
        ]);
        // For simulation: always start with onboarding
        // Set to false to always show onboarding, or use storedOnboarding === "true" to respect stored state
        setHasOnboarded(false); // Reset to false for simulation
        setAuthModeValue((storedAuthMode as AuthMode) ?? "signedOut");
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const markOnboarded = async () => {
    setHasOnboarded(true);
    await AsyncStorage.setItem(STORAGE_KEYS.onboarded, "true");
  };

  const setAuthMode = async (mode: AuthMode) => {
    setAuthModeValue(mode);
    await AsyncStorage.setItem(STORAGE_KEYS.authMode, mode);
  };

  const resetState = async () => {
    setHasOnboarded(false);
    setAuthModeValue("signedOut");
    await AsyncStorage.multiRemove([STORAGE_KEYS.onboarded, STORAGE_KEYS.authMode]);
  };

  const theme = darkTheme;

  const value = useMemo(
    () => ({
      isReady,
      hasOnboarded,
      authMode,
      theme,
      markOnboarded,
      setAuthMode,
      resetState
    }),
    [isReady, hasOnboarded, authMode, theme]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return ctx;
}

