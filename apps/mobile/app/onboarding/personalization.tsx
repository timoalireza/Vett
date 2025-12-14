import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";
import { OnboardingCTA } from "../../src/components/Onboarding/OnboardingCTA";
import { ProgressIndicator } from "../../src/components/Onboarding/ProgressIndicator";
import { OnboardingBackButton } from "../../src/components/Onboarding/OnboardingBackButton";
import { TopicSelector, Topic } from "../../src/components/Onboarding/TopicSelector";
import { useTheme } from "../../src/hooks/use-theme";

export default function PersonalizationScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [selectedTopics, setSelectedTopics] = useState<Topic[]>([]);

  const handleContinue = () => {
    // Save preferences to user profile
    // For now, just proceed
    router.push("/onboarding/ready");
  };

  const handleSkip = () => {
    router.push("/onboarding/ready");
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <ProgressIndicator currentStep={9} totalSteps={10} variant="bar" />
          </View>
        </View>
        <View style={styles.backButtonContainer}>
          <OnboardingBackButton goTo="/onboarding/premium" />
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
                  fontFamily: "Inter_600SemiBold",
                  fontSize: theme.typography.heading,
                },
              ]}
            >
              What do you want to analyze?
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
              Select topics that interest you (you can change this later)
            </Text>

            <TopicSelector
              selectedTopics={selectedTopics}
              onSelectionChange={setSelectedTopics}
            />

            <View style={styles.ctaContainer}>
              <OnboardingCTA
                label="Continue"
                onPress={handleContinue}
                variant="primary"
                disabled={selectedTopics.length === 0}
              />
              <OnboardingCTA
                label="Skip"
                onPress={handleSkip}
                variant="ghost"
              />
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
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
  },
  ctaContainer: {
    width: "100%",
    marginTop: 32,
    gap: 12,
  },
});

