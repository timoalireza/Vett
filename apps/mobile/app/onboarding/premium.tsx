import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";
import { OnboardingCTA } from "../../src/components/Onboarding/OnboardingCTA";
import { OnboardingBackButton } from "../../src/components/Onboarding/OnboardingBackButton";
import { useTheme } from "../../src/hooks/use-theme";
import { useRevenueCat } from "../../src/hooks/use-revenuecat";

const FEATURES = [
  "Unlimited analyses",
  "Faster analysis queue",
  "Advanced claim types",
  "Early access features",
  "Priority accuracy updates",
];

export default function PremiumScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [screen, setScreen] = useState<"features" | "trial">("features");
  const { getMonthlyPackage, getAnnualPackage, purchase } = useRevenueCat();

  const handleStartTrial = async () => {
    try {
      // Get annual package (better value)
      const pkg = getAnnualPackage();
      if (!pkg) {
        Alert.alert("Error", "Package not available. Please try again later.");
        return;
      }

      const customerInfo = await purchase(pkg);
      if (Object.keys(customerInfo.entitlements.active).length > 0) {
        Alert.alert("Success", "Your free trial has started!", [
          {
            text: "OK",
            onPress: () => router.push("/onboarding/wrap-up"),
          },
        ]);
      } else {
        Alert.alert("Error", "Trial not activated. Please contact support.");
      }
    } catch (error: any) {
      if (error.message?.includes("cancelled") || error.userCancelled) {
        return;
      }
      Alert.alert("Error", error.message || "Failed to start trial");
    }
  };

  const handleContinueFree = () => {
    router.push("/onboarding/wrap-up");
  };

  if (screen === "features") {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.container} edges={["top"]}>
          <View style={styles.backButtonContainer}>
            <OnboardingBackButton goTo="/onboarding/demo" />
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
                    fontFamily: "Inter_700Bold",
                    fontSize: theme.typography.heading,
                  },
                ]}
              >
                Unlock unlimited analyses with Premium
              </Text>

              <View style={styles.featuresContainer}>
                {FEATURES.map((feature, index) => (
                  <View
                    key={index}
                    style={[
                      styles.featureRow,
                      {
                        marginTop: theme.spacing(2),
                      },
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={theme.colors.success}
                    />
                    <Text
                      style={[
                        styles.featureText,
                        {
                          color: theme.colors.text,
                          fontFamily: "Inter_400Regular",
                          fontSize: theme.typography.body,
                          marginLeft: theme.spacing(1.5),
                        },
                      ]}
                    >
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.ctaContainer}>
                <OnboardingCTA
                  label="See free trial offer"
                  onPress={() => setScreen("trial")}
                  variant="primary"
                />
                <TouchableOpacity onPress={handleContinueFree} style={styles.skipButton}>
                  <Text
                    style={[
                      styles.skipText,
                      {
                        color: theme.colors.textSecondary,
                        fontSize: theme.typography.caption,
                      },
                    ]}
                  >
                    Continue with free plan
                  </Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.backButtonContainer}>
          <OnboardingBackButton onPress={() => setScreen("features")} />
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
                fontFamily: "Inter_700Bold",
                fontSize: theme.typography.heading,
              },
            ]}
          >
            7-day free trial available
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
            Try all Premium features free for 7 days. Cancel anytime.
          </Text>

          <View style={styles.ctaContainer}>
            <OnboardingCTA
              label="Start free trial"
              onPress={handleStartTrial}
              variant="primary"
            />
            <TouchableOpacity onPress={handleContinueFree} style={styles.skipButton}>
              <Text
                style={[
                  styles.skipText,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.caption,
                  },
                ]}
              >
                Continue with free plan
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
  backButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
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
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
  },
  featuresContainer: {
    marginTop: 24,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureText: {
    flex: 1,
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

