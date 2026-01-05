import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  runOnJS,
  useDerivedValue,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { GradientBackground } from "../../src/components/GradientBackground";
import { OnboardingBackButton } from "../../src/components/Onboarding/OnboardingBackButton";
import { useTheme } from "../../src/hooks/use-theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const STAT_VALUE = 84;

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Animated number counter component
function AnimatedCounter({ targetValue, duration = 1500 }: { targetValue: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    // Reset animation state when targetValue changes
    animatedValue.value = 0;
    setDisplayValue(0);

    animatedValue.value = withDelay(
      600,
      withTiming(targetValue, { 
        duration, 
        easing: Easing.out(Easing.cubic) 
      }, (finished) => {
        if (finished) {
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
        }
      })
    );
  }, [targetValue, duration]);

  // Use useDerivedValue to bridge UI thread animation to JS thread React state
  useDerivedValue(() => {
    const rounded = Math.round(animatedValue.value);
    runOnJS(setDisplayValue)(rounded);
  });

  return (
    <Text style={styles.statNumber}>{displayValue}%</Text>
  );
}

export default function StatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // Animation values
  const ringScale = useSharedValue(0.8);
  const ringOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);

  useEffect(() => {
    // Animate ring entrance
    ringOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
    ringScale.value = withDelay(400, withSpring(1, { damping: 15, stiffness: 100 }));
    
    // Animate glow
    glowOpacity.value = withDelay(800, withTiming(0.6, { duration: 800 }));

    // Animate button
    buttonOpacity.value = withDelay(1800, withTiming(1, { duration: 500 }));
    buttonTranslateY.value = withDelay(1800, withSpring(0, { damping: 20 }));
  }, []);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/onboarding/demo");
  };

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Back button */}
        <Animated.View
          entering={FadeIn.duration(400).delay(100)}
          style={styles.backButtonContainer}
        >
          <OnboardingBackButton goTo="/onboarding/trust" />
        </Animated.View>

        {/* Main content */}
        <View style={styles.content}>
          {/* Hero text */}
          <View style={styles.heroSection}>
            <Animated.Text
              entering={FadeInDown.duration(600).delay(200)}
              style={styles.title}
            >
              Vett keeps you{"\n"}
              <Text style={styles.titleAccent}>informed</Text>
            </Animated.Text>
          </View>

          {/* Stat visualization */}
          <View style={styles.statSection}>
            {/* Background glow */}
            <Animated.View style={[styles.glowContainer, glowStyle]}>
              <LinearGradient
                colors={["rgba(105, 219, 124, 0.3)", "rgba(52, 211, 153, 0.1)", "transparent"]}
                style={styles.glow}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              />
            </Animated.View>

            {/* Stat ring */}
            <Animated.View style={[styles.statRing, ringStyle]}>
              {/* Outer glow ring */}
              <View style={styles.outerRing}>
                <LinearGradient
                  colors={["#69DB7C", "#51CF66", "#40C057"]}
                  style={styles.gradientRing}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              </View>
              
              {/* Inner dark circle */}
              <View style={styles.innerCircle}>
                <AnimatedCounter targetValue={STAT_VALUE} />
              </View>
            </Animated.View>

            {/* Stat description */}
            <Animated.Text
              entering={FadeInUp.duration(500).delay(1200)}
              style={styles.statDescription}
            >
              of Vett users are more critical{"\n"}of the content they view online
            </Animated.Text>

            {/* Additional context */}
            <Animated.View
              entering={FadeInUp.duration(500).delay(1400)}
              style={styles.contextContainer}
            >
              <View style={styles.contextItem}>
                <View style={[styles.contextDot, { backgroundColor: "#69DB7C" }]} />
                <Text style={styles.contextText}>Real-time fact checking</Text>
              </View>
              <View style={styles.contextItem}>
                <View style={[styles.contextDot, { backgroundColor: "#4DABF7" }]} />
                <Text style={styles.contextText}>Source verification</Text>
              </View>
              <View style={styles.contextItem}>
                <View style={[styles.contextDot, { backgroundColor: "#DA77F2" }]} />
                <Text style={styles.contextText}>Bias detection</Text>
              </View>
            </Animated.View>
          </View>
        </View>

        {/* Continue button */}
        <Animated.View
          style={[
            styles.ctaContainer,
            { paddingBottom: insets.bottom + 20 },
            buttonStyle,
          ]}
        >
          <AnimatedPressable
            onPress={handleContinue}
            style={styles.continueButton}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </AnimatedPressable>
        </Animated.View>
      </View>
    </GradientBackground>
  );
}

const RING_SIZE = Math.min(SCREEN_WIDTH * 0.55, 220);
const INNER_SIZE = RING_SIZE - 16;

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
    paddingHorizontal: 24,
  },
  heroSection: {
    marginTop: 0,
    marginBottom: 52,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    color: "#FFFFFF",
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  titleAccent: {
    color: "#69DB7C",
  },
  statSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 20,
  },
  glowContainer: {
    position: "absolute",
    top: -40,
    width: RING_SIZE * 2,
    height: RING_SIZE * 1.5,
    alignItems: "center",
  },
  glow: {
    width: "100%",
    height: "100%",
    borderRadius: RING_SIZE,
  },
  statRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  outerRing: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    overflow: "hidden",
  },
  gradientRing: {
    width: "100%",
    height: "100%",
  },
  innerCircle: {
    width: INNER_SIZE,
    height: INNER_SIZE,
    borderRadius: INNER_SIZE / 2,
    backgroundColor: "#0D1117",
    alignItems: "center",
    justifyContent: "center",
    // Subtle inner shadow effect
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  statNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 56,
    color: "#FFFFFF",
    letterSpacing: -2,
  },
  statDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 17,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 26,
    marginTop: 32,
  },
  contextContainer: {
    marginTop: 40,
    gap: 16,
  },
  contextItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  contextDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  contextText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.5)",
  },
  ctaContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  continueButton: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: "#000000",
  },
});
