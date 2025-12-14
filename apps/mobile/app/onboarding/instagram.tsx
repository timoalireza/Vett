import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";
import { OnboardingCTA } from "../../src/components/Onboarding/OnboardingCTA";
import { ProgressIndicator } from "../../src/components/Onboarding/ProgressIndicator";
import { OnboardingBackButton } from "../../src/components/Onboarding/OnboardingBackButton";
import { useTheme } from "../../src/hooks/use-theme";
import {
  generateInstagramVerificationCode,
  linkInstagramAccount,
} from "../../src/api/social";

const AnimatedView = Animated.createAnimatedComponent(View);

const BENEFITS = [
  "Auto-import posts into Vett's analyzer",
  "Faster DM-based claim scanning",
  "Early access to creator-specific features",
];

export default function InstagramScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [showCodeInput, setShowCodeInput] = useState(false);

  const iconScale = useSharedValue(1);

  React.useEffect(() => {
    iconScale.value = withSpring(1.1, { damping: 10 });
    const timer = setTimeout(() => {
      iconScale.value = withSpring(1, { damping: 10 });
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const handleLinkInstagram = async () => {
    if (showCodeInput && verificationCode) {
      setLoading(true);
      try {
        const result = await linkInstagramAccount(verificationCode);
        if (result.success) {
          Alert.alert(
            "Success",
            "Your Instagram account is being linked. You'll receive a confirmation shortly.",
            [
              {
                text: "OK",
                onPress: () => router.push("/onboarding/demo"),
              },
            ]
          );
        } else {
          Alert.alert("Error", result.error || "Failed to link Instagram account");
        }
      } catch (error: any) {
        // Handle permission denied or network errors gracefully
        if (error.message?.includes("permission") || error.message?.includes("denied")) {
          Alert.alert(
            "No problem!",
            "You can link your Instagram account later in Settings.",
            [
              {
                text: "OK",
                onPress: () => {
                  setTimeout(() => router.push("/onboarding/demo"), 2000);
                },
              },
            ]
          );
        } else {
          Alert.alert("Error", error.message || "Failed to link Instagram account");
        }
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        const result = await generateInstagramVerificationCode();
        if (result.success && result.verificationCode) {
          setVerificationCode(result.verificationCode);
          setShowCodeInput(true);
          Alert.alert(
            "Verification Code",
            `Your code is: ${result.verificationCode}\n\nSend this code to @vettapp on Instagram to link your account.`,
            [{ text: "OK" }]
          );
        } else {
          Alert.alert("Error", result.error || "Failed to generate verification code");
        }
      } catch (error: any) {
        // Handle network errors
        if (error.message?.includes("network") || error.message?.includes("offline")) {
          Alert.alert(
            "Connection Error",
            "Please check your internet connection and try again.",
            [{ text: "OK" }]
          );
        } else {
          Alert.alert("Error", error.message || "Failed to generate verification code");
        }
      } finally {
        setLoading(false);
      }
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
            <ProgressIndicator currentStep={6} totalSteps={10} variant="bar" />
          </View>
        </View>
        <View style={styles.backButtonContainer}>
          <OnboardingBackButton goTo="/onboarding/profile-setup" />
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
          <AnimatedView style={[styles.iconContainer, iconStyle]}>
            <Ionicons name="logo-instagram" size={64} color="#E4405F" />
          </AnimatedView>

          <Text
            style={[
              styles.title,
              {
                color: theme.colors.text,
                fontFamily: "Inter_600SemiBold",
                fontSize: theme.typography.heading,
                marginTop: theme.spacing(3),
              },
            ]}
          >
            Link Instagram to analyze claims faster
          </Text>

          <View style={styles.benefitsContainer}>
            {BENEFITS.map((benefit, index) => (
              <View
                key={index}
                style={[
                  styles.benefitRow,
                  {
                    marginTop: theme.spacing(2),
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={theme.colors.success}
                />
                <Text
                  style={[
                    styles.benefitText,
                    {
                      color: theme.colors.textSecondary,
                      fontFamily: "Inter_400Regular",
                      fontSize: theme.typography.body,
                      marginLeft: theme.spacing(1.5),
                    },
                  ]}
                >
                  {benefit}
                </Text>
              </View>
            ))}
          </View>

          {showCodeInput && (
            <View
              style={[
                styles.codeContainer,
                {
                  marginTop: theme.spacing(3),
                  padding: theme.spacing(2),
                  backgroundColor: theme.colors.card,
                  borderRadius: theme.radii.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.codeLabel,
                  {
                    color: theme.colors.textSecondary,
                    fontFamily: "Inter_400Regular",
                    fontSize: theme.typography.caption,
                    marginBottom: theme.spacing(1),
                  },
                ]}
              >
                Send this code to @vettapp on Instagram:
              </Text>
              <Text
                style={[
                  styles.codeText,
                  {
                    color: theme.colors.text,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: theme.typography.heading,
                    letterSpacing: 4,
                  },
                ]}
              >
                {verificationCode}
              </Text>
            </View>
          )}

          <View style={styles.ctaContainer}>
            <OnboardingCTA
              label={showCodeInput ? "I've sent the code" : "Link Instagram"}
              onPress={handleLinkInstagram}
              variant="primary"
              loading={loading}
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
                Skip for now
              </Text>
            </TouchableOpacity>
          </View>
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
    alignItems: "center",
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
  },
  benefitsContainer: {
    width: "100%",
    marginTop: 24,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  benefitText: {
    flex: 1,
  },
  codeContainer: {
    width: "100%",
    alignItems: "center",
  },
  codeLabel: {
    textAlign: "center",
  },
  codeText: {
    textAlign: "center",
  },
  ctaContainer: {
    width: "100%",
    marginTop: 32,
    gap: 12,
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  skipText: {
    textDecorationLine: "underline",
  },
});

