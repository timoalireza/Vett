import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { GlassCard } from "../GlassCard";
import { ScoreRing } from "../Lens/ScoreRing";
import { LensMotif } from "../Lens/LensMotif";
import { useTheme } from "../../hooks/use-theme";

interface DemoResultCardProps {
  verdict: "verified" | "uncertain" | "false" | "partially-true";
  score: number;
  explanation: string;
}

export function DemoResultCard({ verdict, score, explanation }: DemoResultCardProps) {
  const theme = useTheme();

  const getVerdictLabel = () => {
    switch (verdict) {
      case "verified":
        return "Verified";
      case "uncertain":
        return "Uncertain";
      case "false":
        return "False";
      case "partially-true":
        return "Partially True";
      default:
        return "Uncertain";
    }
  };

  const getVerdictColor = () => {
    switch (verdict) {
      case "verified":
        return theme.colors.success;
      case "uncertain":
        return theme.colors.warning;
      case "false":
        return theme.colors.danger;
      case "partially-true":
        return theme.colors.warning;
      default:
        return theme.colors.textSecondary;
    }
  };

  return (
    <GlassCard intensity="medium" radius="lg" style={styles.card}>
      <View style={styles.content}>
        <View style={styles.visualContainer}>
          <LensMotif size={160} showPrompt={false} />
          <ScoreRing score={score} size={160} />
        </View>

        <View
          style={[
            styles.verdictBadge,
            {
              backgroundColor: getVerdictColor() + "20",
              borderColor: getVerdictColor(),
              borderRadius: theme.radii.pill,
              paddingHorizontal: theme.spacing(2),
              paddingVertical: theme.spacing(1),
              marginTop: theme.spacing(3),
            },
          ]}
        >
          <Text
            style={[
              styles.verdictText,
              {
                color: getVerdictColor(),
                fontFamily: "Inter_600SemiBold",
                fontSize: theme.typography.caption,
              },
            ]}
          >
            {getVerdictLabel()}
          </Text>
        </View>

        <Text
          style={[
            styles.explanation,
            {
              color: theme.colors.textSecondary,
              fontFamily: "Inter_400Regular",
              fontSize: theme.typography.body,
              marginTop: theme.spacing(2),
            },
          ]}
        >
          {explanation}
        </Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    padding: 24,
  },
  content: {
    alignItems: "center",
  },
  visualContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    width: 160,
    height: 160,
  },
  verdictBadge: {
    borderWidth: 1,
  },
  verdictText: {
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  explanation: {
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },
});

