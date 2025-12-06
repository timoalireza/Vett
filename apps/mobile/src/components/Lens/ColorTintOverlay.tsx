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
  // Glow Dimensions: 100% of size (matched to LensMotif)
  const glowSize = size * 1.0;
  const glowRadius = glowSize / 2;

  const opacity = useSharedValue(0);

  useEffect(() => {
    // Reset
    opacity.value = 0;
    // Animate fade in after ring completes (approx 1000ms + 600ms delay = 1600ms)
    opacity.value = withDelay(
      1600,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) })
    );
  }, [score, opacity]);

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
          width: glowSize,
          height: glowSize,
          borderRadius: glowRadius,
          alignItems: "center",
          justifyContent: "center",
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <Svg height={glowSize} width={glowSize}>
        <Defs>
          <RadialGradient
            id="tintGradient"
            cx="54%"
            cy="56%"
            rx="50%"
            ry="50%"
            fx="54%"
            fy="56%"
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
