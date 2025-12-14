import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, AccessibilityInfo } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { GradientBackground } from "../../src/components/GradientBackground";
import { OnboardingCTA } from "../../src/components/Onboarding/OnboardingCTA";
import { LensMotif } from "../../src/components/Lens/LensMotif";
import { useTheme } from "../../src/hooks/use-theme";
import { useAppState } from "../../src/state/app-state";

const AnimatedView = Animated.createAnimatedComponent(View);

export default function ReadyScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { markOnboarded } = useAppState();

  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (!reduceMotion) {
      // Gentle pulse animation
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      // Subtle glow pulse
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [reduceMotion]);

  const lensStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handleStart = async () => {
    await markOnboarded();
    router.replace("/(tabs)/analyze");
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.content}>
          <Animated.View style={[styles.lensContainer, lensStyle]}>
            <Animated.View
              style={[
                styles.glow,
                glowStyle,
                {
                  backgroundColor: theme.colors.primary + "20",
                },
              ]}
            />
            <LensMotif size={240} showPrompt={false} />
          </Animated.View>

          <Text
            style={[
              styles.title,
              {
                color: theme.colors.text,
                fontFamily: "Inter_200ExtraLight",
                fontSize: theme.typography.heading + 8,
                marginTop: theme.spacing(4),
              },
            ]}
          >
            Welcome to Vett
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
            Your new judgment superpower
          </Text>

          <Text
            style={[
              styles.instruction,
              {
                color: theme.colors.textTertiary,
                fontFamily: "Inter_400Regular",
                fontSize: theme.typography.caption,
                marginTop: theme.spacing(4),
              },
            ]}
          >
            Tap the lens to analyze your first claim
          </Text>
        </View>

        <View style={styles.footer}>
          <OnboardingCTA label="Start Analyzing" onPress={handleStart} variant="primary" />
          <Text
            style={[
              styles.footerText,
              {
                color: theme.colors.textTertiary,
                fontFamily: "Inter_400Regular",
                fontSize: theme.typography.caption,
                marginTop: theme.spacing(2),
              },
            ]}
          >
            Settings → to revisit preferences anytime
          </Text>
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  lensContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
  },
  instruction: {
    textAlign: "center",
  },
  footer: {
    width: "100%",
    alignItems: "center",
    paddingBottom: 32,
  },
  footerText: {
    textAlign: "center",
  },
});

