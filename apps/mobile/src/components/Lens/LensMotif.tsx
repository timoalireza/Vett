import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Circle, Rect } from "react-native-svg";

interface LensMotifProps {
  size?: number;
  style?: ViewStyle;
}

export const LensMotif: React.FC<LensMotifProps> = ({ size = 200, style }) => {
  // Glow Dimensions: 100% of size (increased from 95% for more presence)
  const glowSize = size * 1.0;
  const glowRadius = glowSize / 2;

  // Sphere Dimensions: 62% of size
  const sphereSize = size * 0.62;
  const sphereRadius = sphereSize / 2;

  return (
    <View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
      {/* Glow BEHIND the sphere */}
      <View
        style={{
          position: "absolute",
          width: glowSize,
          height: glowSize,
          borderRadius: glowRadius,
          // Add native shadow for extra glow on iOS
          shadowColor: "#FFFFFF",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
          // Elevation for Android (limited control over color, but adds depth)
          elevation: 10,
        }}
      >
        <Svg height={glowSize} width={glowSize}>
          <Defs>
            <RadialGradient
              id="glowGradient"
              cx="54%"
              cy="56%"
              rx="50%"
              ry="50%"
              fx="54%"
              fy="56%"
              gradientUnits="userSpaceOnUse"
            >
              {/* Increased opacity for visibility */}
              <Stop offset="0%" stopColor="rgba(170,170,170,0.7)" stopOpacity="0.7" />
              <Stop offset="35%" stopColor="rgba(130,130,130,0.4)" stopOpacity="0.4" />
              <Stop offset="55%" stopColor="rgba(90,90,90,0.2)" stopOpacity="0.2" />
              <Stop offset="75%" stopColor="rgba(50,50,50,0.1)" stopOpacity="0.1" />
              <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={glowRadius} cy={glowRadius} r={glowRadius} fill="url(#glowGradient)" />
        </Svg>
      </View>

      {/* The solid sphere */}
      <View
        style={{
          position: "absolute",
          width: sphereSize,
          height: sphereSize,
          borderRadius: sphereRadius,
          overflow: "hidden", // Ensure gradient stays within circle
        }}
      >
        <Svg height={sphereSize} width={sphereSize}>
          <Defs>
            <RadialGradient
              id="sphereGradient"
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
          <Circle cx={sphereRadius} cy={sphereRadius} r={sphereRadius} fill="url(#sphereGradient)" />
        </Svg>
      </View>
    </View>
  );
};
