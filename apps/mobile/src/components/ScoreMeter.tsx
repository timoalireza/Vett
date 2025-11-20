import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

import { useTheme } from "../hooks/use-theme";

interface ScoreMeterProps {
  score: number; // 0-100
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
  style?: ViewStyle;
}

/**
 * Radial or horizontal score meter with soft halo effect
 * Premium, minimal visualization
 */
export function ScoreMeter({ score, size = "medium", showLabel = true, style }: ScoreMeterProps) {
  const theme = useTheme();

  const sizeMap = {
    small: { width: 80, height: 80, fontSize: 14 },
    medium: { width: 120, height: 120, fontSize: 24 },
    large: { width: 160, height: 160, fontSize: 32 }
  };

  const dimensions = sizeMap[size];
  const percentage = Math.max(0, Math.min(100, score)) / 100;

  // Determine gradient colors based on score
  const getGradientColors = () => {
    if (score >= 75) {
      return [theme.colors.success, theme.colors.highlight];
    } else if (score >= 50) {
      return [theme.colors.warning, theme.colors.highlight];
    } else {
      return [theme.colors.danger, theme.colors.warning];
    }
  };

  const gradientColors = getGradientColors();

  return (
    <View style={[styles.container, { width: dimensions.width, height: dimensions.height }, style]}>
      {/* Halo effect */}
      <View
        style={[
          styles.halo,
          {
            width: dimensions.width * 1.2,
            height: dimensions.height * 1.2,
            borderRadius: (dimensions.width * 1.2) / 2,
            backgroundColor: gradientColors[0],
            opacity: 0.15
          }
        ]}
      />
      
      {/* Glass container */}
      <BlurView
        intensity={theme.glass.blur.medium}
        tint="dark"
        style={[
          styles.glass,
          {
            width: dimensions.width,
            height: dimensions.height,
            borderRadius: dimensions.width / 2,
            borderWidth: 1,
            borderColor: theme.colors.border
          }
        ]}
      >
        {/* Progress ring */}
        <View
          style={[
            styles.progressRing,
            {
              width: dimensions.width - 8,
              height: dimensions.height - 8,
              borderRadius: (dimensions.width - 8) / 2
            }
          ]}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.progressFill,
              {
                width: dimensions.width - 8,
                height: dimensions.height - 8,
                borderRadius: (dimensions.width - 8) / 2,
                transform: [{ rotate: `${percentage * 360 - 90}deg` }]
              }
            ]}
          />
        </View>

        {/* Center content */}
        <View style={styles.center}>
          {showLabel && (
            <Text
              style={[
                styles.score,
                {
                  fontSize: dimensions.fontSize,
                  color: theme.colors.text,
                  fontWeight: "600"
                }
              ]}
            >
              {Math.round(score)}
            </Text>
          )}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative"
  },
  halo: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -1 }, { translateY: -1 }]
  },
  glass: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.08)"
  },
  progressRing: {
    position: "absolute",
    borderWidth: 3,
    borderColor: "transparent",
    borderTopColor: "currentColor"
  },
  progressFill: {
    position: "absolute"
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10
  },
  score: {
    letterSpacing: -0.5
  }
});

