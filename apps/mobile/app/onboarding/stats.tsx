import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";
import { OnboardingCTA } from "../../src/components/Onboarding/OnboardingCTA";
import { ProgressIndicator } from "../../src/components/Onboarding/ProgressIndicator";
import { OnboardingBackButton } from "../../src/components/Onboarding/OnboardingBackButton";
import { useTheme } from "../../src/hooks/use-theme";

export default function StatsScreen() {
  const router = useRouter();
  const theme = useTheme();

  const handleContinue = () => {
    router.push("/onboarding/demo");
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <ProgressIndicator currentStep={6} totalSteps={8} variant="bar" />
          </View>
        </View>
        <View style={styles.backButtonContainer}>
          <OnboardingBackButton goTo="/onboarding/trust" />
        </View>
        
        <View style={styles.content}>
          <GlassCard
            intensity="medium"
            radius="lg"
            style={[
              styles.card,
              { padding: theme.spacing(4) },
            ]}
          >
            <Text style={styles.emoji}>📊</Text>
            
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
              Vett keeps you informed
            </Text>

            <View style={styles.statContainer}>
              <LinearGradient
                colors={[theme.colors.primary, "#34D399"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.statBadge}
              >
                <Text style={styles.statNumber}>84%</Text>
              </LinearGradient>
              
              <Text
                style={[
                  styles.statText,
                  {
                    color: theme.colors.textSecondary,
                    fontFamily: "Inter_400Regular",
                    fontSize: theme.typography.body,
                    marginTop: theme.spacing(2),
                  },
                ]}
              >
                of Vett users are more critical of the content they view online
              </Text>
            </View>

            <View style={styles.ctaContainer}>
              <OnboardingCTA
                label="Continue"
                onPress={handleContinue}
                variant="primary"
              />
            </View>
          </GlassCard>
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
    padding: 20,
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
    marginBottom: 24,
  },
  statContainer: {
    alignItems: "center",
    marginVertical: 16,
  },
  statBadge: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  statNumber: {
    fontSize: 48,
    fontFamily: "Inter_700Bold",
    color: "#000000",
    textAlign: "center",
  },
  statText: {
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  ctaContainer: {
    marginTop: 32,
  },
});



