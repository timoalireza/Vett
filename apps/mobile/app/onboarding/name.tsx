import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";
import { OnboardingCTA } from "../../src/components/Onboarding/OnboardingCTA";
import { ProgressIndicator } from "../../src/components/Onboarding/ProgressIndicator";
import { OnboardingBackButton } from "../../src/components/Onboarding/OnboardingBackButton";
import { useTheme } from "../../src/hooks/use-theme";
import { useAppState } from "../../src/state/app-state";

export default function NameScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { fullName: storedFullName, setFullName } = useAppState();
  const [fullName, setFullNameLocal] = useState(storedFullName || "");

  const handleContinue = async () => {
    if (fullName.trim()) {
      await setFullName(fullName.trim());
      router.push("/onboarding/auth");
    }
  };

  // Update local state when stored value changes (e.g., when navigating back)
  useEffect(() => {
    if (storedFullName) {
      setFullNameLocal(storedFullName);
    }
  }, [storedFullName]);

  const isFormValid = fullName.trim().length > 0;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* Static elements - same position on all screens so they appear fixed */}
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <ProgressIndicator currentStep={3} totalSteps={8} variant="bar" />
          </View>
        </View>
        <View style={styles.backButtonContainer}>
          <OnboardingBackButton goTo="/onboarding/intro" />
        </View>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <View style={styles.content}>
            <GlassCard
              intensity="medium"
              radius="lg"
              style={[
                styles.card,
                { padding: theme.spacing(3) },
              ]}
            >
              <Text
                style={[
                  styles.title,
                  {
                    color: theme.colors.text,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: theme.typography.heading + 8,
                  },
                ]}
              >
                What's your name?
              </Text>

              <View style={styles.inputContainer}>
                <TextInput
                  placeholder="Full Name"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={fullName}
                  onChangeText={setFullNameLocal}
                  autoCapitalize="words"
                  autoComplete="name"
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                      fontFamily: "Inter_400Regular",
                      fontSize: theme.typography.body,
                    },
                  ]}
                />
              </View>

              <View style={styles.buttonContainer}>
                <OnboardingCTA
                  label="Continue"
                  onPress={handleContinue}
                  variant="primary"
                  disabled={!isFormValid}
                  fullWidth={true}
                />
              </View>
            </GlassCard>
          </View>
        </KeyboardAvoidingView>
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
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 8,
    justifyContent: "flex-start",
  },
  card: {
    width: "100%",
  },
  title: {
    textAlign: "left",
    marginBottom: 32,
  },
  inputContainer: {
    gap: 12,
    marginBottom: 32,
  },
  input: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  buttonContainer: {
    width: "100%",
  },
});


