import { useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold } from "@expo-google-fonts/space-grotesk";
import { StatusBar } from "expo-status-bar";

import { QueryClientProvider } from "@tanstack/react-query";

import { AppStateProvider, useAppState } from "../src/state/app-state";
import { CrashBoundary } from "../src/components/CrashBoundary";
import { theme } from "../src/theme";
import { queryClient } from "../src/state/query-client";

SplashScreen.preventAutoHideAsync().catch(() => {});

function NavigationGate() {
  const { isReady, hasOnboarded, authMode } = useAppState();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isReady) {
      return;
    }

    // Always route to onboarding first if not already onboarded
    if (!hasOnboarded) {
      if (!pathname.startsWith("/onboarding")) {
        router.replace("/onboarding");
      }
      return;
    }

    // After onboarding, check auth
    const needsAuth = authMode === "signedOut";
    if (needsAuth && !pathname.startsWith("/signin") && !pathname.startsWith("/onboarding")) {
      router.replace("/signin");
      return;
    }

    // If onboarded and authenticated (or guest), allow navigation to main app
    if (hasOnboarded && authMode !== "signedOut" && pathname === "/") {
      router.replace("/(tabs)/analyze");
    }
  }, [isReady, hasOnboarded, authMode, pathname, router]);

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: Platform.OS === "android" ? "slide_from_right" : "fade"
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding/index" />
      <Stack.Screen name="signin" />
      <Stack.Screen name="result/[jobId]" />
      <Stack.Screen name="result/general" />
      <Stack.Screen name="result/health" />
      <Stack.Screen name="result/media" />
      <Stack.Screen name="result/political" />
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="settings/about" />
      <Stack.Screen name="settings/linked-accounts" />
      <Stack.Screen name="modals/claim" options={{ presentation: "transparentModal" }} />
      <Stack.Screen name="modals/source" options={{ presentation: "transparentModal" }} />
      <Stack.Screen name="modals/share" options={{ presentation: "transparentModal" }} />
      <Stack.Screen name="modals/permission" options={{ presentation: "transparentModal" }} />
      <Stack.Screen name="error-states" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppStateProvider>
        <CrashBoundary>
          <StatusBar style="light" translucent />
          <NavigationGate />
        </CrashBoundary>
      </AppStateProvider>
    </QueryClientProvider>
  );
}

