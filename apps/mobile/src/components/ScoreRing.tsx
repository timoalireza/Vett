import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";

import { useTheme } from "../hooks/use-theme";
import { getScoreGradient } from "../utils/scoreColors";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ScoreRingProps {
  score: number;
  label?: string;
  size?: number;
  verdict?: string | null;
  scoreBand?: string | null;
}

export function ScoreRing({ score, label = "Vett Score", size = 140, verdict, scoreBand }: ScoreRingProps) {
  const theme = useTheme();
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);
  const gradientId = `ringGradient-${Math.round(score)}-${size}`;

  useEffect(() => {
    progress.value = withTiming(score / 100, { duration: 800 });
  }, [score, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value)
  }));

  // Use scoreBand for gradient color if available
  const { start, end } = getScoreGradient(score, verdict, scoreBand);

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center"
      }}
      accessible
      accessibilityLabel={`${label} ${score}`}
    >
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={start} />
            <Stop offset="100%" stopColor={end} />
          </SvgLinearGradient>
        </Defs>
        {/* Inactive track - dark charcoal */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={14}
          fill="transparent"
        />
        {/* Active track with outer glow */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={14}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={`${circumference}, ${circumference}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          opacity={1}
        />
      </Svg>
      <View
        style={{
          position: "absolute",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Text
          style={{
            color: "rgba(255, 255, 255, 0.5)",
            fontSize: 11,
            fontFamily: "Inter_500Medium",
            letterSpacing: 0.8,
            textTransform: "uppercase",
            marginBottom: 4
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 48,
            fontFamily: "Inter_700Bold",
            letterSpacing: -1
          }}
        >
          {score}
        </Text>
      </View>
    </View>
  );
}

