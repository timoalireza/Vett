import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { GradientBackground } from "../../src/components/GradientBackground";
import { OnboardingCTA } from "../../src/components/Onboarding/OnboardingCTA";
import { ProgressIndicator } from "../../src/components/Onboarding/ProgressIndicator";
import { useTheme } from "../../src/hooks/use-theme";

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();

  const handleGetStarted = () => {
    router.push("/onboarding/intro");
  };

  const handleLogin = () => {
    router.push("/signin");
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <ProgressIndicator currentStep={1} totalSteps={7} variant="bar" />
          </View>
        </View>
        <View style={styles.content}>
          {/* Logo at top left */}
          <View style={styles.logoContainer}>
            <Text
              style={[
                styles.logo,
                {
                  color: theme.colors.text,
                  fontFamily: "Inter_700Bold",
                  fontSize: 32,
                },
              ]}
            >
              Vett
            </Text>
          </View>

          {/* Bottom section */}
          <View style={styles.bottomSection}>
            <Text
              style={[
                styles.mainText,
                {
                  color: theme.colors.text,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: theme.typography.heading + 4,
                },
              ]}
            >
              Check what's true.
            </Text>
            <Text
              style={[
                styles.secondaryText,
                {
                  color: theme.colors.textSecondary,
                  fontFamily: "Inter_400Regular",
                  fontSize: theme.typography.body,
                  marginTop: theme.spacing(1),
                },
              ]}
            >
              In seconds. Across the internet.
            </Text>

            <View style={styles.ctaContainer}>
              <OnboardingCTA
                label="Get Started"
                onPress={handleGetStarted}
                variant="primary"
              />
              <TouchableOpacity onPress={handleLogin} style={styles.loginLink}>
                <Text
                  style={[
                    styles.loginText,
                    {
                      color: theme.colors.textSecondary,
                      fontFamily: "Inter_400Regular",
                      fontSize: theme.typography.body,
                    },
                  ]}
                >
                  Already have an account?{" "}
                  <Text style={{ color: theme.colors.text, fontFamily: "Inter_500Medium" }}>
                    Log in
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  progressContainer: {
    width: "100%",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  logoContainer: {
    paddingTop: 8,
    alignItems: "flex-start",
  },
  logo: {
    textAlign: "left",
  },
  bottomSection: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 40,
    alignItems: "flex-start",
  },
  mainText: {
    textAlign: "left",
  },
  secondaryText: {
    textAlign: "left",
  },
  ctaContainer: {
    width: "100%",
    marginTop: 32,
    alignItems: "center",
  },
  loginLink: {
    marginTop: 16,
    paddingVertical: 8,
  },
  loginText: {
    textAlign: "center",
  },
});

