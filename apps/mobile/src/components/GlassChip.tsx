import { ReactNode } from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "../hooks/use-theme";

interface GlassChipProps {
  label: string;
  icon?: ReactNode;
  gradientColors?: string[];
  style?: ViewStyle;
}

/**
 * Glass chip component for tags, categories, sources
 * Minimal, frosted glass with optional gradient accent
 */
export function GlassChip({ label, icon, gradientColors, style }: GlassChipProps) {
  const theme = useTheme();

  return (
    <BlurView
      intensity={theme.glass.blur.light}
      tint="dark"
      style={[
        styles.container,
        {
          borderRadius: theme.radii.pill,
          borderWidth: 1,
          borderColor: theme.colors.borderLight,
          backgroundColor: theme.colors.card
        },
        style
      ]}
    >
      {gradientColors && (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      )}
      <View style={styles.content}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <Text
          style={[
            styles.label,
            {
              color: theme.colors.textSecondary,
              fontSize: theme.typography.caption
            }
          ]}
        >
          {label}
        </Text>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center"
  },
  gradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  icon: {
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  label: {
    fontWeight: "500",
    letterSpacing: 0.2
  }
});

