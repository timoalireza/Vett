import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSignIn, useSignUp, useOAuth } from "@clerk/clerk-expo";
import * as LinkingModule from "expo-linking";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";
import { OnboardingCTA } from "../../src/components/Onboarding/OnboardingCTA";
import { ProgressIndicator } from "../../src/components/Onboarding/ProgressIndicator";
import { OnboardingBackButton } from "../../src/components/Onboarding/OnboardingBackButton";
import { useTheme } from "../../src/hooks/use-theme";
import { useAppState } from "../../src/state/app-state";

function AuthButton({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.authButton,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={20} color={theme.colors.text} />
      <Text
        style={[
          styles.authButtonText,
          {
            color: theme.colors.text,
            fontFamily: "Inter_500Medium",
            fontSize: theme.typography.body,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function AuthScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { setAuthMode } = useAppState();
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: "oauth_apple" });

  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const handleOAuth = async (strategy: "oauth_google" | "oauth_apple") => {
    try {
      setLoading(true);
      setError(null);
      const startOAuth = strategy === "oauth_google" ? startGoogleOAuth : startAppleOAuth;

      const { createdSessionId } = await startOAuth({
        redirectUrl: LinkingModule.createURL("/onboarding/profile-setup", { scheme: "vett" }),
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        await setAuthMode("signedIn");
        router.push("/onboarding/profile-setup");
      }
    } catch (err: any) {
      const errorMessage =
        err.errors?.[0]?.message ||
        err.message ||
        `Failed to sign in with ${strategy === "oauth_google" ? "Google" : "Apple"}`;
      setError(errorMessage);
      setFailedAttempts((prev) => prev + 1);
      console.error("OAuth error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    if (!signInLoaded || !signUpLoaded) {
      setError("Please wait a moment and try again");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const result = await signUp.create({
          emailAddress: email.trim(),
          password,
        });
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        Alert.alert(
          "Verification Required",
          "Please check your email for a verification code.",
          [
            {
              text: "OK",
              onPress: () => {
                // For now, skip email verification in onboarding
                // User can verify later
                router.push("/onboarding/instagram");
              },
            },
          ]
        );
      } else {
        const result = await signIn.create({
          identifier: email.trim(),
          password,
        });

        if (result.status === "complete") {
          await setActive({ session: result.createdSessionId });
          await setAuthMode("signedIn");
          router.push("/onboarding/instagram");
        } else {
          setError("Sign in incomplete. Please try again.");
          setFailedAttempts((prev) => prev + 1);
        }
      }
    } catch (err: any) {
      const errorMessage =
        err.errors?.[0]?.message || err.message || "Authentication failed";
      setError(errorMessage);
      setFailedAttempts((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.push("/onboarding/demo");
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <ProgressIndicator currentStep={2} totalSteps={8} variant="bar" />
          </View>
        </View>
        <View style={styles.backButtonContainer}>
          <OnboardingBackButton goTo="/onboarding/intro" />
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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
            Create your account
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
            Accounts protect your saved analyses and preferences.
          </Text>

          {!showEmailForm ? (
            <>
              <AuthButton
                icon="logo-apple"
                label="Continue with Apple"
                onPress={() => handleOAuth("oauth_apple")}
                disabled={loading}
              />
              <View style={{ height: theme.spacing(1.5) }} />
              <AuthButton
                icon="logo-google"
                label="Continue with Google"
                onPress={() => handleOAuth("oauth_google")}
                disabled={loading}
              />
              <View style={{ height: theme.spacing(1.5) }} />
              <AuthButton
                icon="mail-outline"
                label="Continue with Email"
                onPress={() => setShowEmailForm(true)}
                disabled={loading}
              />

              {error && (
                <View
                  style={[
                    styles.errorContainer,
                    {
                      marginTop: theme.spacing(2),
                      padding: theme.spacing(1.5),
                      backgroundColor: theme.colors.danger + "20",
                      borderRadius: theme.radii.md,
                      borderWidth: 1,
                      borderColor: theme.colors.danger,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.errorText,
                      {
                        color: theme.colors.danger,
                        fontSize: theme.typography.caption,
                        textAlign: "center",
                      },
                    ]}
                  >
                    {error}
                  </Text>
                </View>
              )}

              {failedAttempts >= 2 && (
                <TouchableOpacity
                  onPress={handleSkip}
                  style={{ marginTop: theme.spacing(2) }}
                >
                  <Text
                    style={[
                      styles.skipText,
                      {
                        color: theme.colors.textSecondary,
                        fontSize: theme.typography.caption,
                        textAlign: "center",
                      },
                    ]}
                  >
                    Skip for now
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.emailForm}>
              <TouchableOpacity
                onPress={() => {
                  setShowEmailForm(false);
                  setError(null);
                }}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
                <Text
                  style={[
                    styles.backText,
                    {
                      color: theme.colors.text,
                      fontSize: theme.typography.caption,
                    },
                  ]}
                >
                  Back
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsSignUp(!isSignUp)}
                style={styles.toggleAuth}
              >
                <Text
                  style={[
                    styles.toggleText,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.caption,
                    },
                  ]}
                >
                  {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                </Text>
              </TouchableOpacity>

              {/* Email/Password inputs would go here - simplified for now */}
              <Text
                style={[
                  styles.infoText,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.caption,
                    marginTop: theme.spacing(2),
                    textAlign: "center",
                  },
                ]}
              >
                Email authentication coming soon. Please use Apple or Google for now.
              </Text>
            </View>
          )}

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={theme.colors.primary} size="small" />
            </View>
          )}
        </GlassCard>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
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
  authButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 16,
  },
  authButtonText: {
    flex: 1,
    textAlign: "center",
  },
  errorContainer: {
    width: "100%",
  },
  errorText: {
    textAlign: "center",
  },
  skipText: {
    textDecorationLine: "underline",
  },
  emailForm: {
    marginTop: 16,
  },
  footer: {
    marginTop: 32,
    paddingHorizontal: 16,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  backText: {
    fontFamily: "Inter_500Medium",
  },
  toggleAuth: {
    marginBottom: 16,
  },
  toggleText: {
    textAlign: "center",
    textDecorationLine: "underline",
  },
  infoText: {
    lineHeight: 18,
  },
  loadingContainer: {
    marginTop: 16,
    alignItems: "center",
  },
});

