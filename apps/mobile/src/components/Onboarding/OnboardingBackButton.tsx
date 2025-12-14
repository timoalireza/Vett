import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/use-theme";

interface OnboardingBackButtonProps {
  onPress?: () => void;
  goTo?: string;
}

export function OnboardingBackButton({ onPress, goTo }: OnboardingBackButtonProps) {
  const router = useRouter();
  const theme = useTheme();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (goTo) {
      router.push(goTo);
    } else {
      router.back();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.button,
        {
          width: 40,
          height: 40,
          borderRadius: theme.radii.pill,
          backgroundColor: theme.colors.surface + "80",
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
      ]}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
});

