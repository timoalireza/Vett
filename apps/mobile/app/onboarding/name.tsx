import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";
import { OnboardingCTA } from "../../src/components/Onboarding/OnboardingCTA";
import { OnboardingBackButton } from "../../src/components/Onboarding/OnboardingBackButton";
import { useTheme } from "../../src/hooks/use-theme";
import { useAppState } from "../../src/state/app-state";

export default function NameScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { fullName: storedFullName, setFullName } = useAppState();
  const [fullName, setFullNameLocal] = useState(storedFullName || "");
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!fullName.trim() || loading) return;

    setLoading(true);
    try {
      await setFullName(fullName.trim());
      router.push("/onboarding/auth");
    } catch (error: any) {
      console.error("[NameScreen] Error saving name:", error);
      Alert.alert("Error", error?.message || "Failed to save your name. Please try again.");
      setLoading(false);
    }
    // Don't set loading to false on success - let navigation happen
  };

  // Update local state when stored value changes (e.g., when navigating back)
  // Also clear local state if storedFullName becomes empty
  useEffect(() => {
    setFullNameLocal(storedFullName || "");
  }, [storedFullName]);

  const isFormValid = fullName.trim().length > 0;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.backButtonContainer}>
          <OnboardingBackButton goTo="/onboarding/welcome" />
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
              style={{
                width: "100%",
                padding: theme.spacing(3),
              }}
            >
              <Text
                style={[
                  styles.title,
                  {
                    color: theme.colors.text,
                    fontFamily: "Inter_700Bold",
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
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleContinue}
                  editable={!loading}
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
                  disabled={!isFormValid || loading}
                  loading={loading}
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
  backButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
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


