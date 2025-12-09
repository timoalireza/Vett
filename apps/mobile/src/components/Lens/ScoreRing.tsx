import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  size = 200,
  strokeWidth = 4,
}) => {
  // Sphere matches LensMotif size (0.65 of actual size)
  const sphereSize = size * 0.65;
  const radius = (sphereSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = useSharedValue(0);

  useEffect(() => {
    // Reset progress
    progress.value = 0;
    // Animate to score - delay 400ms after lens transition completes
    progress.value = withDelay(
      400,
      withTiming(score / 100, {
        duration: 1000,
        easing: Easing.out(Easing.ease),
      })
    );
  }, [score]); // Only include actual dependencies, not shared values

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  // Determine color based on score
  let color = "#EF4444"; // Red (<45)
  if (score >= 70) {
    color = "#22C55E"; // Green (Verified)
  } else if (score >= 45) {
    color = "#F59E0B"; // Amber (Uncertain)
  }

  // Calculate position to center the ring relative to the Lens container
  // The Lens container is `size` x `size`.
  // The ring needs to be centered in that container.
  // SVG size should be `sphereSize` (plus a bit for stroke).
  // Actually, easiest is to make SVG full `size` and center the circle.
  
  return (
    <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
      <Svg
        width={sphereSize}
        height={sphereSize}
        style={{ transform: [{ rotate: "-90deg" }] }} // Start from 12 o'clock
      >
        {/* Background Circle (optional, maybe faint track?) */}
        {/* <Circle
          cx={sphereSize / 2}
          cy={sphereSize / 2}
          r={radius}
          stroke="#1A1A1A"
          strokeWidth={strokeWidth}
          fill="none"
        /> */}
        
        <AnimatedCircle
          cx={sphereSize / 2}
          cy={sphereSize / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
        />
      </Svg>
    </View>
  );
};

