import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "../../hooks/use-theme";

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  variant?: "dots" | "bar";
}

export function ProgressIndicator({
  currentStep,
  totalSteps,
  variant = "dots",
}: ProgressIndicatorProps) {
  const theme = useTheme();

  if (variant === "bar") {
    const progress = (currentStep + 1) / totalSteps;
    return (
      <View
        style={[
          styles.barContainer,
          {
            backgroundColor: theme.colors.border,
            borderRadius: theme.radii.pill,
            height: 4,
          },
        ]}
      >
        <View
          style={[
            styles.barFill,
            {
              backgroundColor: theme.colors.primary,
              width: `${progress * 100}%`,
              borderRadius: theme.radii.pill,
            },
          ]}
        />
      </View>
    );
  }

  return (
    <View style={styles.dotsContainer}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor:
                index === currentStep ? theme.colors.primary : theme.colors.border,
              width: index === currentStep ? 24 : 8,
              borderRadius: theme.radii.pill,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    height: 8,
    transition: "all 0.3s ease",
  },
  barContainer: {
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
  },
});

