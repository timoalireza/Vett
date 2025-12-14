import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { GradientBackground } from "../../src/components/GradientBackground";
import { OnboardingCTA } from "../../src/components/Onboarding/OnboardingCTA";
import { ProgressIndicator } from "../../src/components/Onboarding/ProgressIndicator";
import { OnboardingBackButton } from "../../src/components/Onboarding/OnboardingBackButton";
import { DemoClaimCard } from "../../src/components/Onboarding/DemoClaimCard";
import { DemoResultCard } from "../../src/components/Onboarding/DemoResultCard";
import { AnimatedLens } from "../../src/components/Lens/AnimatedLens";
import { useTheme } from "../../src/hooks/use-theme";

const DEMO_CLAIM = "Eating carrots improves night vision.";
const DEMO_RESULT = {
  verdict: "partially-true" as const,
  score: 65,
  explanation:
    "Carrots contain beta-carotene which supports eye health, but won't give you superhuman night vision.",
};

export default function DemoScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [stage, setStage] = useState<"claim" | "analyzing" | "result">("claim");
  const [showResult, setShowResult] = useState(false);

  const resultOpacity = useSharedValue(0);
  const resultScale = useSharedValue(0.9);

  const handleClaimPress = () => {
    setStage("analyzing");
    // Show analysis animation for 1.2s
    setTimeout(() => {
      setStage("result");
      setShowResult(true);
      resultOpacity.value = withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.ease),
      });
      resultScale.value = withSpring(1, { damping: 15 });
    }, 1200);
  };

  const handleContinue = () => {
    router.push("/onboarding/premium");
  };

  const resultStyle = useAnimatedStyle(() => ({
    opacity: resultOpacity.value,
    transform: [{ scale: resultScale.value }],
  }));

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <ProgressIndicator currentStep={7} totalSteps={10} variant="bar" />
          </View>
        </View>
        <View style={styles.backButtonContainer}>
          <OnboardingBackButton goTo="/onboarding/instagram" />
        </View>
        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.text,
                fontFamily: "Inter_600SemiBold",
                fontSize: theme.typography.heading,
                marginBottom: theme.spacing(2),
              },
            ]}
          >
            Try a 5-second demo
          </Text>

          {stage === "claim" && (
            <View style={styles.claimContainer}>
              <DemoClaimCard claim={DEMO_CLAIM} onPress={handleClaimPress} />
            </View>
          )}

          {stage === "analyzing" && (
            <View style={styles.analyzingContainer}>
              <AnimatedLens size={200} claimText={DEMO_CLAIM} />
            </View>
          )}

          {stage === "result" && showResult && (
            <Animated.View style={[styles.resultContainer, resultStyle]}>
              <DemoResultCard
                verdict={DEMO_RESULT.verdict}
                score={DEMO_RESULT.score}
                explanation={DEMO_RESULT.explanation}
              />
            </Animated.View>
          )}
        </View>

        {stage === "result" && (
          <View style={styles.footer}>
            <OnboardingCTA
              label="Continue"
              onPress={handleContinue}
              variant="primary"
            />
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
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    textAlign: "center",
  },
  claimContainer: {
    width: "100%",
    marginTop: 32,
  },
  analyzingContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
  },
  resultContainer: {
    width: "100%",
    marginTop: 32,
  },
  footer: {
    gap: 24,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
});

