import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { GradientBackground } from "../../src/components/GradientBackground";
import { OnboardingCTA } from "../../src/components/Onboarding/OnboardingCTA";
import { useTheme } from "../../src/hooks/use-theme";

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();

  const handleGetStarted = () => {
    router.push("/onboarding/trust");
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
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
                label="Get started"
                onPress={handleGetStarted}
                variant="primary"
              />
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  logoContainer: {
    paddingTop: 20,
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
  },
});

