import { useEffect } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { 
  useFonts, 
  Inter_400Regular, 
  Inter_500Medium, 
  Inter_700Bold,
  Inter_800ExtraBold
} from "@expo-google-fonts/inter";
import { StatusBar } from "expo-status-bar";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

// Passkey support - conditionally load if package is available
let passkeys: any = undefined;
try {
  // @ts-ignore - package may not be installed
  passkeys = require("@clerk/expo-passkeys").passkeys;
} catch (e) {
  console.log("Passkeys not available - install @clerk/expo-passkeys for passkey support");
}

import { QueryClientProvider } from "@tanstack/react-query";

import { AppStateProvider, useAppState } from "../src/state/app-state";
import { VideoAnimationProvider } from "../src/components/Video/VideoAnimationProvider";
import { CrashBoundary } from "../src/components/CrashBoundary";
import { theme } from "../src/theme";
import { queryClient } from "../src/state/query-client";
import { initializeRevenueCat } from "../src/services/revenuecat";
import { RevenueCatAuthSync } from "./_layout-revenuecat";

// Token cache for Clerk
const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      // Handle error
    }
  }
};

// Get Clerk publishable key from environment or config
const clerkPublishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  (Constants.expoConfig?.extra?.clerkPublishableKey as string | undefined) ||
  "";

SplashScreen.preventAutoHideAsync().catch(() => {});

