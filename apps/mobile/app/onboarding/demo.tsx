import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";
import { OnboardingCTA } from "../../src/components/Onboarding/OnboardingCTA";
import { ProgressIndicator } from "../../src/components/Onboarding/ProgressIndicator";
import { OnboardingBackButton } from "../../src/components/Onboarding/OnboardingBackButton";
import { useTheme } from "../../src/hooks/use-theme";

type DemoState = "intro" | "analyzing" | "result";

const DEMO_CLAIM = "Scientists have discovered that drinking coffee can extend your lifespan by up to 10 years.";

const DEMO_RESULT = {
  verdict: "Misleading",
  score: 35,
  summary: "While some studies suggest moderate coffee consumption may have health benefits, the claim of extending lifespan by 10 years is significantly exaggerated and not supported by scientific evidence.",
  sources: [
    "Harvard Health Publishing",
    "National Institutes of Health",
  ],
};

export default function DemoScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [demoState, setDemoState] = useState<DemoState>("intro");
  
  // Animation values
  const claimOpacity = useSharedValue(1);
  const claimScale = useSharedValue(1);
  const resultOpacity = useSharedValue(0);
  const resultTranslateY = useSharedValue(30);
  const loadingOpacity = useSharedValue(0);

  const handleAnalyze = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Animate out claim
    claimOpacity.value = withTiming(0, { duration: 300 });
    claimScale.value = withTiming(0.95, { duration: 300 });
    
    // Show loading
    loadingOpacity.value = withDelay(300, withTiming(1, { duration: 200 }));
    
    setDemoState("analyzing");
    
    // Simulate analysis time
    setTimeout(() => {
      loadingOpacity.value = withTiming(0, { duration: 200 });
      
      setTimeout(() => {
        setDemoState("result");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Animate in result
        resultOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
        resultTranslateY.value = withSpring(0, { damping: 15 });
      }, 200);
    }, 2500);
  };

  const handleContinue = () => {
    router.push("/onboarding/premium");
  };

  const handleTryAgain = () => {
    // Reset animations
    claimOpacity.value = withTiming(1, { duration: 300 });
    claimScale.value = withTiming(1, { duration: 300 });
    resultOpacity.value = 0;
    resultTranslateY.value = 30;
    setDemoState("intro");
  };

  const claimStyle = useAnimatedStyle(() => ({
    opacity: claimOpacity.value,
    transform: [{ scale: claimScale.value }],
  }));

  const loadingStyle = useAnimatedStyle(() => ({
    opacity: loadingOpacity.value,
  }));

  const resultStyle = useAnimatedStyle(() => ({
    opacity: resultOpacity.value,
    transform: [{ translateY: resultTranslateY.value }],
  }));

  const getVerdictColor = (verdict: string) => {
    switch (verdict.toLowerCase()) {
      case "true":
      case "verified":
        return theme.colors.success;
      case "false":
      case "misleading":
        return "#F59E0B"; // Amber
      case "unverified":
        return theme.colors.danger;
      default:
        return theme.colors.textSecondary;
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <ProgressIndicator currentStep={6} totalSteps={7} variant="bar" />
          </View>
        </View>
        <View style={styles.backButtonContainer}>
          <OnboardingBackButton goTo="/onboarding/stats" />
        </View>

        <View style={styles.content}>
          {/* Title */}
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
            {demoState === "intro" ? "Try it out" : demoState === "analyzing" ? "Analyzing..." : "Analysis Complete"}
          </Text>
          <Text
            style={[
              styles.subtitle,
              {
                color: theme.colors.textSecondary,
                fontFamily: "Inter_400Regular",
                fontSize: theme.typography.body,
                marginTop: theme.spacing(1),
              },
            ]}
          >
            {demoState === "intro" 
              ? "Tap the claim below to see Vett in action" 
              : demoState === "analyzing" 
              ? "Vett is checking sources..."
              : "Here's what Vett found"}
          </Text>

          {/* Claim Card (intro state) */}
          {demoState === "intro" && (
            <Animated.View style={[styles.cardContainer, claimStyle]}>
              <TouchableOpacity onPress={handleAnalyze} activeOpacity={0.8}>
                <GlassCard
                  intensity="medium"
                  radius="lg"
                  style={[styles.card, { padding: theme.spacing(3) }]}
                >
                  <View style={styles.claimHeader}>
                    <View style={styles.claimIcon}>
                      <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.colors.textSecondary} />
                    </View>
                    <Text
                      style={[
                        styles.claimLabel,
                        {
                          color: theme.colors.textSecondary,
                          fontFamily: "Inter_500Medium",
                          fontSize: theme.typography.caption,
                        },
                      ]}
                    >
                      Sample Claim
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.claimText,
                      {
                        color: theme.colors.text,
                        fontFamily: "Inter_400Regular",
                        fontSize: theme.typography.body,
                        marginTop: theme.spacing(2),
                      },
                    ]}
                  >
                    "{DEMO_CLAIM}"
                  </Text>
                  <View style={styles.tapHint}>
                    <Ionicons name="hand-left-outline" size={16} color={theme.colors.primary} />
                    <Text
                      style={[
                        styles.tapHintText,
                        {
                          color: theme.colors.primary,
                          fontFamily: "Inter_500Medium",
                          fontSize: theme.typography.caption,
                        },
                      ]}
                    >
                      Tap to analyze
                    </Text>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Loading State */}
          {demoState === "analyzing" && (
            <Animated.View style={[styles.loadingContainer, loadingStyle]}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text
                style={[
                  styles.loadingText,
                  {
                    color: theme.colors.textSecondary,
                    fontFamily: "Inter_400Regular",
                    fontSize: theme.typography.body,
                    marginTop: theme.spacing(2),
                  },
                ]}
              >
                Cross-referencing sources...
              </Text>
            </Animated.View>
          )}

          {/* Result Card */}
          {demoState === "result" && (
            <Animated.View style={[styles.cardContainer, resultStyle]}>
              <GlassCard
                intensity="medium"
                radius="lg"
                style={[styles.card, { padding: theme.spacing(3) }]}
              >
                {/* Verdict Badge */}
                <View style={[styles.verdictBadge, { backgroundColor: getVerdictColor(DEMO_RESULT.verdict) + "20" }]}>
                  <Ionicons 
                    name="alert-circle" 
                    size={20} 
                    color={getVerdictColor(DEMO_RESULT.verdict)} 
                  />
                  <Text
                    style={[
                      styles.verdictText,
                      {
                        color: getVerdictColor(DEMO_RESULT.verdict),
                        fontFamily: "Inter_600SemiBold",
                        fontSize: theme.typography.body,
                      },
                    ]}
                  >
                    {DEMO_RESULT.verdict}
                  </Text>
                </View>

                {/* Score */}
                <View style={styles.scoreContainer}>
                  <Text
                    style={[
                      styles.scoreLabel,
                      {
                        color: theme.colors.textSecondary,
                        fontFamily: "Inter_400Regular",
                        fontSize: theme.typography.caption,
                      },
                    ]}
                  >
                    Credibility Score
                  </Text>
                  <Text
                    style={[
                      styles.scoreValue,
                      {
                        color: getVerdictColor(DEMO_RESULT.verdict),
                        fontFamily: "Inter_700Bold",
                      },
                    ]}
                  >
                    {DEMO_RESULT.score}/100
                  </Text>
                </View>

                {/* Summary */}
                <Text
                  style={[
                    styles.summaryText,
                    {
                      color: theme.colors.text,
                      fontFamily: "Inter_400Regular",
                      fontSize: theme.typography.body,
                      marginTop: theme.spacing(2),
                    },
                  ]}
                >
                  {DEMO_RESULT.summary}
                </Text>

                {/* Sources */}
                <View style={styles.sourcesContainer}>
                  <Text
                    style={[
                      styles.sourcesLabel,
                      {
                        color: theme.colors.textSecondary,
                        fontFamily: "Inter_500Medium",
                        fontSize: theme.typography.caption,
                      },
                    ]}
                  >
                    Sources checked:
                  </Text>
                  {DEMO_RESULT.sources.map((source, index) => (
                    <View key={index} style={styles.sourceItem}>
                      <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
                      <Text
                        style={[
                          styles.sourceText,
                          {
                            color: theme.colors.text,
                            fontFamily: "Inter_400Regular",
                            fontSize: theme.typography.caption,
                          },
                        ]}
                      >
                        {source}
                      </Text>
                    </View>
                  ))}
                </View>
              </GlassCard>
            </Animated.View>
          )}
        </View>

        {/* CTA */}
        {demoState === "result" && (
          <View style={styles.ctaContainer}>
            <OnboardingCTA
              label="Continue"
              onPress={handleContinue}
              variant="primary"
            />
            <TouchableOpacity onPress={handleTryAgain} style={styles.tryAgainButton}>
              <Text
                style={[
                  styles.tryAgainText,
                  {
                    color: theme.colors.textSecondary,
                    fontFamily: "Inter_400Regular",
                    fontSize: theme.typography.caption,
                  },
                ]}
              >
                Try again
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
    justifyContent: "flex-start",
    paddingTop: 40,
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 32,
  },
  cardContainer: {
    width: "100%",
  },
  card: {
    width: "100%",
  },
  claimHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  claimIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  claimLabel: {
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  claimText: {
    lineHeight: 24,
    fontStyle: "italic",
  },
  tapHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  tapHintText: {},
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    textAlign: "center",
  },
  verdictBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: "center",
  },
  verdictText: {},
  scoreContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  scoreLabel: {},
  scoreValue: {
    fontSize: 32,
    marginTop: 4,
  },
  summaryText: {
    lineHeight: 24,
    textAlign: "center",
  },
  sourcesContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  sourcesLabel: {
    marginBottom: 8,
  },
  sourceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  sourceText: {},
  ctaContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  tryAgainButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  tryAgainText: {
    textDecorationLine: "underline",
  },
});



