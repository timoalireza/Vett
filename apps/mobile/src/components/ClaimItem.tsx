import { Text, TouchableOpacity, View, StyleSheet, Linking } from "react-native";
import { BlurView } from "expo-blur";

import { useTheme } from "../hooks/use-theme";
import { getScoreColorFromBand, getScoreBandLabel } from "../utils/scoreColors";

interface ClaimItemProps {
  text: string;
  verdict: string;
  confidence: number;
  onPress?: () => void;
  // Epistemic scoring
  scoreBand?: string | null;
  topPenalty?: { name: string; weight: number } | null;
}

export function ClaimItem({ text, verdict, confidence, onPress, scoreBand, topPenalty }: ClaimItemProps) {
  const theme = useTheme();
  
  // Use epistemic band color if available, otherwise fall back to verdict-based
  const statusColor = scoreBand 
    ? getScoreColorFromBand(scoreBand)
    : verdict === "False"
      ? theme.colors.danger
      : verdict === "Verified"
        ? theme.colors.success
        : theme.colors.warning;
  
  // Display epistemic band if available, otherwise verdict
  const displayLabel = scoreBand ?? verdict;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.container}
      accessibilityLabel={`Claim ${text}`}
    >
      <BlurView
        intensity={30}
        tint="dark"
        style={[
          styles.blurContainer,
          {
            borderRadius: theme.radii.sm,
            backgroundColor: theme.colors.background + "F0",
            borderWidth: 1,
            borderColor: theme.colors.border
          }
        ]}
      >
        <View style={styles.textBox}>
          <Text
            style={[
              styles.claimText,
              {
                color: theme.colors.text,
                fontSize: theme.typography.body,
                lineHeight: theme.typography.body * theme.typography.lineHeight.relaxed,
                marginBottom: theme.spacing(1.5),
                fontWeight: "500"
              }
            ]}
          >
            {text}
          </Text>
          <View style={styles.footer}>
            <View style={styles.verdictContainer}>
              <View
                style={[
                  styles.statusDot,
                  {
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: statusColor
                  }
                ]}
              />
              <Text
                style={[
                  styles.verdictText,
                  {
                    color: statusColor,
                    fontSize: theme.typography.caption,
                    fontWeight: "600",
                    letterSpacing: 0.2
                  }
                ]}
              >
                {displayLabel}
              </Text>
            </View>
            {topPenalty && (
              <Text
                style={[
                  styles.penaltyText,
                  {
                    color: theme.colors.subtitle,
                    fontSize: theme.typography.small,
                    marginLeft: 8
                  }
                ]}
                numberOfLines={1}
              >
                {topPenalty.name} (−{topPenalty.weight})
              </Text>
            )}
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12
  },
  blurContainer: {
    overflow: "hidden"
  },
  textBox: {
    padding: 16
  },
  claimText: {
    fontWeight: "500",
    letterSpacing: 0.1
  },
  footer: {
    flexDirection: "row",
    alignItems: "center"
  },
  verdictContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  statusDot: {
    // Styled inline
  },
  verdictText: {
    letterSpacing: 0.2
  },
  penaltyText: {
    letterSpacing: 0.1
  }
});

