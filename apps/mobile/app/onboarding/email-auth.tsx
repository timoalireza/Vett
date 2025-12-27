import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSignUp, useOAuth } from "@clerk/clerk-expo";
import * as LinkingModule from "expo-linking";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";
import { OnboardingCTA } from "../../src/components/Onboarding/OnboardingCTA";
import { OnboardingBackButton } from "../../src/components/Onboarding/OnboardingBackButton";
import { useTheme } from "../../src/hooks/use-theme";
import { useAppState } from "../../src/state/app-state";

export default function EmailAuthScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { setAuthMode, fullName } = useAppState();
  const { signUp, setActive, isLoaded: signUpLoaded } = useSignUp();
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: "oauth_apple" });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Timer for resend cooldown
  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailSignUp = async () => {
    if (!signUpLoaded || !signUp) {
      setError("Authentication service is not ready. Please wait a moment and try again.");
      return;
    }

    if (!email || !validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!fullName || !fullName.trim()) {
      setError("Please go back and enter your name first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Split fullName into firstName and lastName
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || undefined;

      await signUp.create({
        emailAddress: email,
        password: password,
        firstName: firstName,
        ...(lastName && { lastName }),
      });

      // Prepare email verification
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      setShowVerification(true);
      setError(null);
      setResendCooldown(60);
    } catch (err: any) {
      console.error("[EmailAuth] Sign up error:", err);
      let errorMessage = err.errors?.[0]?.message || err.message || "Failed to sign up";
      
      if (errorMessage.toLowerCase().includes("already exists") || errorMessage.toLowerCase().includes("taken")) {
        errorMessage = "An account with this email already exists. Please sign in instead.";
      } else if (errorMessage.toLowerCase().includes("password")) {
        errorMessage = "Password must be at least 8 characters with a mix of letters and numbers.";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      setError("Please enter a valid 6-digit verification code");
      return;
    }

    if (!signUp) {
      setError("Sign up session expired. Please try again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const completeResult = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (completeResult.status === "complete" && completeResult.createdSessionId) {
        if (!setActive) {
          setError("Unable to activate session. Please try again.");
          return;
        }
        
        await setActive({ session: completeResult.createdSessionId });
        await setAuthMode("signedIn");
        router.push("/onboarding/trust");
      } else {
        setError("Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      console.error("[EmailAuth] Verification error:", err);
      let errorMessage = err.errors?.[0]?.message || err.message || "Invalid verification code";
      
      if (errorMessage.toLowerCase().includes("incorrect") || errorMessage.toLowerCase().includes("invalid")) {
        errorMessage = "The verification code is incorrect. Please check and try again.";
      } else if (errorMessage.toLowerCase().includes("expired")) {
        errorMessage = "The verification code has expired. Please request a new code.";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    if (!signUp) {
      setError("Sign up session expired. Please start over.");
      return;
    }

    setLoading(true);
    setError(null);
    setVerificationCode("");

    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setResendCooldown(60);
      Alert.alert("Code Sent", "A new verification code has been sent to your email.");
    } catch (err: any) {
      console.error("[EmailAuth] Resend code error:", err);
      const errorMessage = err.errors?.[0]?.message || err.message || "Failed to resend code";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (strategy: "oauth_google" | "oauth_apple") => {
    try {
      setLoading(true);
      setError(null);
      const startOAuth = strategy === "oauth_google" ? startGoogleOAuth : startAppleOAuth;
      const redirectUrl = LinkingModule.createURL("onboarding/trust", { scheme: "vett" });

      const { createdSessionId } = await startOAuth({
        // NOTE: Avoid leading "/" here; `Linking.createURL("/...")` often produces `vett:///...` (triple slash)
        // which can trigger Clerk "Redirect url mismatch" if you allowlisted `vett://...`.
        redirectUrl
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        await setAuthMode("signedIn");
        router.push("/onboarding/trust");
      }
    } catch (err: any) {
      const providerLabel = strategy === "oauth_google" ? "Google" : "Apple";
      const rawMessage =
        err?.errors?.[0]?.message ||
        err?.message ||
        `Failed to sign in with ${providerLabel}`;

      let errorMessage = rawMessage;
      if (/redirect url mismatch/i.test(rawMessage)) {
        const redirectUrl = LinkingModule.createURL("onboarding/trust", { scheme: "vett" });
        errorMessage =
          `Redirect URL mismatch.\n\n` +
          `In Clerk Dashboard → Configure → OAuth Applications → ${providerLabel}, add this Redirect URL:\n` +
          `\`${redirectUrl}\``;
      }

      setError(errorMessage);
      console.error("OAuth error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.backButtonContainer}>
          <OnboardingBackButton 
            onPress={() => {
              if (showVerification) {
                setShowVerification(false);
                setVerificationCode("");
                setError(null);
                setResendCooldown(0);
              } else {
                router.back();
              }
            }}
          />
        </View>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
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
                    fontFamily: "Inter_700Bold",
                    fontSize: theme.typography.heading,
                    marginBottom: theme.spacing(3),
                  },
                ]}
              >
                {showVerification ? "Verify your email" : "Create your account"}
              </Text>

              {showVerification ? (
                <View style={styles.form}>
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontFamily: "Inter_400Regular",
                      fontSize: theme.typography.body,
                      marginBottom: theme.spacing(2),
                      textAlign: "center",
                    }}
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
                        fontFamily: "Inter_700Bold",
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

                  <TouchableOpacity
                    onPress={handleResendCode}
                    disabled={loading || resendCooldown > 0}
                    style={{ marginTop: theme.spacing(2) }}
                  >
                    <Text
                      style={{
                        color: theme.colors.primary,
                        fontSize: theme.typography.caption,
                        textAlign: "center",
                        fontFamily: "Inter_500Medium",
                        opacity: loading || resendCooldown > 0 ? 0.5 : 1,
                      }}
                    >
                      {resendCooldown > 0 ? `Request again in ${resendCooldown}s` : "Resend Code"}
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
                        style={{
                          color: theme.colors.danger,
                          fontSize: theme.typography.caption,
                          textAlign: "center",
                        }}
                      >
                        {error}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.form}>
                  {/* Email Input */}
                  <TextInput
                    placeholder="Email address"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setError(null);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderRadius: theme.radii.md,
                      padding: theme.spacing(2),
                      color: theme.colors.text,
                      fontSize: theme.typography.body,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      fontFamily: "Inter_400Regular",
                      marginBottom: theme.spacing(1.5),
                    }}
                  />

                  {/* Password Input */}
                  <View style={{ position: "relative", marginBottom: theme.spacing(2) }}>
                    <TextInput
                      placeholder="Password (min 8 characters)"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        setError(null);
                      }}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoComplete="password-new"
                      autoCorrect={false}
                      style={{
                        backgroundColor: theme.colors.surface,
                        borderRadius: theme.radii.md,
                        padding: theme.spacing(2),
                        paddingRight: theme.spacing(6),
                        color: theme.colors.text,
                        fontSize: theme.typography.body,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        fontFamily: "Inter_400Regular",
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: theme.spacing(2),
                        top: 0,
                        bottom: 0,
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off" : "eye"}
                        size={20}
                        color={theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>

                  <OnboardingCTA
                    label="Create Account"
                    onPress={handleEmailSignUp}
                    variant="primary"
                    loading={loading}
                    disabled={loading || !email || !password}
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
                        style={{
                          color: theme.colors.danger,
                          fontSize: theme.typography.caption,
                          textAlign: "center",
                        }}
                      >
                        {error}
                      </Text>
                    </View>
                  )}

                  {/* OR Separator */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: theme.spacing(2),
                      marginVertical: theme.spacing(3),
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        height: 1,
                        backgroundColor: theme.colors.border,
                      }}
                    />
                    <Text
                      style={{
                        color: theme.colors.textSecondary,
                        fontSize: theme.typography.caption,
                        fontFamily: "Inter_400Regular",
                      }}
                    >
                      OR
                    </Text>
                    <View
                      style={{
                        flex: 1,
                        height: 1,
                        backgroundColor: theme.colors.border,
                      }}
                    />
                  </View>

                  {/* Social Login Buttons */}
                  <TouchableOpacity
                    onPress={() => handleOAuth("oauth_apple")}
                    disabled={loading}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#FFFFFF",
                      borderRadius: theme.radii.pill,
                      padding: theme.spacing(2),
                      marginBottom: theme.spacing(1.5),
                      opacity: loading ? 0.5 : 1,
                    }}
                  >
                    <Ionicons name="logo-apple" size={20} color="#000000" style={{ marginRight: theme.spacing(1) }} />
                    <Text
                      style={{
                        color: "#000000",
                        fontSize: theme.typography.body,
                        fontFamily: "Inter_500Medium",
                      }}
                    >
                      Continue with Apple
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      // Google OAuth is intentionally disabled for now until configured in Clerk.
                      Alert.alert("Coming soon", "Google sign-in will be available soon.");
                    }}
                    disabled={true}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: theme.colors.surface,
                      borderRadius: theme.radii.pill,
                      padding: theme.spacing(2),
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      opacity: 0.5,
                    }}
                  >
                    <Ionicons name="logo-google" size={20} color={theme.colors.text} style={{ marginRight: theme.spacing(1) }} />
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.typography.body,
                        fontFamily: "Inter_500Medium",
                      }}
                    >
                      Continue with Google (soon)
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

            </GlassCard>
          </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 8,
    justifyContent: "flex-start",
  },
  card: {
    width: "100%",
  },
  title: {
    textAlign: "left",
  },
  form: {
    marginTop: 16,
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
  errorContainer: {
    width: "100%",
  },
});

