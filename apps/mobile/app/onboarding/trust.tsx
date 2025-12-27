import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";
import { OnboardingCTA } from "../../src/components/Onboarding/OnboardingCTA";
import { OnboardingBackButton } from "../../src/components/Onboarding/OnboardingBackButton";
import { EmojiRating } from "../../src/components/Onboarding/EmojiRating";
import { useTheme } from "../../src/hooks/use-theme";
import { useAppState } from "../../src/state/app-state";

// Adapted for EmojiRating component (sorted by value/intensity)
// We reverse the logic: 0 (Left/Red) -> 3 (Right/Green)
// "I trust nothing" (0) -> "I trust most of it" (3)
const TRUST_OPTIONS = [
  { 
    emoji: "🚩", 
    label: "I trust nothing", 
    value: 0,
    gradient: ["#F87171", "#EF4444"], 
    shadowColor: "rgba(239, 68, 68, 0.3)" 
  },
  { 
    emoji: "😬", 
    label: "Not really sure", 
    value: 1,
    gradient: ["#FB923C", "#F97316"], 
    shadowColor: "rgba(249, 115, 22, 0.3)" 
  },
  { 
    emoji: "🤷‍♂️", 
    label: "Kinda hit or miss", 
    value: 2,
    gradient: ["#FACC15", "#EAB308"], 
    shadowColor: "rgba(234, 179, 8, 0.3)" 
  },
  { 
    emoji: "😇", 
    label: "I trust most of it", 
    value: 3,
    gradient: ["#34D399", "#10B981"], 
    shadowColor: "rgba(16, 185, 129, 0.3)" 
  },
];

export default function TrustScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { setTrustLevel, trustLevel } = useAppState();
  const [trustValue, setTrustValue] = useState<number | null>(trustLevel); // Load from stored state or null

  const handleContinue = async () => {
    if (trustValue !== null) {
      await setTrustLevel(trustValue);
      router.push("/onboarding/stats");
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.backButtonContainer}>
          <OnboardingBackButton goTo="/onboarding/auth" />
        </View>
        <View style={styles.content}>
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
                  fontFamily: "Inter_700Bold",
                  fontSize: theme.typography.subheading,
                },
              ]}
            >
              How much do you actually trust the stuff you see in your feed?
            </Text>

            <View style={styles.ratingContainer}>
              <EmojiRating 
                options={TRUST_OPTIONS}
                onChange={setTrustValue}
                initialValue={trustValue}
                placeholder="Select an option"
              />
            </View>

            <View style={styles.ctaContainer}>
              <OnboardingCTA
                label="Continue"
                onPress={handleContinue}
                variant="primary"
                disabled={trustValue === null}
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
    marginBottom: 32,
  },
  ratingContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  ctaContainer: {
    marginTop: 32,
    gap: 12,
  },
});

