import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Circle } from "react-native-svg";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from "react-native-reanimated";

interface ColorTintOverlayProps {
  score: number;
  size?: number;
}

export const ColorTintOverlay: React.FC<ColorTintOverlayProps> = ({
  score,
  size = 200,
}) => {
  // Matches the glow size from LensMotif (0.65 of size)
  const glowDiameter = size * 0.65;
  const glowRadius = glowDiameter / 2;

  const opacity = useSharedValue(0);

  useEffect(() => {
    // Reset
    opacity.value = 0;
    // Animate fade in after ring completes - delay 1200ms from transition start (600ms lens + 400ms ring delay + 200ms buffer)
    // Target opacity: 10-15% (0.1-0.15), using 0.75 multiplier on gradient stops to achieve ~15% at center
    opacity.value = withDelay(
      1200,
      withTiming(0.75, { duration: 400, easing: Easing.out(Easing.ease) })
    );
  }, [score]); // Only include actual dependencies, not shared values

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Determine color based on score
  let scoreColor = "#EF4444"; // Red
  if (score >= 70) {
    scoreColor = "#22C55E"; // Green
  } else if (score >= 45) {
    scoreColor = "#F59E0B"; // Amber
  }

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: glowDiameter,
          height: glowDiameter,
          borderRadius: glowRadius,
          alignItems: "center",
          justifyContent: "center",
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <Svg height={glowDiameter} width={glowDiameter}>
        <Defs>
          <RadialGradient
            id="tintGradient"
            cx="50%"
            cy="50%"
            rx="50%"
            ry="50%"
            fx="50%"
            fy="50%"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor={scoreColor} stopOpacity="0.2" />
            <Stop offset="40%" stopColor={scoreColor} stopOpacity="0.08" />
            <Stop offset="70%" stopColor={scoreColor} stopOpacity="0" />
            <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={glowRadius} cy={glowRadius} r={glowRadius} fill="url(#tintGradient)" />
      </Svg>
    </Animated.View>
  );
};
