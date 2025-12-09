import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle, Pattern, Rect } from 'react-native-svg';

interface LensMotifProps {
  size?: number;
  showPrompt?: boolean;
  style?: any;
}

export const LensMotif: React.FC<LensMotifProps> = ({ 
  size = 240, 
  showPrompt = true,
  style 
}) => {
  const id = React.useId();
  const sphereSize = size * 0.65;
  const sphereRadius = sphereSize / 2;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* Glow effect - replaces gray circle */}
      <View style={[
        styles.glowEffect,
        {
          width: sphereSize,
          height: sphereSize,
          borderRadius: sphereSize / 2,
          left: (size - sphereSize) / 2,
          top: (size - sphereSize) / 2,
        }
      ]}>
        {/* Subtle noise overlay using SVG pattern */}
        <Svg width={sphereSize} height={sphereSize} style={StyleSheet.absoluteFill}>
          <Defs>
            <Pattern id={`noisePattern-${id}`} x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
              <Circle cx="1" cy="1" r="0.5" fill="rgba(255,255,255,0.03)" />
              <Circle cx="3" cy="3" r="0.5" fill="rgba(255,255,255,0.03)" />
              <Circle cx="1" cy="3" r="0.3" fill="rgba(0,0,0,0.05)" />
              <Circle cx="3" cy="1" r="0.3" fill="rgba(0,0,0,0.05)" />
            </Pattern>
          </Defs>
          <Rect width={sphereSize} height={sphereSize} fill={`url(#noisePattern-${id})`} opacity={0.4} />
        </Svg>
      </View>
      
      {/* Sphere with gradient - centered with outer glow */}
      <View style={[
        styles.sphereContainer,
        {
          width: sphereSize,
          height: sphereSize,
          left: (size - sphereSize) / 2,
          top: (size - sphereSize) / 2,
        }
      ]}>
        <Svg 
          width={sphereSize} 
          height={sphereSize}
        >
          <Defs>
            <RadialGradient
              id={`sphereGrad-${id}`}
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
          </Defs>
          <Circle
            cx={sphereRadius}
            cy={sphereRadius}
            r={sphereRadius}
            fill={`url(#sphereGrad-${id})`}
          />
        </Svg>
      </View>

      {/* Text centered on screen (where gray circle/glow is) */}
      {showPrompt && (
        <View style={[styles.textContainer, { width: size, height: size }]}>
          <Text style={styles.promptText}>
            Paste a claim to verify
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowEffect: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 50,
    elevation: 25,
    overflow: 'hidden',
  },
  noiseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    opacity: 0.15,
    // Create subtle noise pattern using multiple small circles
    // This simulates a noise texture
  },
  sphereContainer: {
    position: 'absolute',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.252,
    shadowRadius: 20,
    elevation: 15,
  },
  textContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
