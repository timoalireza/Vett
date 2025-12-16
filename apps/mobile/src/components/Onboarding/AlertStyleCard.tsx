import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/use-theme";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface AlertStyleCardProps {
  icon: string;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}

export function AlertStyleCard({
  icon,
  title,
  description,
  selected,
  onPress,
}: AlertStyleCardProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        animatedStyle,
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          borderWidth: selected ? 2 : 1,
          borderRadius: theme.radii.lg,
        },
      ]}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.emoji}>{icon}</Text>
      </View>
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
        {title}
      </Text>
      <Text
        style={[
          styles.description,
          {
            color: theme.colors.textSecondary,
            fontFamily: "Inter_400Regular",
            fontSize: theme.typography.body,
          },
        ]}
      >
        {description}
      </Text>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 24,
    alignItems: "center",
    minHeight: 160,
    justifyContent: "center",
  },
  iconContainer: {
    marginBottom: 16,
  },
  emoji: {
    fontSize: 48,
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    textAlign: "center",
    lineHeight: 20,
  },
});

