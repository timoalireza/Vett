import { useEffect } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { 
  useFonts, 
  Inter_400Regular, 
  Inter_500Medium, 
  Inter_600SemiBold,
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
import { tokenProvider } from "../src/api/token-provider";
import { clearClerkTokenCache } from "../src/api/clerk-token";

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

function AuthTokenSync() {
  const { isSignedIn, getToken } = useAuth();

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      // Keep a coarse auth state in the token provider so API calls can avoid app-start races.
      tokenProvider.setAuthState(isSignedIn ? "signedIn" : "signedOut");

      if (!isSignedIn) {
        console.log("[AuthTokenSync] User signed out, clearing token");
        tokenProvider.setToken(null);
        tokenProvider.setTokenFetcher(null);
        clearClerkTokenCache();
        return;
      }

      console.log("[AuthTokenSync] User signed in, fetching token...");
      
      try {
        const template = process.env.EXPO_PUBLIC_CLERK_JWT_TEMPLATE;
        // Register a fetcher so non-React API calls can refresh tokens on demand (e.g. after expiry).
        tokenProvider.setTokenFetcher(async () => {
          if (template) {
            try {
              return (await getToken?.({ template })) ?? null;
            } catch {
              return (await getToken?.()) ?? null;
            }
          }
          return (await getToken?.()) ?? null;
        });
        // Prefer a configured JWT template if provided; otherwise fall back to default token behavior.
        let token: string | null | undefined;
        if (template) {
          console.log("[AuthTokenSync] Using JWT template:", template);
          try {
            token = await getToken?.({ template });
          } catch (e) {
            // If a configured template is missing/misconfigured, fall back to default to avoid a signed-in-but-unauthenticated state.
            console.warn("[AuthTokenSync] Failed to get token with template; falling back to default token:", {
              template,
              error: (e as any)?.message
            });
            token = await getToken?.();
          }
        } else {
          console.log("[AuthTokenSync] No JWT template configured, using default token");
          token = await getToken?.();
        }
        
        if (cancelled) return;
        
        // Log token status (preserving nullish coalescing semantics from original code)
        if (token != null) {
          console.log("[AuthTokenSync] Token retrieved successfully:", {
            length: token.length,
            prefix: token.substring(0, 20),
            isJwtLike: token.split(".").length === 3
          });
        } else {
          console.warn("[AuthTokenSync] Token is null/undefined despite being signed in");
        }
        
        tokenProvider.setToken(token ?? null);
      } catch (error) {
        if (cancelled) return;
        console.error("[AuthTokenSync] Failed to get token:", {
          error: (error as any)?.message,
          stack: (error as any)?.stack
        });
        tokenProvider.setToken(null);
      }
    };

    sync();

    // Proactively refresh tokens periodically to avoid expiry-related auth failures.
    // Clerk tokens typically expire within ~1 hour; refresh every 45 minutes.
    const refreshInterval = setInterval(() => {
      if (cancelled) return;
      if (tokenProvider.getAuthState() !== "signedIn") return;
      tokenProvider.refreshToken().catch(() => {});
    }, 45 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(refreshInterval);
    };
  }, [isSignedIn, getToken]);

  return null;
}

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
      
      // Force authentication - no guest mode
      // If user is not signed in, always route to onboarding/welcome which presents login/signup options
      const needsAuth = authMode !== "signedIn";
      // Allow /result/* even when signed out so onboarding demo can show the real results UI.
      if (
        needsAuth &&
        !pathname.startsWith("/signin") &&
        !pathname.startsWith("/onboarding") &&
        !pathname.startsWith("/result")
      ) {
        router.replace("/onboarding/welcome");
        return;
      }
      
      // Check if user needs onboarding (only after auth is verified)
      // Allow visiting /result/* during onboarding so the onboarding demo can show the real results screen UI.
      if (
        authMode === "signedIn" &&
        !hasOnboarded &&
        !pathname.startsWith("/onboarding") &&
        !pathname.startsWith("/signin") &&
        !pathname.startsWith("/result")
      ) {
        router.replace("/onboarding");
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
    // For native-stack, use contentStyle (cardStyle is for the JS stack navigator).
    // This keeps onboarding screens transparent while ensuring the base layer is the app background.
    contentStyle: {
      backgroundColor: "transparent",
    },
    fullScreenGestureEnabled: Platform.OS === "ios",
  };

  // Options for result screens with backwards swipe animation
  const resultScreenOptions = {
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
    fullScreenGestureEnabled: Platform.OS === "ios",
  };

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: Platform.OS === "android" ? "slide_from_right" : "fade",
        // Ensure the base layer underneath all screens matches the app background.
        // This prevents white "edges" from appearing during transitions.
        contentStyle: { backgroundColor: theme.colors.background },
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
        name="onboarding/wrap-up" 
        options={onboardingScreenOptions}
      />
      <Stack.Screen name="signin" />
      <Stack.Screen 
        name="result/[jobId]" 
        options={resultScreenOptions}
      />
      <Stack.Screen 
        name="result/general" 
        options={resultScreenOptions}
      />
      <Stack.Screen 
        name="result/health" 
        options={resultScreenOptions}
      />
      <Stack.Screen 
        name="result/media" 
        options={resultScreenOptions}
      />
      <Stack.Screen 
        name="result/political" 
        options={resultScreenOptions}
      />
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="settings/about" />
      <Stack.Screen name="settings/privacy" />
      <Stack.Screen name="settings/terms" />
      <Stack.Screen
        name="modals/claim"
        options={{
          presentation: "transparentModal",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="modals/source"
        options={{
          presentation: "transparentModal",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="modals/share"
        options={{
          presentation: "transparentModal",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="modals/permission"
        options={{
          presentation: "transparentModal",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="modals/subscription"
        options={{
          presentation: "transparentModal",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen name="error-states" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
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
      <AuthTokenSync />
      <QueryClientProvider client={queryClient}>
        <AppStateProvider>
          <VideoAnimationProvider>
            <RevenueCatAuthSync />
            <CrashBoundary>
              <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
                <StatusBar style="light" translucent />
                <NavigationGate />
              </View>
            </CrashBoundary>
          </VideoAnimationProvider>
        </AppStateProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
