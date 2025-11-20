import { ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { View, StyleSheet } from "react-native";

import { useTheme } from "../hooks/use-theme";

interface GradientBackgroundProps {
  children: ReactNode;
}

/**
 * Premium atmospheric gradient background
 * Soft, desaturated gradients - almost imperceptible, creating depth
 */
export function GradientBackground({ children }: GradientBackgroundProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {/* Base deep background */}
      <LinearGradient
        colors={[theme.colors.background, theme.colors.backgroundSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Subtle atmospheric overlay - cool blues */}
      <LinearGradient
        colors={[
          "rgba(90, 143, 212, 0.08)",
          "rgba(138, 127, 184, 0.06)",
          "rgba(107, 168, 184, 0.04)"
        ]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Additional depth layer - very subtle */}
      <LinearGradient
        colors={[
          "rgba(138, 127, 184, 0.03)",
          "transparent",
          "rgba(90, 143, 212, 0.02)"
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});

