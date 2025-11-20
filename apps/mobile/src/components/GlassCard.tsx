import { ReactNode } from "react";
import { ViewStyle, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "../hooks/use-theme";

interface GlassCardProps {
  children: ReactNode;
  intensity?: "light" | "medium" | "heavy";
  style?: ViewStyle;
  radius?: keyof typeof import("../theme").theme.radii;
  gradientAccent?: {
    colors: string[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
  };
  showBorder?: boolean;
}

export function GlassCard({
  children,
  intensity = "medium",
  style,
  radius = "md",
  gradientAccent,
  showBorder = true
}: GlassCardProps) {
  const theme = useTheme();

  const intensityMap = {
    light: theme.glass.blur.light,
    medium: theme.glass.blur.medium,
    heavy: theme.glass.blur.heavy
  };

  const blurIntensity = intensityMap[intensity];

  return (
    <BlurView
      intensity={blurIntensity}
      tint="dark"
      style={[
        styles.container,
        {
          borderRadius: theme.radii[radius],
          borderWidth: showBorder ? 1 : 0,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          ...theme.shadows.md
        },
        style
      ]}
    >
      {gradientAccent && (
        <LinearGradient
          colors={gradientAccent.colors}
          start={gradientAccent.start || { x: 0, y: 0 }}
          end={gradientAccent.end || { x: 1, y: 0 }}
          style={styles.gradientAccent}
        />
      )}
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden"
  },
  gradientAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.6
  }
});

