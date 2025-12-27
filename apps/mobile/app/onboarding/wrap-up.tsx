import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";
import { OnboardingCTA } from "../../src/components/Onboarding/OnboardingCTA";
import { OnboardingBackButton } from "../../src/components/Onboarding/OnboardingBackButton";
import { useTheme } from "../../src/hooks/use-theme";
import { useAppState } from "../../src/state/app-state";

export default function WrapUpScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { markOnboarded } = useAppState();

  const handleStartVetting = async () => {
    await markOnboarded();
    router.replace("/(tabs)/analyze");
  };

  const handleWhatIsVett = () => {
    Alert.alert(
      "What is Vett?",
      "Vett is your fact-checking companion. Share claims from social media, news, or anywhere else, and Vett will analyze them using evidence-based sources to help you determine their accuracy.\n\nThink of it as a second opinion for the information you encounter online.",
      [{ text: "Got it", style: "default" }]
    );
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.backButtonContainer}>
          <OnboardingBackButton goTo="/onboarding/premium" />
        </View>
        <View style={styles.content}>
          <GlassCard
            intensity="medium"
            radius="lg"
            style={{ ...styles.card, padding: theme.spacing(3) }}
          >
            <Text
              style={[
                styles.title,
                {
                  color: theme.colors.text,
                  fontFamily: "Inter_700Bold",
                  fontSize: theme.typography.heading,
                },
              ]}
            >
              Nice. That's all we need for now 👌
            </Text>
            <Text
              style={[
                styles.subtitle,
                {
                  color: theme.colors.textSecondary,
                  fontFamily: "Inter_400Regular",
                  fontSize: theme.typography.body,
                  marginTop: theme.spacing(2),
                  marginBottom: theme.spacing(4),
                },
              ]}
            >
              Ready to make your scroll a little smarter?
            </Text>

            <View style={styles.ctaContainer}>
              <OnboardingCTA
                label="Start Vetting"
                onPress={handleStartVetting}
                variant="primary"
              />
              <TouchableOpacity onPress={handleWhatIsVett} style={styles.linkButton}>
                <Text
                  style={[
                    styles.linkText,
                    {
                      color: theme.colors.textSecondary,
                      fontFamily: "Inter_400Regular",
                      fontSize: theme.typography.caption,
                    },
                  ]}
                >
                  Wait—what is Vett exactly?
                </Text>
              </TouchableOpacity>
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
  backButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
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
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
  },
  ctaContainer: {
    marginTop: 16,
    gap: 16,
  },
  linkButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  linkText: {
    textDecorationLine: "underline",
  },
});

