import React, { useState, useEffect } from "react";
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
  interpolate,
  useDerivedValue,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { GradientBackground } from "../../src/components/GradientBackground";
import { OnboardingBackButton } from "../../src/components/Onboarding/OnboardingBackButton";
import { useTheme } from "../../src/hooks/use-theme";
import { useAppState } from "../../src/state/app-state";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Trust options with enhanced visual data
const TRUST_OPTIONS = [
  { 
    emoji: "🚩", 
    label: "I trust nothing", 
    value: 0,
    gradient: ["#FF6B6B", "#EE5A5A"] as const,
    glowColor: "rgba(255, 107, 107, 0.4)",
    bgGlow: "rgba(255, 107, 107, 0.08)",
  },
  { 
    emoji: "😬", 
    label: "Not really sure", 
    value: 1,
    gradient: ["#FFA94D", "#FF922B"] as const,
    glowColor: "rgba(255, 169, 77, 0.4)",
    bgGlow: "rgba(255, 169, 77, 0.08)",
  },
  { 
    emoji: "🤷‍♂️", 
    label: "Kinda hit or miss", 
    value: 2,
    gradient: ["#FFE066", "#FFD43B"] as const,
    glowColor: "rgba(255, 224, 102, 0.4)",
    bgGlow: "rgba(255, 224, 102, 0.08)",
  },
  { 
    emoji: "😇", 
    label: "I trust most of it", 
    value: 3,
    gradient: ["#69DB7C", "#51CF66"] as const,
    glowColor: "rgba(105, 219, 124, 0.4)",
    bgGlow: "rgba(105, 219, 124, 0.08)",
  },
];

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TrustOptionProps {
  option: typeof TRUST_OPTIONS[0];
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}

function TrustOption({ option, isSelected, onSelect, index }: TrustOptionProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const bgOpacity = useSharedValue(0);
  
  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.08 : 1, { damping: 15, stiffness: 200 });
    glowOpacity.value = withTiming(isSelected ? 1 : 0, { duration: 300 });
    bgOpacity.value = withTiming(isSelected ? 1 : 0, { duration: 300 });
  }, [isSelected]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const bgGlowStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value * 0.6,
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect();
  };

  return (
    <Animated.View
      entering={FadeInUp.duration(500).delay(300 + index * 100)}
      style={[styles.optionWrapper, containerStyle]}
    >
      {/* Background glow effect */}
      <Animated.View 
        style={[
          styles.optionBgGlow,
          { backgroundColor: option.bgGlow },
          bgGlowStyle,
        ]} 
      />
      
      <Animated.View
        style={[
          styles.optionContainer,
          {
            borderColor: isSelected ? option.gradient[0] : "rgba(255, 255, 255, 0.08)",
            backgroundColor: isSelected ? "rgba(255, 255, 255, 0.06)" : "rgba(255, 255, 255, 0.03)",
          },
        ]}
      >
        <AnimatedPressable
          onPress={handlePress}
          style={styles.optionPressable}
        >
          {/* Gradient glow behind emoji when selected */}
          <Animated.View style={[styles.emojiGlowContainer, glowStyle]}>
            <LinearGradient
              colors={option.gradient}
              style={styles.emojiGlow}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>
          
          {/* Emoji container with gradient bg when selected */}
          <View style={styles.emojiWrapper}>
            {isSelected && (
              <LinearGradient
                colors={option.gradient}
                style={styles.selectedEmojiBg}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            )}
            <Text style={styles.emoji}>{option.emoji}</Text>
          </View>
          
          {/* Label */}
          <Text
            style={[
              styles.optionLabel,
              {
                color: isSelected ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)",
                fontFamily: isSelected ? "Inter_600SemiBold" : "Inter_400Regular",
              },
            ]}
          >
            {option.label}
          </Text>
        </AnimatedPressable>
      </Animated.View>
    </Animated.View>
  );
}

