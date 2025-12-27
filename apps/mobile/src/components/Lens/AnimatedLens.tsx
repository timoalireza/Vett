import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Stop, Circle, Pattern, Rect, LinearGradient } from "react-native-svg";

interface AnimatedLensProps {
  size?: number;
  claimText?: string;
}

export const AnimatedLens: React.FC<AnimatedLensProps> = ({ size = 240, claimText }) => {
  const id = React.useId();
  const pulseAnim = useSharedValue(1);
  const rotationAnim = useSharedValue(0);
  const gradientXAnim = useSharedValue(0);
  const gradientYAnim = useSharedValue(0);
  const sphereSize = size * 0.65;
  const sphereRadius = sphereSize / 2;

  useEffect(() => {
    // Pulse animation: scale 1.0 → 1.15 → 1.0, opacity 0.4 → 0.6 → 0.4
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Rotating gradient animation - creates loading circle effect
    // Rotates continuously to create dynamic loading appearance
    rotationAnim.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );

    // Animate gradient center position in a circle
    const animateGradient = () => {
      gradientXAnim.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(-1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
      gradientYAnim.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(-1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    };
    animateGradient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array - animations should run once on mount, shared values are stable references

  const animatedGlowStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseAnim.value }],
      opacity: interpolate(pulseAnim.value, [1.0, 1.15], [0.4, 0.6]),
    };
  });

  const animatedGradientStyle = useAnimatedStyle(() => {
    const rotation = rotationAnim.value;
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* Animated Glow */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: sphereSize,
            height: sphereSize,
            borderRadius: sphereSize / 2,
            left: (size - sphereSize) / 2,
            top: (size - sphereSize) / 2,
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            shadowColor: '#FFFFFF',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 50,
            elevation: 25,
            overflow: 'hidden',
          },
          animatedGlowStyle,
        ]}
      >
        {/* Subtle noise overlay using SVG pattern */}
        <Svg width={sphereSize} height={sphereSize} style={StyleSheet.absoluteFill}>
          <Defs>
            <Pattern id={`noisePatternAnim-${id}`} x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
              <Circle cx="1" cy="1" r="0.5" fill="rgba(255,255,255,0.03)" />
              <Circle cx="3" cy="3" r="0.5" fill="rgba(255,255,255,0.03)" />
              <Circle cx="1" cy="3" r="0.3" fill="rgba(0,0,0,0.05)" />
              <Circle cx="3" cy="1" r="0.3" fill="rgba(0,0,0,0.05)" />
            </Pattern>
          </Defs>
          <Rect width={sphereSize} height={sphereSize} fill={`url(#noisePatternAnim-${id})`} opacity={0.4} />
        </Svg>
      </Animated.View>

      {/* Base sphere with gradient */}
      <View style={{
        position: 'absolute',
        width: sphereSize,
        height: sphereSize,
        left: (size - sphereSize) / 2,
        top: (size - sphereSize) / 2,
      }}>
        <Svg 
          width={sphereSize} 
          height={sphereSize}
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <RadialGradient
              id={`sphereGradAnim-${id}`}
              cx="35%"
              cy="50%"
              rx="90%"
              ry="90%"
            >
              <Stop offset="0%" stopColor="#0a0a0a" />
              <Stop offset="20%" stopColor="#1a1a1a" />
              <Stop offset="40%" stopColor="#3a3a3a" />
              <Stop offset="60%" stopColor="#707070" />
              <Stop offset="80%" stopColor="#b0b0b0" />
              <Stop offset="100%" stopColor="#f5f5f5" />
            </RadialGradient>
            {/* Rotating loading gradient overlay */}
            <LinearGradient
              id={`loadingGradAnim-${id}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <Stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
              <Stop offset="50%" stopColor="rgba(255,255,255,0.05)" />
              <Stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
            </LinearGradient>
          </Defs>
          <Circle
            cx={sphereRadius}
            cy={sphereRadius}
            r={sphereRadius}
            fill={`url(#sphereGradAnim-${id})`}
          />
        </Svg>
      </View>

      {/* Rotating loading overlay - creates dynamic loading effect */}
      <Animated.View 
        style={[
          {
            position: 'absolute',
            width: sphereSize,
            height: sphereSize,
            left: (size - sphereSize) / 2,
            top: (size - sphereSize) / 2,
            borderRadius: sphereSize / 2,
            overflow: 'hidden',
          },
          animatedGradientStyle,
        ]}
      >
        <Svg 
          width={sphereSize} 
          height={sphereSize}
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            {/* Rotating radial gradient for loading effect - center moves */}
            <RadialGradient
              id={`rotatingGradAnim-${id}`}
              cx="50%"
              cy="50%"
              r="60%"
            >
              <Stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
              <Stop offset="40%" stopColor="rgba(255,255,255,0.2)" />
              <Stop offset="70%" stopColor="rgba(255,255,255,0.05)" />
              <Stop offset="100%" stopColor="transparent" />
            </RadialGradient>
          </Defs>
          {/* Rotating overlay - creates sweeping effect */}
          <Circle 
            cx={sphereRadius} 
            cy={sphereRadius} 
            r={sphereRadius} 
            fill={`url(#rotatingGradAnim-${id})`} 
            opacity={0.9}
          />
        </Svg>
      </Animated.View>

      {/* Claim text overlay during loading */}
      {claimText ? (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
        }}>
          <Text 
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 14,
              color: '#FFFFFF',
              textAlign: 'center',
              paddingHorizontal: 32,
              maxWidth: sphereSize * 0.85,
              textShadowColor: 'rgba(0, 0, 0, 0.5)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}
            // Never truncate: auto-scale so the claim always fits inside the lens.
            adjustsFontSizeToFit
            minimumFontScale={0.05}
            numberOfLines={10}
            allowFontScaling={false}
            ellipsizeMode="clip"
          >
            {claimText}
          </Text>
        </View>
      ) : null}
    </View>
  );
};
