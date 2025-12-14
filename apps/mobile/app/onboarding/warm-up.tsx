import React, { useEffect } from "react";
import { View, StyleSheet, AccessibilityInfo, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { GradientBackground } from "../../src/components/GradientBackground";
import { LensMotif } from "../../src/components/Lens/LensMotif";
import { ProgressIndicator } from "../../src/components/Onboarding/ProgressIndicator";
import { OnboardingBackButton } from "../../src/components/Onboarding/OnboardingBackButton";

export default function WarmUpScreen() {
  const router = useRouter();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    // Check for reduced motion preference
    AccessibilityInfo.isReduceMotionEnabled().then((isReduced) => {
      const duration = isReduced ? 0 : 1500;
      
      // Start animations
      opacity.value = withTiming(1, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
      scale.value = withTiming(1, {
        duration,
        easing: Easing.out(Easing.cubic),
      });

      // Auto-advance after animation completes
      const timer = setTimeout(() => {
        router.replace("/onboarding/intro");
      }, Math.max(duration, 500)); // Minimum 500ms even with reduced motion

      return () => clearTimeout(timer);
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <ProgressIndicator currentStep={0} totalSteps={10} variant="bar" />
          </View>
        </View>
        <View style={styles.backButtonContainer}>
          <OnboardingBackButton onPress={() => router.back()} />
        </View>
        <View style={styles.content}>
          <Animated.View style={[styles.lensContainer, animatedStyle]}>
            <LensMotif size={240} showPrompt={false} />
          </Animated.View>
        </View>
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
    alignItems: "center",
    justifyContent: "center",
  },
  lensContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
});

