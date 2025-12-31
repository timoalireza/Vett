import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useAuth } from "@clerk/clerk-expo";

import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";
import { OnboardingCTA } from "../../src/components/Onboarding/OnboardingCTA";
import { OnboardingBackButton } from "../../src/components/Onboarding/OnboardingBackButton";
import { useTheme } from "../../src/hooks/use-theme";
import { generateInstagramVerificationCode } from "../../src/api/social";

export default function InstagramScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { isSignedIn } = useAuth();
  const [verificationCode, setVerificationCode] = useState<string | null>(null);

  const generateCodeMutation = useMutation({
    mutationFn: generateInstagramVerificationCode,
    onSuccess: (result) => {
      if (result.success && result.verificationCode) {
        setVerificationCode(result.verificationCode);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("Error", result.error || "Failed to generate verification code");
      }
    },
    onError: (error: any) => {
      const msg = error?.message || "Failed to generate verification code";
      if (typeof msg === "string" && msg.toLowerCase().includes("authentication required")) {
        Alert.alert(
          "Sign in required",
          "Please sign in to link Instagram.",
          [{ text: "OK", onPress: () => router.push("/onboarding/auth") }]
        );
        return;
      }
      Alert.alert("Error", msg);
    }
  });

  const handleCopyCode = async () => {
    if (verificationCode) {
      await Clipboard.setStringAsync(verificationCode);
      Haptics.selectionAsync();
      Alert.alert("Copied", "Verification code copied to clipboard");
    }
  };

  const handleOpenInstagram = async () => {
    try {
      // Try to open DM with the bot directly if possible, or just the profile
      const canOpen = await Linking.canOpenURL("instagram://user?username=vettapp");
      if (canOpen) {
        await Linking.openURL("instagram://user?username=vettapp");
      } else {
        await Linking.openURL("https://www.instagram.com/vettapp/");
      }
    } catch (err) {
      Alert.alert("Error", "Could not open Instagram");
    }
  };

  const handleContinue = () => {
    router.push("/onboarding/premium");
  };

  const handleSkip = () => {
    router.push("/onboarding/premium");
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.backButtonContainer}>
          <OnboardingBackButton goTo="/onboarding/demo" />
        </View>
        
        <View style={styles.content}>
          <GlassCard
            intensity="medium"
            radius="lg"
            style={{ ...styles.card, padding: theme.spacing(3) }}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="logo-instagram" size={48} color="#E1306C" />
            </View>

            <Text
              style={[
                styles.title,
                {
                  color: theme.colors.text,
                  fontFamily: "Inter_700Bold",
                  fontSize: theme.typography.heading,
                },
              ]}
            >
              Link your Instagram
            </Text>
            
            <Text
              style={[
                styles.subtitle,
                {
                  color: theme.colors.textSecondary,
                  fontFamily: "Inter_400Regular",
                  fontSize: theme.typography.body,
                  marginTop: theme.spacing(2),
                  marginBottom: theme.spacing(4),
                },
              ]}
            >
              Get fact-checking by sending posts directly to @vettapp on Instagram. DM analysis limits depend on your plan.
            </Text>

            {!verificationCode ? (
              <View style={styles.actionContainer}>
                <OnboardingCTA
                  label={generateCodeMutation.isPending ? "Generating..." : "Generate Link Code"}
                  onPress={() => {
                    if (!isSignedIn) {
                      Alert.alert("Sign in required", "Please sign in to link Instagram.", [
                        { text: "Cancel", style: "cancel" },
                        { text: "Sign in", onPress: () => router.push("/onboarding/auth") }
                      ]);
                      return;
                    }
                    generateCodeMutation.mutate();
                  }}
                  variant="primary"
                  disabled={!isSignedIn || generateCodeMutation.isPending}
                />
              </View>
            ) : (
              <View style={styles.codeContainer}>
                <Text style={[styles.instructionText, { color: theme.colors.text }]}>
                  Send this code to @vettapp:
                </Text>
                
                <TouchableOpacity 
                  style={styles.codeBox} 
                  onPress={handleCopyCode}
                  activeOpacity={0.7}
                >
                  <Text style={styles.codeText}>{verificationCode}</Text>
                  <Ionicons name="copy-outline" size={20} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.instagramButton, { borderColor: theme.colors.border }]}
                  onPress={handleOpenInstagram}
                >
                  <Text style={[styles.instagramButtonText, { color: theme.colors.text }]}>
                    Open Instagram & Send
                  </Text>
                  <Ionicons name="open-outline" size={16} color={theme.colors.text} />
                </TouchableOpacity>

                <View style={styles.divider} />

                <OnboardingCTA
                  label="I've Sent It"
                  onPress={handleContinue}
                  variant="primary"
                />
              </View>
            )}

            {!verificationCode && (
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
                  Skip for now
                </Text>
              </TouchableOpacity>
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
  backButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 8,
    justifyContent: "flex-start",
  },
  card: {
    width: "100%",
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    lineHeight: 22,
  },
  actionContainer: {
    width: "100%",
    gap: 16,
  },
  codeContainer: {
    width: "100%",
    alignItems: "center",
    gap: 16,
  },
  instructionText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    marginBottom: 8,
  },
  codeText: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 4,
  },
  instagramButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: "rgba(225, 48, 108, 0.1)",
    borderColor: "rgba(225, 48, 108, 0.3)",
    gap: 8,
    width: "100%",
  },
  instagramButtonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    width: "100%",
    marginVertical: 8,
  },
  skipButton: {
    marginTop: 20,
    padding: 10,
  },
  skipText: {
    textDecorationLine: "underline",
    fontFamily: "Inter_400Regular",
  },
});

