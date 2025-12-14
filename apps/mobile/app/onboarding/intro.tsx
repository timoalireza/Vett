import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, AccessibilityInfo, SafeAreaView, TouchableOpacity, Text } from "react-native";
import PagerView from "react-native-pager-view";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { GradientBackground } from "../../src/components/GradientBackground";
import { OnboardingCard } from "../../src/components/Onboarding/OnboardingCard";
import { OnboardingCTA } from "../../src/components/Onboarding/OnboardingCTA";
import { ProgressIndicator } from "../../src/components/Onboarding/ProgressIndicator";
import { OnboardingBackButton } from "../../src/components/Onboarding/OnboardingBackButton";
import { LensMotif } from "../../src/components/Lens/LensMotif";
import { useTheme } from "../../src/hooks/use-theme";

const AnimatedIcon = Animated.createAnimatedComponent(Ionicons);

function CardA() {
  const theme = useTheme();
  const pulseScale = useSharedValue(1);
  const [reduceMotion, setReduceMotion] = React.useState(false);

  React.useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  React.useEffect(() => {
    if (!reduceMotion) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [reduceMotion]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <OnboardingCard title="Fact-Checking made easy">
      <AnimatedIcon
        name="chatbubble-outline"
        size={80}
        color={theme.colors.textSecondary}
        style={iconStyle}
      />
    </OnboardingCard>
  );
}

function CardB() {
  const theme = useTheme();
  const checkmarks = [useSharedValue(0), useSharedValue(0), useSharedValue(0)];

  React.useEffect(() => {
    checkmarks.forEach((check, index) => {
      check.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.ease),
        delay: index * 200,
      });
    });
  }, []);

  return (
    <OnboardingCard title="Vett analyzes claims using evidence, not noise.">
      <View style={styles.checkmarkContainer}>
        {checkmarks.map((check, index) => {
          const style = useAnimatedStyle(() => ({
            opacity: check.value,
            transform: [
              { translateY: (1 - check.value) * 10 },
              { scale: check.value },
            ],
          }));
          return (
            <Animated.View key={index} style={style}>
              <Ionicons
                name="checkmark-circle"
                size={40}
                color={theme.colors.success}
                style={{ marginHorizontal: 8 }}
              />
            </Animated.View>
          );
        })}
      </View>
    </OnboardingCard>
  );
}

function CardC() {
  return (
    <OnboardingCard title="Your judgment, amplified.">
      <LensMotif size={200} showPrompt={false} />
    </OnboardingCard>
  );
}

export default function IntroScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [currentPage, setCurrentPage] = useState(0);
  const pagerRef = useRef<PagerView>(null);
  const totalPages = 3;

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      pagerRef.current?.setPage(currentPage + 1);
    } else {
      router.push("/onboarding/auth");
    }
  };

  const handleBack = () => {
    if (currentPage > 0) {
      pagerRef.current?.setPage(currentPage - 1);
    } else {
      router.back();
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <ProgressIndicator currentStep={currentPage + 1} totalSteps={10} variant="bar" />
          </View>
        </View>
        {currentPage > 0 && (
          <View style={styles.backButtonContainer}>
            <OnboardingBackButton onPress={handleBack} />
          </View>
        )}
        <PagerView
          style={styles.pagerView}
          initialPage={0}
          ref={pagerRef}
          onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
        >
          <View key={0} style={styles.pageWrapper}>
            <CardA />
          </View>
          <View key={1} style={styles.pageWrapper}>
            <CardB />
          </View>
          <View key={2} style={styles.pageWrapper}>
            <CardC />
          </View>
        </PagerView>

        <View style={styles.footer}>
          <View style={styles.ctaContainer}>
            <OnboardingCTA
              label="Get Started"
              onPress={handleNext}
              variant="primary"
            />
            <TouchableOpacity
              onPress={() => router.push("/signin")}
              style={styles.signInButton}
            >
              <Text
                style={[
                  styles.signInText,
                  {
                    color: theme.colors.textSecondary,
                    fontFamily: "Inter_400Regular",
                    fontSize: theme.typography.body,
                  },
                ]}
              >
                Already have an account?{" "}
                <Text
                  style={[
                    styles.signInLink,
                    {
                      color: theme.colors.text,
                      fontFamily: "Inter_500Medium",
                    },
                  ]}
                >
                  Sign in
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
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
  pagerView: {
    flex: 1,
  },
  pageWrapper: {
    flex: 1,
  },
  checkmarkContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 48,
  },
  ctaContainer: {
    width: "100%",
    gap: 16,
  },
  signInButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  signInText: {
    textAlign: "center",
  },
  signInLink: {
    textDecorationLine: "underline",
  },
});