export default function TrustScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { setTrustLevel, trustLevel } = useAppState();
  const [trustValue, setTrustValue] = useState<number | null>(trustLevel);
  
  // Animation values
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);
  
  useEffect(() => {
    // Animate button in after options are shown
    buttonOpacity.value = withDelay(800, withTiming(1, { duration: 500 }));
    buttonTranslateY.value = withDelay(800, withSpring(0, { damping: 20 }));
  }, []);

  const handleSelect = (value: number) => {
    setTrustValue(value);
  };

  const handleContinue = async () => {
    if (trustValue !== null) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await setTrustLevel(trustValue);
      router.push("/onboarding/stats");
    }
  };

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  const isButtonEnabled = trustValue !== null;

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Back button */}
        <Animated.View 
          entering={FadeIn.duration(400).delay(100)}
          style={styles.backButtonContainer}
        >
          <OnboardingBackButton goTo="/onboarding/auth" />
        </Animated.View>

        {/* Main content */}
        <View style={styles.content}>
          {/* Hero section */}
          <View style={styles.heroSection}>
            <Animated.Text
              entering={FadeInDown.duration(600).delay(200)}
              style={styles.title}
            >
              How much do you{"\n"}
              <Text style={styles.titleAccent}>actually trust</Text>
              {"\n"}what you see online?
            </Animated.Text>
            
            <Animated.Text
              entering={FadeInDown.duration(500).delay(350)}
              style={styles.subtitle}
            >
              This helps us personalize your experience
            </Animated.Text>
          </View>

          {/* Options grid */}
          <View style={styles.optionsGrid}>
            {TRUST_OPTIONS.map((option, index) => (
              <TrustOption
                key={option.value}
                option={option}
                isSelected={trustValue === option.value}
                onSelect={() => handleSelect(option.value)}
                index={index}
              />
            ))}
          </View>
        </View>

        {/* Continue button - fixed at bottom */}
        <Animated.View 
          style={[
            styles.ctaContainer, 
            { paddingBottom: insets.bottom + 20 },
            buttonStyle,
          ]}
        >
          <AnimatedPressable
            onPress={handleContinue}
            disabled={!isButtonEnabled}
            style={[
              styles.continueButton,
              {
                backgroundColor: isButtonEnabled ? "#FFFFFF" : "rgba(255, 255, 255, 0.1)",
              },
            ]}
          >
            <Text
              style={[
                styles.continueButtonText,
                {
                  color: isButtonEnabled ? "#000000" : "rgba(255, 255, 255, 0.3)",
                },
              ]}
            >
              Continue
            </Text>
          </AnimatedPressable>
          
          {/* Subtle hint */}
          {!isButtonEnabled && (
            <Animated.Text
              entering={FadeIn.duration(300).delay(1000)}
              style={styles.hint}
            >
              Select an option to continue
            </Animated.Text>
          )}
        </Animated.View>
      </View>
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
    paddingBottom: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  heroSection: {
    marginTop: 20,
    marginBottom: 40,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    color: "#FFFFFF",
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  titleAccent: {
    color: "#69DB7C",
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 16,
  },
  optionsGrid: {
    gap: 12,
  },
  optionWrapper: {
    position: "relative",
  },
  optionBgGlow: {
    position: "absolute",
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 40,
    opacity: 0,
  },
  optionContainer: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  optionPressable: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 16,
  },
  emojiGlowContainer: {
    position: "absolute",
    left: 16,
    width: 52,
    height: 52,
    borderRadius: 16,
    opacity: 0,
  },
  emojiGlow: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    opacity: 0.3,
  },
  emojiWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    overflow: "hidden",
  },
  selectedEmojiBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  emoji: {
    fontSize: 28,
    textAlign: "center",
  },
  optionLabel: {
    fontSize: 16,
    flex: 1,
  },
  ctaContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    alignItems: "center",
  },
  continueButton: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
  },
  hint: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.35)",
    marginTop: 12,
  },
});
