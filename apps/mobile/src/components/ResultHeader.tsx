import { Text, View, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

import { ScoreRing } from "./ScoreRing";
import { useTheme } from "../hooks/use-theme";
import { getScoreGradient, adjustConfidence, getScoreBandLabel } from "../utils/scoreColors";

interface ResultHeaderProps {
  platform: string;
  verdict: string;
  confidence: number;
  score: number;
  imageUrl?: string | null;
  onShare?: () => void;
  // Epistemic scoring props
  scoreBand?: string | null;
  confidenceInterval?: { low: number; high: number } | null;
}

export function ResultHeader({ 
  platform, 
  verdict, 
  confidence, 
  score, 
  imageUrl, 
  onShare,
  scoreBand,
  confidenceInterval
}: ResultHeaderProps) {
  const theme = useTheme();
  const gradient = getScoreGradient(score, verdict, scoreBand);
  
  // Use confidence interval if available, otherwise use adjusted confidence
  const displayConfidence = confidenceInterval 
    ? (confidenceInterval.high - confidenceInterval.low) / 100 
    : adjustConfidence(confidence);
  
  // Use epistemic band label if available, otherwise fall back to verdict
  const displayBand = scoreBand ?? getScoreBandLabel(score, scoreBand);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 450 }}
      style={[
        styles.container,
        {
          borderRadius: theme.radii.lg,
          overflow: "hidden"
        }
      ]}
    >
      {/* Background Image */}
      {imageUrl ? (
        <>
          <Image
            source={{ uri: imageUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={[
              "rgba(10, 14, 26, 0.85)",
              "rgba(10, 14, 26, 0.75)",
              "rgba(10, 14, 26, 0.85)"
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.surface + "E0" }]} />
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Top Row: Platform and Share Button */}
        <View style={styles.topRow}>
          <Text
            style={[
              styles.platformText,
              {
                color: "#FFFFFF",
                fontSize: theme.typography.caption,
                letterSpacing: 0.3,
                fontWeight: "500"
              }
            ]}
            numberOfLines={1}
          >
            {platform}
          </Text>
          {onShare && (
            <TouchableOpacity
              onPress={onShare}
              activeOpacity={0.7}
              style={[
                styles.shareButton,
                {
                  backgroundColor: theme.colors.surface + "C0",
                  borderRadius: theme.radii.pill,
                  borderWidth: 1,
                  borderColor: theme.colors.borderLight
                }
              ]}
            >
              <Ionicons name="share-outline" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Middle: Vett Score */}
        <View style={styles.scoreContainer}>
          <ScoreRing score={score} size={140} verdict={verdict} scoreBand={scoreBand} />
        </View>

        {/* Bottom: Assessment Band and Confidence */}
        <View style={styles.bottomRow}>
          <View style={styles.verdictContainer}>
            <Text
              style={[
                styles.label,
                {
                  color: "rgba(255, 255, 255, 0.7)",
                  fontSize: theme.typography.small,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  fontWeight: "600"
                }
              ]}
            >
              Assessment
            </Text>
            <Text
              style={[
                styles.verdictText,
                {
                  color: "#FFFFFF",
                  fontSize: theme.typography.subheading,
                  fontWeight: "700",
                  letterSpacing: -0.3,
                  marginTop: 4
                }
              ]}
              numberOfLines={1}
            >
              {displayBand}
            </Text>
          </View>
          <View style={styles.confidenceContainer}>
            <Text
              style={[
                styles.label,
                {
                  color: "rgba(255, 255, 255, 0.7)",
                  fontSize: theme.typography.small,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  fontWeight: "600"
                }
              ]}
            >
              {confidenceInterval ? "Range" : "Confidence"}
            </Text>
            <View style={styles.confidenceBarRow}>
              {confidenceInterval ? (
                <Text
                  style={[
                    styles.confidenceText,
                    {
                      color: "#FFFFFF",
                      fontSize: theme.typography.caption,
                      fontWeight: "600"
                    }
                  ]}
                >
                  {confidenceInterval.low}–{confidenceInterval.high}
                </Text>
              ) : (
                <>
                  <View
                    style={[
                      styles.confidenceBar,
                      {
                        width: 100,
                        height: 6,
                        borderRadius: theme.radii.pill,
                        backgroundColor: theme.colors.card + "80",
                        overflow: "hidden"
                      }
                    ]}
                  >
                    <View
                      style={{
                        width: `${Math.min(100, Math.max(0, displayConfidence * 100))}%`,
                        height: "100%",
                        borderRadius: theme.radii.pill,
                        backgroundColor: gradient.end
                      }}
                    />
                  </View>
                  <Text
                    style={[
                      styles.confidenceText,
                      {
                        color: "#FFFFFF",
                        fontSize: theme.typography.caption,
                        fontWeight: "600",
                        marginLeft: 8,
                        minWidth: 35
                      }
                    ]}
                  >
                    {(displayConfidence * 100).toFixed(0)}%
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden"
  },
  content: {
    padding: 20,
    gap: 16,
    minHeight: 280
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  platformText: {
    flex: 1,
    marginRight: 12
  },
  shareButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center"
  },
  scoreContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16
  },
  verdictContainer: {
    flex: 1
  },
  confidenceContainer: {
    flex: 1,
    alignItems: "flex-end"
  },
  label: {
    marginBottom: 4
  },
  verdictText: {
    lineHeight: 24
  },
  confidenceBarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4
  },
  confidenceBar: {
    // Styled inline
  },
  confidenceText: {
    letterSpacing: -0.1
  }
});

