import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  const isAppleOrGoogle = label.includes("Apple") || label.includes("Google");
  const backgroundColor = isAppleOrGoogle ? "#FFFFFF" : theme.colors.surface;
  const textColor = isAppleOrGoogle ? "#000000" : theme.colors.text;
  const iconColor = isAppleOrGoogle ? "#000000" : theme.colors.text;
  
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.authButton,
        {
          backgroundColor,
          borderRadius: theme.radii.md,
          borderWidth: isAppleOrGoogle ? 0 : 1,
          borderColor: theme.colors.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={20} color={iconColor} />
      <Text
        style={[
          styles.authButtonText,
          {
            color: textColor,
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
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);
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
        
        // Prepare email verification
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        
        // Show verification form
        setShowVerificationForm(true);
        setError(null);
      } else {
        const result = await signIn.create({
          identifier: email.trim(),
          password,
        });

        if (result.status === "complete" && result.createdSessionId && setActive) {
          await setActive({ session: result.createdSessionId });
          await setAuthMode("signedIn");
          router.push("/onboarding/profile-setup");
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

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      setError("Please enter a valid 6-digit verification code");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const completeResult = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (completeResult.status === "complete" && completeResult.createdSessionId && setActive) {
        await setActive({ session: completeResult.createdSessionId });
        await setAuthMode("signedIn");
        router.push("/onboarding/profile-setup");
      } else {
        setError("Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.message || "Invalid verification code";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.push("/onboarding/profile-setup");
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <ProgressIndicator currentStep={2} totalSteps={7} variant="bar" />
          </View>
        </View>
        <View style={styles.backButtonContainer}>
          <OnboardingBackButton 
            onPress={() => {
              if (showVerificationForm) {
                // Go back to email form to correct credentials
                setShowVerificationForm(false);
                setVerificationCode("");
                setError(null);
              } else if (showEmailForm) {
                // Go back to auth options
                setShowEmailForm(false);
                setEmail("");
                setPassword("");
                setError(null);
              } else {
                // Go back to trust screen
                router.push("/onboarding/trust");
              }
            }}
          />
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <GlassCard
          intensity="medium"
          radius="lg"
          style={{
            ...styles.card,
            padding: theme.spacing(3),
          }}
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
          ) : showVerificationForm ? (
            <View style={styles.emailForm}>
              <Text
                style={[
                  styles.title,
                  {
                    color: theme.colors.text,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: theme.typography.subheading,
                    marginBottom: theme.spacing(1),
                  },
                ]}
              >
                Enter Verification Code
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  {
                    color: theme.colors.textSecondary,
                    fontFamily: "Inter_400Regular",
                    fontSize: theme.typography.body,
                    marginBottom: theme.spacing(2),
                  },
                ]}
              >
                We sent a 6-digit code to {email}
              </Text>

              <TextInput
                placeholder="000000"
                placeholderTextColor={theme.colors.textSecondary}
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                maxLength={6}
                style={[
                  styles.input,
                  styles.verificationInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    borderRadius: theme.radii.md,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: theme.typography.heading,
                  },
                ]}
              />

              <OnboardingCTA
                label="Verify Code"
                onPress={handleVerifyCode}
                variant="primary"
                loading={loading}
                disabled={loading || verificationCode.length < 6}
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
            </View>
          ) : (
            <View style={styles.emailForm}>
              <TextInput
                placeholder="Email"
                placeholderTextColor={theme.colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    borderRadius: theme.radii.md,
                    fontFamily: "Inter_400Regular",
                    fontSize: theme.typography.body,
                  },
                ]}
              />

              <TextInput
                placeholder="Password"
                placeholderTextColor={theme.colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    borderRadius: theme.radii.md,
                    fontFamily: "Inter_400Regular",
                    fontSize: theme.typography.body,
                  },
                ]}
              />

              <OnboardingCTA
                label={isSignUp ? "Create Account" : "Sign In"}
                onPress={handleEmailAuth}
                variant="primary"
                loading={loading}
                disabled={loading || !email || !password}
              />

              <TouchableOpacity
                onPress={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
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
    paddingHorizontal: 20,
  },
  authButtonText: {
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
    marginTop: 16,
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
  input: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  verificationInput: {
    textAlign: "center",
    letterSpacing: 8,
  },
});

