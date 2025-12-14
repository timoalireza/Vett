import React, { useState, useEffect } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";
import { OnboardingCTA } from "../../src/components/Onboarding/OnboardingCTA";
import { ProgressIndicator } from "../../src/components/Onboarding/ProgressIndicator";
import { OnboardingBackButton } from "../../src/components/Onboarding/OnboardingBackButton";
import { useTheme } from "../../src/hooks/use-theme";

export default function ProfileSetupScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useUser();
  const [username, setUsername] = useState("");

  useEffect(() => {
    // Auto-populate username from OAuth if available
    if (user?.firstName || user?.username) {
      setUsername(user.username || user.firstName || "");
    }
  }, [user]);

  const handleContinue = () => {
    // Save username to user metadata if needed
    // For now, just proceed
    router.push("/onboarding/instagram");
  };

  const handleSkip = () => {
    router.push("/onboarding/instagram");
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <ProgressIndicator currentStep={5} totalSteps={10} variant="bar" />
          </View>
        </View>
        <View style={styles.backButtonContainer}>
          <OnboardingBackButton goTo="/onboarding/auth" />
        </View>
        <View style={styles.content}>
          <GlassCard
          intensity="medium"
          radius="lg"
          style={[
            styles.card,
            {
              padding: theme.spacing(3),
            },
          ]}
        >
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.text,
                fontFamily: "Inter_600SemiBold",
                fontSize: theme.typography.heading,
              },
            ]}
          >
            Complete your profile
          </Text>
          <Text
            style={[
              styles.subtitle,
              {
                color: theme.colors.textSecondary,
                fontFamily: "Inter_400Regular",
                fontSize: theme.typography.body,
                marginTop: theme.spacing(1),
                marginBottom: theme.spacing(3),
              },
            ]}
          >
            Choose a username (you can change this later)
          </Text>

          <TextInput
            placeholder="Username"
            placeholderTextColor={theme.colors.textTertiary}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoComplete="username"
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.card,
                borderRadius: theme.radii.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
                color: theme.colors.text,
                fontSize: theme.typography.body,
                fontFamily: "Inter_400Regular",
                padding: theme.spacing(2),
              },
            ]}
          />

          <View style={styles.ctaContainer}>
            <OnboardingCTA
              label="Save & Continue"
              onPress={handleContinue}
              variant="primary"
            />
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text
                style={[
                  styles.skipText,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.caption,
                  },
                ]}
              >
                Skip
              </Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
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
  backButtonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  card: {
    width: "100%",
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
  },
  input: {
    marginBottom: 24,
  },
  ctaContainer: {
    gap: 12,
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  skipText: {
    textDecorationLine: "underline",
  },
  footer: {
    marginTop: 32,
    paddingHorizontal: 16,
  },
});

