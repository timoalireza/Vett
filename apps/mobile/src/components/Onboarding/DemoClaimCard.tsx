import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { GlassCard } from "../GlassCard";
import { useTheme } from "../../hooks/use-theme";

interface DemoClaimCardProps {
  claim: string;
  onPress: () => void;
  disabled?: boolean;
}

export function DemoClaimCard({ claim, onPress, disabled }: DemoClaimCardProps) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={styles.container}
    >
      <GlassCard
        intensity="medium"
        radius="lg"
        style={[
          styles.card,
          {
            padding: theme.spacing(3),
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <View style={styles.content}>
          <Text
            style={[
              styles.claimText,
              {
                color: theme.colors.text,
                fontFamily: "Inter_400Regular",
                fontSize: theme.typography.body,
              },
            ]}
          >
            {claim}
          </Text>
          {!disabled && (
            <Text
              style={[
                styles.hint,
                {
                  color: theme.colors.textSecondary,
                  fontFamily: "Inter_400Regular",
                  fontSize: theme.typography.caption,
                  marginTop: theme.spacing(2),
                },
              ]}
            >
              Tap to analyze
            </Text>
          )}
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  card: {
    width: "100%",
  },
  content: {
    alignItems: "center",
  },
  claimText: {
    textAlign: "center",
    lineHeight: 24,
  },
  hint: {
    textAlign: "center",
  },
});

