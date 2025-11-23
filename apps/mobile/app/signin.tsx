import { useState } from "react";
import { Text, TouchableOpacity, View, TextInput, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSignIn, useSignUp, useOAuth } from "@clerk/clerk-expo";
import * as LinkingModule from "expo-linking";

import { useAppState } from "../src/state/app-state";
import { useTheme } from "../src/hooks/use-theme";
import { GradientBackground } from "../src/components/GradientBackground";
import { GlassCard } from "../src/components/GlassCard";

export default function SignInScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { setAuthMode } = useAppState();
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: "oauth_apple" });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showVerificationCode, setShowVerificationCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Guest mode removed - users must sign in

  const handleEmailSignIn = async () => {
    if (!signInLoaded) {
      Alert.alert("Error", "Clerk is not ready. Please wait a moment and try again.");
      return;
    }

    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        await setAuthMode("signedIn");
        router.replace("/(tabs)/analyze");
      } else {
        // Handle multi-step sign-in (e.g., 2FA, password reset)
        if (result.status === "needs_first_factor") {
          Alert.alert("Additional Verification", "Please complete additional verification steps.");
        } else {
          Alert.alert("Error", `Sign in incomplete. Status: ${result.status}`);
        }
      }
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.message || err.message || "Failed to sign in. Please check your credentials.";
      Alert.alert("Sign In Error", errorMessage);
      console.error("Sign in error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    if (!signUpLoaded) {
      Alert.alert("Error", "Clerk is not ready. Please wait a moment and try again.");
      return;
    }

    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    if (!firstName || !lastName) {
      Alert.alert("Error", "Please enter both first and last name");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters long");
      return;
    }

    setLoading(true);
    try {
      const result = await signUp.create({
        emailAddress: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim()
      });

      // Send email verification code
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      // Show verification code input
      setShowVerificationCode(true);
      Alert.alert(
        "Verification Required",
        "Please check your email for a verification code and enter it below."
      );
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.message || err.message || "Failed to sign up. Please try again.";
      Alert.alert("Sign Up Error", errorMessage);
      console.error("Sign up error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      Alert.alert("Error", "Please enter a valid 6-digit verification code");
      return;
    }

    setLoading(true);
    try {
      const completeResult = await signUp.attemptEmailAddressVerification({
        code: verificationCode
      });

      if (completeResult.status === "complete") {
        await setActive({ session: completeResult.createdSessionId });
        await setAuthMode("signedIn");
        setShowVerificationCode(false);
        setVerificationCode("");
        router.replace("/(tabs)/analyze");
      } else {
        Alert.alert("Error", "Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.errors?.[0]?.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (strategy: "oauth_google" | "oauth_apple") => {
    try {
      setLoading(true);
      const startOAuth = strategy === "oauth_google" ? startGoogleOAuth : startAppleOAuth;

      const { createdSessionId } = await startOAuth({
        redirectUrl: LinkingModule.createURL("/(tabs)/analyze", { scheme: "vett" })
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        await setAuthMode("signedIn");
        router.replace("/(tabs)/analyze");
      } else {
        // OAuth flow might require additional steps
        // The user will be redirected back to the app
      }
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.message || err.message || `Failed to sign in with ${strategy === "oauth_google" ? "Google" : "Apple"}`;
      Alert.alert("Error", errorMessage);
      console.error("OAuth error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <View
        style={{
          flex: 1,
          padding: theme.spacing(4),
          justifyContent: "center"
        }}
      >
        <GlassCard
          style={{
            padding: theme.spacing(3),
            gap: theme.spacing(2)
          }}
        >
          <Text
            style={{
              color: theme.colors.text,
              fontSize: 34,
              fontFamily: "SpaceGrotesk_600SemiBold"
            }}
          >
            Vett
          </Text>
          <Text
            style={{
              color: theme.colors.subtitle,
              fontSize: 18,
              fontFamily: "SpaceGrotesk_400Regular"
            }}
          >
            Verify anything in seconds. Choose how you want to continue.
          </Text>

          {/* Email Verification Code Input */}
          {showVerificationCode ? (
            <>
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: theme.typography.subheading,
                  fontFamily: "SpaceGrotesk_600SemiBold",
                  marginBottom: theme.spacing(1)
                }}
              >
                Enter Verification Code
              </Text>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.body,
                  fontFamily: "SpaceGrotesk_400Regular",
                  marginBottom: theme.spacing(2)
                }}
              >
                We sent a 6-digit code to {email}
              </Text>
              <TextInput
                placeholder="000000"
                placeholderTextColor={theme.colors.textTertiary}
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                maxLength={6}
                style={{
                  backgroundColor: theme.colors.card,
                  borderRadius: theme.radii.md,
                  padding: theme.spacing(2),
                  color: theme.colors.text,
                  fontSize: theme.typography.heading,
                  fontFamily: "SpaceGrotesk_600SemiBold",
                  letterSpacing: 8,
                  textAlign: "center",
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  marginBottom: theme.spacing(2)
                }}
              />
              <TouchableOpacity
                onPress={handleVerifyCode}
                disabled={loading || verificationCode.length < 6}
                style={{
                  backgroundColor: theme.colors.primary,
                  borderRadius: theme.radii.pill,
                  padding: theme.spacing(2),
                  alignItems: "center",
                  opacity: loading || verificationCode.length < 6 ? 0.5 : 1,
                  marginBottom: theme.spacing(1)
                }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: theme.typography.body,
                      fontFamily: "SpaceGrotesk_500Medium"
                    }}
                  >
                    Verify Code
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowVerificationCode(false);
                  setVerificationCode("");
                }}
              >
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.caption,
                    textAlign: "center",
                    fontFamily: "SpaceGrotesk_400Regular"
                  }}
                >
                  Back to sign up
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Email/Password Form */}
              {isSignUp ? (
                <>
                  <View style={{ flexDirection: "row", gap: theme.spacing(2) }}>
                    <TextInput
                      placeholder="First Name"
                      placeholderTextColor={theme.colors.textTertiary}
                      value={firstName}
                      onChangeText={setFirstName}
                      autoCapitalize="words"
                      autoComplete="given-name"
                      style={{
                        flex: 1,
                        backgroundColor: theme.colors.card,
                        borderRadius: theme.radii.md,
                        padding: theme.spacing(2),
                        color: theme.colors.text,
                        fontSize: theme.typography.body,
                        borderWidth: 1,
                        borderColor: theme.colors.border
                      }}
                    />
                    <TextInput
                      placeholder="Last Name"
                      placeholderTextColor={theme.colors.textTertiary}
                      value={lastName}
                      onChangeText={setLastName}
                      autoCapitalize="words"
                      autoComplete="family-name"
                      style={{
                        flex: 1,
                        backgroundColor: theme.colors.card,
                        borderRadius: theme.radii.md,
                        padding: theme.spacing(2),
                        color: theme.colors.text,
                        fontSize: theme.typography.body,
                        borderWidth: 1,
                        borderColor: theme.colors.border
                      }}
                    />
                  </View>
                  <TextInput
                    placeholder="Email"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    style={{
                      backgroundColor: theme.colors.card,
                      borderRadius: theme.radii.md,
                      padding: theme.spacing(2),
                      color: theme.colors.text,
                      fontSize: theme.typography.body,
                      borderWidth: 1,
                      borderColor: theme.colors.border
                    }}
                  />
                  <View style={{ position: "relative" }}>
                    <TextInput
                      placeholder="Password"
                      placeholderTextColor={theme.colors.textTertiary}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoComplete="password-new"
                      style={{
                        backgroundColor: theme.colors.card,
                        borderRadius: theme.radii.md,
                        padding: theme.spacing(2),
                        paddingRight: 50,
                        color: theme.colors.text,
                        fontSize: theme.typography.body,
                        borderWidth: 1,
                        borderColor: theme.colors.border
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: theme.spacing(2),
                        top: theme.spacing(2),
                        padding: theme.spacing(0.5)
                      }}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={handleEmailSignUp}
                    disabled={loading || !email || !password || !firstName || !lastName}
                    style={{
                      backgroundColor: theme.colors.primary,
                      borderRadius: theme.radii.pill,
                      padding: theme.spacing(2),
                      alignItems: "center",
                      opacity: loading || !email || !password || !firstName || !lastName ? 0.5 : 1
                    }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontSize: theme.typography.body,
                          fontFamily: "SpaceGrotesk_500Medium"
                        }}
                      >
                        Sign Up
                      </Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsSignUp(false)}>
                    <Text
                      style={{
                        color: theme.colors.textSecondary,
                        fontSize: theme.typography.caption,
                        textAlign: "center",
                        fontFamily: "SpaceGrotesk_400Regular"
                      }}
                    >
                      Already have an account? Sign in
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TextInput
                    placeholder="Email"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    style={{
                      backgroundColor: theme.colors.card,
                      borderRadius: theme.radii.md,
                      padding: theme.spacing(2),
                      color: theme.colors.text,
                      fontSize: theme.typography.body,
                      borderWidth: 1,
                      borderColor: theme.colors.border
                    }}
                  />
                  <View style={{ position: "relative" }}>
                    <TextInput
                      placeholder="Password"
                      placeholderTextColor={theme.colors.textTertiary}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                      style={{
                        backgroundColor: theme.colors.card,
                        borderRadius: theme.radii.md,
                        padding: theme.spacing(2),
                        paddingRight: 50,
                        color: theme.colors.text,
                        fontSize: theme.typography.body,
                        borderWidth: 1,
                        borderColor: theme.colors.border
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: theme.spacing(2),
                        top: theme.spacing(2),
                        padding: theme.spacing(0.5)
                      }}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={handleEmailSignIn}
                    disabled={loading || !email || !password}
                    style={{
                      backgroundColor: theme.colors.primary,
                      borderRadius: theme.radii.pill,
                      padding: theme.spacing(2),
                      alignItems: "center",
                      opacity: loading || !email || !password ? 0.5 : 1
                    }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontSize: theme.typography.body,
                          fontFamily: "SpaceGrotesk_500Medium"
                        }}
                      >
                        Sign In
                      </Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsSignUp(true)}>
                    <Text
                      style={{
                        color: theme.colors.textSecondary,
                        fontSize: theme.typography.caption,
                        textAlign: "center",
                        fontFamily: "SpaceGrotesk_400Regular"
                      }}
                    >
                      Don't have an account? Sign up
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing(2),
              marginVertical: theme.spacing(1)
            }}
          >
            <View
              style={{
                flex: 1,
                height: 1,
                backgroundColor: theme.colors.border
              }}
            />
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.caption
              }}
            >
              OR
            </Text>
            <View
              style={{
                flex: 1,
                height: 1,
                backgroundColor: theme.colors.border
              }}
            />
          </View>

          <Button
            icon="logo-apple"
            label="Continue with Apple"
            onPress={() => handleOAuth("oauth_apple")}
            disabled={loading}
          />
          <Button
            icon="logo-google"
            label="Continue with Google"
            onPress={() => handleOAuth("oauth_google")}
            disabled={loading}
          />
        </GlassCard>
      </View>
    </GradientBackground>
  );
}

function Button({
  label,
  icon,
  onPress,
  disabled
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
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing(1),
        paddingVertical: theme.spacing(1.5),
        borderRadius: theme.radii.pill,
        backgroundColor: theme.colors.surface,
        opacity: disabled ? 0.5 : 1
      }}
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={20} color={theme.colors.text} />
      <Text
        style={{
          color: theme.colors.text,
          fontSize: 16,
          fontFamily: "SpaceGrotesk_500Medium"
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
