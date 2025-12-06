import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Stop, Circle } from "react-native-svg";

interface AnimatedLensProps {
  size?: number;
}

export const AnimatedLens: React.FC<AnimatedLensProps> = ({ size = 240 }) => {
  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [pulseAnim]);

  // Dimensions matching LensMotif
  const glowSize = size * 1.0;
  const glowRadius = glowSize / 2;
  const sphereSize = size * 0.62;
  const sphereRadius = sphereSize / 2;

  const animatedGlowStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseAnim.value }],
      // Interpolate opacity slightly to create breathing effect
      opacity: interpolate(pulseAnim.value, [1, 1.1], [1, 0.8]), 
    };
  });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* Animated Glow */}
      <Animated.View
        style={[
          {
            position: "absolute",
            width: glowSize,
            height: glowSize,
            alignItems: "center",
            justifyContent: "center",
            // Shadows for iOS
            shadowColor: "#FFFFFF",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            // Elevation for Android
            elevation: 10,
          },
          animatedGlowStyle,
        ]}
      >
        <Svg height={glowSize} width={glowSize}>
          <Defs>
            <RadialGradient
              id="glowGradientAnim"
              cx="54%"
              cy="56%"
              rx="50%"
              ry="50%"
              fx="54%"
              fy="56%"
              gradientUnits="userSpaceOnUse"
            >
              {/* Matched to LensMotif new values */}
              <Stop offset="0%" stopColor="rgba(170,170,170,0.7)" stopOpacity="0.7" />
              <Stop offset="35%" stopColor="rgba(130,130,130,0.4)" stopOpacity="0.4" />
              <Stop offset="55%" stopColor="rgba(90,90,90,0.2)" stopOpacity="0.2" />
              <Stop offset="75%" stopColor="rgba(50,50,50,0.1)" stopOpacity="0.1" />
              <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={glowRadius} cy={glowRadius} r={glowRadius} fill="url(#glowGradientAnim)" />
        </Svg>
      </Animated.View>

      {/* Static Sphere */}
      <View
        style={{
          position: "absolute",
          width: sphereSize,
          height: sphereSize,
          borderRadius: sphereRadius,
          overflow: "hidden",
        }}
      >
        <Svg height={sphereSize} width={sphereSize}>
          <Defs>
            <RadialGradient
              id="sphereGradientAnim"
              cx="38%"
              cy="50%"
              rx="50%"
              ry="50%"
              fx="38%"
              fy="50%"
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0%" stopColor="rgba(0,0,0,1)" />
              <Stop offset="30%" stopColor="rgba(15,15,15,1)" />
              <Stop offset="47%" stopColor="rgba(35,35,35,1)" />
              <Stop offset="63%" stopColor="rgba(70,70,70,1)" />
              <Stop offset="77%" stopColor="rgba(115,115,115,1)" />
              <Stop offset="90%" stopColor="rgba(165,165,165,1)" />
              <Stop offset="100%" stopColor="rgba(210,210,210,1)" />
            </RadialGradient>
          </Defs>
          <Circle cx={sphereRadius} cy={sphereRadius} r={sphereRadius} fill="url(#sphereGradientAnim)" />
        </Svg>
      </View>
    </View>
  );
};
