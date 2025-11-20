import { ReactNode } from "react";
import { ViewStyle, Image, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "../hooks/use-theme";
import { GlassCard } from "./GlassCard";

interface GlassCardWithImageProps {
  children: ReactNode;
  imageUrl: string;
  intensity?: "light" | "medium" | "heavy";
  style?: ViewStyle;
  radius?: keyof typeof import("../theme").theme.radii;
  gradientAccent?: {
    colors: string[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
  };
  textBoxStyle?: ViewStyle;
}

/**
 * Glass card with blurred background image and readable text overlay
 */
export function GlassCardWithImage({
  children,
  imageUrl,
  intensity = "heavy",
  style,
  radius = "md",
  gradientAccent,
  textBoxStyle
}: GlassCardWithImageProps) {
  const theme = useTheme();

  return (
    <GlassCard intensity={intensity} radius={radius} style={style} gradientAccent={gradientAccent} showBorder={false}>
      {/* Blurred background image */}
      <View style={StyleSheet.absoluteFill}>
        <Image
          source={{ uri: imageUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        <BlurView
          intensity={80}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        {/* Dark overlay for better text readability */}
        <LinearGradient
          colors={[
            "rgba(10, 14, 26, 0.92)",
            "rgba(10, 14, 26, 0.88)",
            "rgba(10, 14, 26, 0.92)"
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Text content with readable background */}
      <BlurView
        intensity={40}
        tint="dark"
        style={[
          styles.textBox,
          {
            backgroundColor: theme.colors.background + "F5",
            borderRadius: theme.radii[radius],
            borderWidth: 1,
            borderColor: theme.colors.borderLight,
            ...textBoxStyle
          }
        ]}
      >
        {children}
      </BlurView>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  textBox: {
    padding: 20,
    overflow: "hidden"
  }
});

