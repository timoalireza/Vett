import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";
import { OnboardingCTA } from "../../src/components/Onboarding/OnboardingCTA";
import { ProgressIndicator } from "../../src/components/Onboarding/ProgressIndicator";
import { OnboardingBackButton } from "../../src/components/Onboarding/OnboardingBackButton";
import { useTheme } from "../../src/hooks/use-theme";
import { useAppState } from "../../src/state/app-state";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const TRUST_OPTIONS = [
  { emoji: "😇", label: "I trust most of it", value: 3 },
  { emoji: "🤷‍♂️", label: "Kinda hit or miss", value: 2 },
  { emoji: "😬", label: "Not really sure", value: 1 },
  { emoji: "🚩", label: "I trust nothing", value: 0 },
];

export default function TrustScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { setTrustLevel, trustLevel } = useAppState();
  const [trustValue, setTrustValue] = useState<number | null>(trustLevel); // Load from stored state or null

  const handleContinue = async () => {
    if (trustValue !== null) {
      await setTrustLevel(trustValue);
      router.push("/onboarding/auth");
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <ProgressIndicator currentStep={1} totalSteps={7} variant="bar" />
          </View>
        </View>
        <View style={styles.backButtonContainer}>
          <OnboardingBackButton goTo="/onboarding/welcome" />
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
                  fontFamily: "Inter_600SemiBold",
                  fontSize: theme.typography.subheading,
                },
              ]}
            >
              How much do you actually trust the stuff you see in your feed?
            </Text>

            <View style={styles.optionsContainer}>
              {TRUST_OPTIONS.map((option) => (
                <TrustOption
                  key={option.value}
                  emoji={option.emoji}
                  label={option.label}
                  selected={trustValue === option.value}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTrustValue(option.value);
                  }}
                  theme={theme}
                />
              ))}
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

interface TrustOptionProps {
  emoji: string;
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: any;
}

function TrustOption({ emoji, label, selected, onPress, theme }: TrustOptionProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        animatedStyle,
        styles.option,
        {
          backgroundColor: selected
            ? theme.colors.primary
            : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          borderWidth: selected ? 2 : 1,
          borderRadius: theme.radii.md,
        },
      ]}
      activeOpacity={0.8}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text
        style={[
          styles.optionLabel,
          {
            color: selected ? "#000000" : theme.colors.text,
            fontFamily: selected ? "Inter_500Medium" : "Inter_400Regular",
            fontSize: theme.typography.body,
          },
        ]}
      >
        {label}
      </Text>
    </AnimatedTouchable>
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
    justifyContent: "center",
  },
  card: {
    width: "100%",
  },
  title: {
    textAlign: "center",
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 12,
    marginVertical: 20,
  },
  option: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emoji: {
    fontSize: 32,
  },
  optionLabel: {
    textAlign: "center",
    flex: 1,
  },
  ctaContainer: {
    marginTop: 32,
    gap: 12,
  },
});