function NavigationGate() {
  const { isReady, authMode, hasOnboarded, subscriptionPromptShown, markSubscriptionPromptShown } = useAppState();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isReady) {
      return;
    }

    let subscriptionTimer: NodeJS.Timeout | null = null;

    // Use setTimeout to defer navigation and avoid blocking main thread
    const navigationTimer = setTimeout(() => {
      console.log("[NavigationGate] State:", { isReady, authMode, hasOnboarded, pathname });
      
      // Check if user needs onboarding
      // Allow visiting /result/* during onboarding so the onboarding demo can show the real results screen UI.
      if (
        !hasOnboarded &&
        !pathname.startsWith("/onboarding") &&
        !pathname.startsWith("/signin") &&
        !pathname.startsWith("/result")
      ) {
        router.replace("/onboarding");
        return;
      }

      // Force authentication - no guest mode
      const needsAuth = authMode !== "signedIn";
      // Allow /result/* even when signed out so onboarding demo can show the real results UI.
      if (
        needsAuth &&
        !pathname.startsWith("/signin") &&
        !pathname.startsWith("/onboarding") &&
        !pathname.startsWith("/result")
      ) {
        router.replace("/signin");
        return;
      }

      // If authenticated and onboarded, allow navigation to main app
      if (authMode === "signedIn" && hasOnboarded && pathname === "/") {
        router.replace("/(tabs)/analyze");
        return;
      }

      // Show subscription prompt on first app open (after auth and onboarding)
      if (
        authMode === "signedIn" &&
        hasOnboarded &&
        !subscriptionPromptShown &&
        !pathname.startsWith("/modals/subscription") &&
        !pathname.startsWith("/signin") &&
        !pathname.startsWith("/onboarding")
      ) {
        // Small delay to ensure UI is ready
        subscriptionTimer = setTimeout(() => {
          router.push("/modals/subscription");
          markSubscriptionPromptShown();
        }, 500);
      }
    }, 100); // Small delay to avoid blocking main thread

    return () => {
      clearTimeout(navigationTimer);
      // Also clear nested subscription timer if it exists
      if (subscriptionTimer) {
        clearTimeout(subscriptionTimer);
      }
    };
  }, [isReady, authMode, hasOnboarded, subscriptionPromptShown, pathname, router, markSubscriptionPromptShown]);

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000000",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 16, marginBottom: 20 }}>Initializing app...</Text>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  // Options for onboarding screens with smooth swipe gestures
  // Using transparent background so static elements (progress bar, back button)
  // appear to stay fixed since they're in the same position on all screens
  const onboardingScreenOptions = {
    animation: "slide_from_right" as const,
    gestureEnabled: true,
    gestureDirection: "horizontal" as const,
    transitionSpec: {
      open: {
        animation: "timing" as const,
        config: {
          duration: 300,
          useNativeDriver: true,
        },
      },
      close: {
        animation: "timing" as const,
        config: {
          duration: 300,
          useNativeDriver: true,
        },
      },
    },
    cardStyle: {
      backgroundColor: "transparent",
    },
    fullScreenGestureEnabled: Platform.OS === "ios",
  };

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: Platform.OS === "android" ? "slide_from_right" : "fade"
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen 
        name="onboarding/index" 
        options={onboardingScreenOptions}
      />
      <Stack.Screen 
        name="onboarding/welcome" 
        options={onboardingScreenOptions}
      />
      <Stack.Screen 
        name="onboarding/name" 
        options={onboardingScreenOptions}
      />
      <Stack.Screen 
        name="onboarding/auth" 
        options={onboardingScreenOptions}
      />
      <Stack.Screen 
        name="onboarding/email-auth" 
        options={onboardingScreenOptions}
      />
      <Stack.Screen 
        name="onboarding/trust" 
        options={onboardingScreenOptions}
      />
      <Stack.Screen 
        name="onboarding/stats" 
        options={onboardingScreenOptions}
      />
      <Stack.Screen 
        name="onboarding/demo" 
        options={onboardingScreenOptions}
      />
      <Stack.Screen 
        name="onboarding/premium" 
        options={onboardingScreenOptions}
      />
      <Stack.Screen 
        name="onboarding/wrap-up" 
        options={onboardingScreenOptions}
      />
      <Stack.Screen name="signin" />
      <Stack.Screen name="result/[jobId]" />
      <Stack.Screen name="result/general" />
      <Stack.Screen name="result/health" />
      <Stack.Screen name="result/media" />
      <Stack.Screen name="result/political" />
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="settings/about" />
      <Stack.Screen name="settings/notifications" />
      <Stack.Screen name="settings/privacy" />
      <Stack.Screen name="settings/terms" />
      <Stack.Screen name="modals/claim" options={{ presentation: "transparentModal" }} />
      <Stack.Screen name="modals/source" options={{ presentation: "transparentModal" }} />
      <Stack.Screen name="modals/share" options={{ presentation: "transparentModal" }} />
      <Stack.Screen name="modals/permission" options={{ presentation: "transparentModal" }} />
      <Stack.Screen name="modals/subscription" options={{ presentation: "transparentModal" }} />
      <Stack.Screen name="error-states" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    Inter_800ExtraBold
  });

  useEffect(() => {
    console.log("[RootLayout] Fonts loaded:", fontsLoaded);
    console.log("[RootLayout] Clerk key present:", !!clerkPublishableKey);
    
    // Initialize RevenueCat when app starts
    initializeRevenueCat().catch((error) => {
      console.error("[RootLayout] Failed to initialize RevenueCat:", error);
    });
    
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000000", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#FFFFFF", fontSize: 16, marginBottom: 20 }}>Loading fonts...</Text>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  if (!clerkPublishableKey) {
    console.error("❌ Clerk publishable key not found! Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY");
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ color: theme.colors.text, fontSize: 18, textAlign: "center" }}>
          ⚠️ Missing Clerk configuration{'\n'}
          Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
        </Text>
      </View>
    );
  }

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      tokenCache={tokenCache}
      {...(passkeys ? { __experimental_passkeys: passkeys } : {})}
    >
      <QueryClientProvider client={queryClient}>
        <AppStateProvider>
          <VideoAnimationProvider>
            <RevenueCatAuthSync />
            <CrashBoundary>
              <StatusBar style="light" translucent />
              <NavigationGate />
            </CrashBoundary>
          </VideoAnimationProvider>
        </AppStateProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
