import React, { useEffect } from "react";
import { View, StyleSheet, AccessibilityInfo } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { GradientBackground } from "../../src/components/GradientBackground";
import { LensMotif } from "../../src/components/Lens/LensMotif";

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
      <View style={styles.container}>
        <Animated.View style={[styles.lensContainer, animatedStyle]}>
          <LensMotif size={240} showPrompt={false} />
        </Animated.View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  lensContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
});

