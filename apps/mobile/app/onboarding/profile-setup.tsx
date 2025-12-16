import React, { useState, useEffect } from "react";
import { View, Text, TextInput, StyleSheet, SafeAreaView, Alert } from "react-native";
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
  const [currentPage, setCurrentPage] = useState(0); // 0 = first name, 1 = last name
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    // Auto-populate from OAuth if available
    if (user?.firstName) {
      setFirstName(user.firstName);
    }
    if (user?.lastName) {
      setLastName(user.lastName);
    }
  }, [user]);

  const handleContinue = async () => {
    if (currentPage === 0) {
      // Move to last name page
      setCurrentPage(1);
    } else {
      // Save names to user metadata
      if (!user) {
        Alert.alert(
          "Error",
          "Please wait for your profile to load, then try again.",
          [{ text: "OK" }]
        );
        return;
      }

      try {
        await user.update({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });
        // Proceed to next screen only on success
        router.push("/onboarding/instagram");
      } catch (error: any) {
        console.error("Error updating user profile:", error);
        Alert.alert(
          "Error",
          "Failed to save your profile. Please try again.",
          [{ text: "OK" }]
        );
      }
    }
  };

  const handleBack = () => {
    if (currentPage === 1) {
      // Go back to first name page
      setCurrentPage(0);
    } else {
      // Go back to auth screen
      router.push("/onboarding/auth");
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <ProgressIndicator currentStep={3} totalSteps={7} variant="bar" />
          </View>
        </View>
        <View style={styles.backButtonContainer}>
          <OnboardingBackButton onPress={handleBack} />
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
            {currentPage === 0 ? (
              <>
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
                  What's your first name?
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
                  This helps us personalize your experience
                </Text>

                <TextInput
                  placeholder="First name"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  autoComplete="given-name"
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
                    label="Continue"
                    onPress={handleContinue}
                    variant="primary"
                    disabled={!firstName.trim()}
                  />
                </View>
              </>
            ) : (
              <>
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
                  And your last name?
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
                  Almost done with your profile
                </Text>

                <TextInput
                  placeholder="Last name"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  autoComplete="family-name"
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
                    disabled={!lastName.trim()}
                  />
                </View>
              </>
            )}
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
});

