import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, AccessibilityInfo } from "react-native";
import { useTheme } from "../../hooks/use-theme";

interface OnboardingCTAProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  loading?: boolean;
}

export function OnboardingCTA({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
}: OnboardingCTAProps) {
  const theme = useTheme();

  const getButtonStyle = () => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: theme.colors.primary,
          borderRadius: theme.radii.pill,
        };
      case "secondary":
        return {
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.pill,
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
        };
      default:
        return {};
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case "primary":
        return {
          color: "#000000",
          fontFamily: "Inter_500Medium",
        };
      case "secondary":
        return {
          color: theme.colors.text,
          fontFamily: "Inter_500Medium",
        };
      case "ghost":
        return {
          color: theme.colors.textSecondary,
          fontFamily: "Inter_400Regular",
        };
      default:
        return {};
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        getButtonStyle(),
        {
          opacity: disabled || loading ? 0.5 : 1,
          paddingVertical: theme.spacing(2),
          paddingHorizontal: theme.spacing(4),
        },
      ]}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
      accessibilityHint={loading ? "Loading" : undefined}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? "#000000" : theme.colors.text}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.text,
            getTextStyle(),
            {
              fontSize: theme.typography.body,
            },
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  text: {
    textAlign: "center",
  },
});

