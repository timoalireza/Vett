import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import PagerView from "react-native-pager-view";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  interpolate,
  Extrapolation
} from "react-native-reanimated";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";
import { OnboardingCTA } from "../../src/components/Onboarding/OnboardingCTA";
import { ProgressIndicator } from "../../src/components/Onboarding/ProgressIndicator";
import { OnboardingBackButton } from "../../src/components/Onboarding/OnboardingBackButton";
import { useTheme } from "../../src/hooks/use-theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const INFO_CARDS = [
  {
    title: "The Internet Is Full of Misinformation",
    body: "Fake news spreads faster than the truth and often gets more engagement than reliable reporting.\n\nIt's harder than ever to know what's real and what's not.\n\nVett helps you cut through the noise and think critically.",
    emoji: "🌐",
  },
  {
    title: "What Vett Does",
    body: "Vett gives you quick, reliable context about what you're reading online.\n\nThink of it as a signal system for information—flagging questionable sources and highlighting credible ones.\n\nYou stay informed without having to dig for the facts.",
    emoji: "🔍",
  },
  {
    title: "Why You'll Want Vett",
    body: "Save time, avoid misinformation, and get clarity fast.\n\nWhether you're scrolling for fun or searching for answers, Vett helps you make sense of what you see.\n\nBecause your attention matters—and so does the truth.",
    emoji: "✨",
  },
];

export default function IntroScreen() {
  const router = useRouter();
  const theme = useTheme();
  const pagerRef = useRef<PagerView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const handleNext = () => {
    if (currentPage < INFO_CARDS.length - 1) {
      pagerRef.current?.setPage(currentPage + 1);
    } else {
      router.push("/onboarding/name");
    }
  };

  const handlePageSelected = (e: any) => {
    setCurrentPage(e.nativeEvent.position);
  };

  const isLastPage = currentPage === INFO_CARDS.length - 1;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <ProgressIndicator currentStep={2} totalSteps={8} variant="bar" />
          </View>
        </View>
        <View style={styles.backButtonContainer}>
          <OnboardingBackButton goTo="/onboarding/welcome" />
        </View>

        <View style={styles.pagerContainer}>
          <PagerView
            ref={pagerRef}
            style={styles.pager}
            initialPage={0}
            onPageSelected={handlePageSelected}
          >
            {INFO_CARDS.map((card, index) => (
              <View key={index} style={styles.pageWrapper}>
                <GlassCard
                  intensity="medium"
                  radius="lg"
                  style={[
                    styles.card,
                    { padding: theme.spacing(3) },
                  ]}
                >
                  <Text style={styles.emoji}>{card.emoji}</Text>
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
                    {card.title}
                  </Text>
                  <Text
                    style={[
                      styles.body,
                      {
                        color: theme.colors.textSecondary,
                        fontFamily: "Inter_400Regular",
                        fontSize: theme.typography.body,
                        marginTop: theme.spacing(2),
                      },
                    ]}
                  >
                    {card.body}
                  </Text>
                </GlassCard>
              </View>
            ))}
          </PagerView>
        </View>

        {/* Page Indicators */}
        <View style={styles.indicators}>
          {INFO_CARDS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                {
                  backgroundColor:
                    index === currentPage
                      ? theme.colors.primary
                      : theme.colors.border,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.ctaContainer}>
          <OnboardingCTA
            label={isLastPage ? "Continue" : "Next"}
            onPress={handleNext}
            variant="primary"
          />
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
  pagerContainer: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  pageWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    justifyContent: "flex-start",
  },
  card: {
    width: "100%",
  },
  emoji: {
    fontSize: 48,
    textAlign: "center",
    marginBottom: 16,
  },
  title: {
    textAlign: "center",
  },
  body: {
    textAlign: "center",
    lineHeight: 24,
  },
  indicators: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ctaContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
});



