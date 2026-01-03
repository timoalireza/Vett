import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

interface UpgradeCardProps {
  onPress: () => void;
  style?: ViewStyle;
  fromPlan?: "FREE" | "PLUS";
}

export function UpgradeCard({ onPress, style, fromPlan = "FREE" }: UpgradeCardProps) {
  const ctaText = fromPlan === "PLUS" ? "Go Pro" : "Try Pro";
  const subtitle =
    fromPlan === "PLUS"
      ? "Upgrade to unlock priority processing, unlimited Vett Chat, and more"
      : "Get unlimited fact-checks, advanced bias analysis, and priority processing";

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[styles.container, style]}>
      <LinearGradient
        colors={["#9D7FEF", "#E89CDA", "#FFC58F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Vett Pro</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Unlimited Analyses</Text>
          <Text style={styles.description}>
            {subtitle}
          </Text>

          <View style={styles.ctaRow}>
            <Text style={styles.ctaText}>{ctaText} for €6.99/month</Text>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#9D7FEF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  gradient: {
    padding: 20,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  content: {
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 16,
    lineHeight: 22,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});

