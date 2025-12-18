import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring, 
  runOnJS,
  useDerivedValue,
  SharedValue
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../hooks/use-theme";

interface EmojiItem {
  emoji: string;
  label: string;
  value: number;
  gradient: string[];
  shadowColor: string;
}

interface EmojiRatingProps {
  options?: EmojiItem[];
  onChange?: (value: number) => void;
  initialValue?: number | null;
  className?: string;
  placeholder?: string;
}

const defaultRatingData: EmojiItem[] = [
  { emoji: "😔", label: "Terrible", value: 1, gradient: ["#F87171", "#EF4444"], shadowColor: "rgba(239, 68, 68, 0.3)" },
  { emoji: "😕", label: "Poor", value: 2, gradient: ["#FB923C", "#F97316"], shadowColor: "rgba(249, 115, 22, 0.3)" },
  { emoji: "😐", label: "Okay", value: 3, gradient: ["#FACC15", "#EAB308"], shadowColor: "rgba(234, 179, 8, 0.3)" },
  { emoji: "🙂", label: "Good", value: 4, gradient: ["#A3E635", "#84CC16"], shadowColor: "rgba(132, 204, 22, 0.3)" },
  { emoji: "😍", label: "Amazing", value: 5, gradient: ["#34D399", "#10B981"], shadowColor: "rgba(16, 185, 129, 0.3)" },
];

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function EmojiRating({ 
  options = defaultRatingData, 
  onChange, 
  initialValue = null,
  placeholder = "Rate us"
}: EmojiRatingProps) {
  const theme = useTheme();
  // Using SharedValue to drive animations without re-renders
  // -1 indicates no selection (mapped from null)
  const activeValueSV = useSharedValue(initialValue ?? -1);

  const handlePress = (value: number) => {
    // Update SharedValue immediately for UI thread animations
    activeValueSV.value = value;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Call onChange directly (state updates in parent will cause re-render but animations are already handled)
    if (onChange) {
      onChange(value);
    }
  };

  return (
    <View style={styles.container}>
      {/* Emoji Buttons Row */}
      <View style={styles.emojiRow}>
        {options.map((item) => (
          <EmojiButton 
            key={item.value}
            item={item}
            activeValueSV={activeValueSV}
            onPress={() => handlePress(item.value)}
            theme={theme}
          />
        ))}
      </View>

      {/* Label Container */}
      <View style={styles.labelContainer}>
        {/* Placeholder Label */}
        <AnimatedLabel 
          text={placeholder} 
          targetValue={-1} // Placeholder is active when value is -1
          activeValueSV={activeValueSV}
          isPlaceholder={true}
          theme={theme}
        />

        {/* Dynamic Labels */}
        {options.map((item) => (
          <AnimatedLabel 
            key={item.value}
            text={item.label}
            targetValue={item.value}
            activeValueSV={activeValueSV}
            isPlaceholder={false}
            theme={theme}
          />
        ))}
      </View>
    </View>
  );
}

function EmojiButton({ 
  item, 
  activeValueSV, 
  onPress,
  theme
}: { 
  item: EmojiItem; 
  activeValueSV: SharedValue<number>; 
  onPress: () => void;
  theme: any;
}) {
  // Drive animations purely on UI thread
  const isActive = useDerivedValue(() => {
    return activeValueSV.value === item.value;
  });

  const scale = useDerivedValue(() => {
    return withSpring(isActive.value ? 1.15 : 1, { damping: 15 });
  });

  const opacity = useDerivedValue(() => {
    return withTiming(isActive.value ? 1 : 0.4, { duration: 300 });
  });

  const bgOpacity = useDerivedValue(() => {
    return withTiming(isActive.value ? 1 : 0, { duration: 300 });
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  return (
    <AnimatedTouchable
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.button, animatedStyle]}
    >
      <View style={styles.emojiContainer}>
        {/* Background Glow/Gradient (only visible when active) */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.activeBackground, bgStyle]}>
           <LinearGradient
            colors={item.gradient}
            style={[StyleSheet.absoluteFill, styles.gradientRadius]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          {/* Memoize static view if possible, or keep simple */}
          <View style={[styles.shadow, { shadowColor: item.shadowColor, backgroundColor: item.shadowColor }]} />
        </Animated.View>

        {/* Emoji Text */}
        <Text style={styles.emoji}>{item.emoji}</Text>
      </View>
    </AnimatedTouchable>
  );
}

function AnimatedLabel({ 
  text, 
  targetValue,
  activeValueSV, 
  isPlaceholder,
  theme
}: { 
  text: string; 
  targetValue: number;
  activeValueSV: SharedValue<number>;
  isPlaceholder: boolean;
  theme: any;
}) {
  const isVisible = useDerivedValue(() => {
    return activeValueSV.value === targetValue;
  });

  const animOpacity = useDerivedValue(() => {
    return withTiming(isVisible.value ? 1 : 0, { duration: isVisible.value ? 300 : 200 });
  });

  const animScale = useDerivedValue(() => {
    return withSpring(isVisible.value ? 1 : 0.95, { damping: 15 });
  });

  const animTranslateY = useDerivedValue(() => {
    return withSpring(isVisible.value ? 0 : 5, { damping: 15 });
  });

  const style = useAnimatedStyle(() => ({
    opacity: animOpacity.value,
    transform: [
      { scale: animScale.value },
      { translateY: animTranslateY.value }
    ]
  }));

  return (
    <Animated.View style={[styles.labelWrapper, style]} pointerEvents="none">
      <Text 
        style={[
          styles.labelText, 
          { 
            color: isPlaceholder ? theme.colors.textSecondary : theme.colors.text,
            fontFamily: isPlaceholder ? "Inter_500Medium" : "Inter_600SemiBold",
            fontSize: isPlaceholder ? 14 : 16,
          }
        ]}
      >
        {text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 24,
    width: "100%",
  },
  emojiRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
  emojiContainer: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    position: "relative",
  },
  activeBackground: {
    borderRadius: 16,
    overflow: "visible", // For shadow
  },
  gradientRadius: {
    borderRadius: 16,
  },
  shadow: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    height: 40,
    borderRadius: 20,
    zIndex: -1,
    opacity: 0.6,
    // Standard shadow props for glow effect
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  emoji: {
    fontSize: 28,
    textAlign: "center",
    zIndex: 1, // Ensure emoji is above gradient
  },
  labelContainer: {
    height: 30,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  labelWrapper: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  labelText: {
    textAlign: "center",
  }
});
