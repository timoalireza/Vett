import { useEffect, useMemo } from "react";
import { ScrollView, Text, View, TouchableOpacity, StyleSheet, Platform, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MotiView } from "moti";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

import { useTheme } from "../../src/hooks/use-theme";
import { LinearGradient } from "expo-linear-gradient";
import { fetchAnalysis } from "../../src/api/analysis";
import { GlassCard } from "../../src/components/GlassCard";
import { ScoreRing } from "../../src/components/ScoreRing";
import { ClaimItem } from "../../src/components/ClaimItem";
import { SourceItem } from "../../src/components/SourceItem";
import { getScoreGradient } from "../../src/utils/scoreColors";

const stages = ["Extracting", "Classifying", "Verifying", "Scoring"];

export default function ResultScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();

  const analysisId = useMemo(() => (typeof jobId === "string" ? jobId : ""), [jobId]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["analysis", analysisId],
    queryFn: () => fetchAnalysis(analysisId),
    enabled: Boolean(analysisId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && status !== "COMPLETED" ? 2000 : false;
    }
  });

  useEffect(() => {
    if (!analysisId) return;
    if (!data || data.status !== "COMPLETED") {
      const timer = setInterval(() => {
        refetch();
      }, 4000);
      return () => clearInterval(timer);
    }
    return undefined;
  }, [analysisId, data, refetch]);

  const isPolitical = data?.topic?.toLowerCase() === "political";

  if (!analysisId) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000000" }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: theme.colors.text }}>No analysis selected.</Text>
        </View>
      </View>
    );
  }

  if (!data && !isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000000" }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: theme.colors.text }}>Analysis not found.</Text>
        </View>
      </View>
    );
  }

  const isPending = isLoading || !data || data.status !== "COMPLETED";

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000000" }}>
        <LoadingState stage={data?.status === "FAILED" ? "Failed" : undefined} />
      </View>
    );
  }


  const getGradientColors = () => {
    const verdict = data.verdict?.toLowerCase() || "";
    const score = data.score ?? 0;
    
    // Check verdict first - "Mostly Accurate" should be green
    if (verdict.includes("mostly accurate")) {
      return ["#2EFAC0", "#53D8FF"]; // Green gradient
    }
    
    // Fallback to score-based colors
    if (score >= 75) {
      return ["#2EFAC0", "#53D8FF"]; // Green
    } else if (score >= 50) {
      return ["#FFC65B", "#FF8A5A"]; // Orange/Yellow
    }
    return ["#FF4D6D", "#F45B9A"]; // Red/Pink
  };

  const getBiasLabel = () => {
    if (!data.bias) return null;
    // Map bias to readable labels
    const biasMap: Record<string, string> = {
      "Left": "Left-leaning",
      "Center-left": "Center-left",
      "Center": "Center",
      "Center-right": "Center-right",
      "Right": "Right-leaning"
    };
    return biasMap[data.bias] || data.bias;
  };

  const getReliabilityLabel = () => {
    const score = data.score ?? 0;
    if (score < 30) return "Unreliable";
    if (score < 50) return "Questionable";
    if (score < 75) return "Mostly Reliable";
    return "Reliable";
  };

  const handleShare = () => {
    router.push({
      pathname: "/modals/share",
      params: {
        score: (data.score ?? 0).toString(),
        verdict: data.verdict ?? "Analysis",
        analysisId: data.id
      }
    });
  };

  const scoreGradient = getScoreGradient(data.score ?? 0, data.verdict ?? null);

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      {/* Background base */}
      <View style={StyleSheet.absoluteFill} />
      
      {/* Subtle noise texture overlay */}
      <View style={styles.noiseOverlay} pointerEvents="none">
        <LinearGradient
          colors={["rgba(255, 255, 255, 0.01)", "rgba(255, 255, 255, 0.02)", "rgba(255, 255, 255, 0.01)"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </View>
      
      {/* Vignette effect around score ring */}
      <View style={styles.vignetteContainer} pointerEvents="none">
        <LinearGradient
          colors={["transparent", "rgba(0, 0, 0, 0.2)", "rgba(0, 0, 0, 0.4)"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0.25 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* Header with Back, Bias Tag (only for political), and Share */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.6}
          >
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={18} color="rgba(255, 255, 255, 0.9)" />
            </View>
          </TouchableOpacity>
          
          {/* Bias Tag - Only show for political claims */}
          {isPolitical && data.bias && (
            <View style={styles.biasTag}>
              <BlurView intensity={20} tint="dark" style={styles.biasTagBlur}>
                <View style={styles.biasTagBorder} />
                <Text style={styles.biasTagText}>
                  Bias · {getBiasLabel()}
                </Text>
              </BlurView>
            </View>
          )}

          {/* Share Button */}
          <TouchableOpacity
            onPress={handleShare}
            style={styles.shareButton}
            activeOpacity={0.6}
          >
            <View style={styles.shareButtonInner}>
              <Ionicons name="share-social-outline" size={18} color="rgba(255, 255, 255, 0.9)" />
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentInner}>
            {/* Input Claim Section */}
            {(data.rawInput || (data.claims.length > 0 && data.claims[0].text)) && (
              <View style={styles.inputClaimContainer}>
                <View style={styles.inputClaimHeader}>
                  <View style={styles.inputClaimDot} />
                  <Text style={styles.inputClaimLabel}>
                    INPUT CLAIM
                  </Text>
                </View>
                <Text style={styles.inputClaimText}>
                  {data.rawInput || (data.claims.length > 0 ? data.claims[0].text : "")}
                </Text>
              </View>
            )}

            {/* Score Circle - Large and Centered with Glow */}
            <View style={styles.scoreSection}>
              <View style={styles.scoreRingContainer}>
                <ScoreRing 
                  score={data.score ?? 0}
                  label="VETT SCORE" 
                  size={180}
                  verdict={data.verdict ?? null}
                />
                {/* Subtle glow effect behind score number */}
                <View
                  style={[
                    styles.scoreNumberGlow,
                    {
                      shadowColor: scoreGradient.end,
                    }
                  ]}
                />
              </View>
            </View>

            {/* Verdict and Confidence - Side by Side */}
            <View style={styles.verdictConfidenceRow}>
              <View style={styles.verdictColumn}>
                <Text style={styles.verdictLabel}>
                  VERDICT
                </Text>
                <Text style={styles.verdictValue}>
                  {data.verdict ?? "Pending"}
                </Text>
              </View>

              <View style={styles.confidenceColumn}>
                <Text style={styles.confidenceLabel}>
                  CONFIDENCE
                </Text>
                <View style={styles.confidenceBarContainer}>
                  <View style={styles.confidenceBarBackground}>
                    <View
                      style={[
                        styles.confidenceBarFill,
                        {
                          width: `${Math.min(100, Math.max(0, (data.confidence ?? 0) * 100))}%`,
                          backgroundColor: scoreGradient.end,
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.confidenceValue}>
                    {((data.confidence ?? 0) * 100).toFixed(0)}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Summary Card */}
            {data.summary && (
              <View style={styles.card}>
                <BlurView intensity={30} tint="dark" style={styles.cardBlur}>
                  <LinearGradient
                    colors={["rgba(255, 255, 255, 0.05)", "rgba(255, 255, 255, 0.02)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.cardGradient}
                  />
                  <View style={styles.cardContent}>
                    <Text style={styles.cardLabel}>
                      SUMMARY
                    </Text>
                    <Text style={styles.cardText}>
                      {data.summary}
                    </Text>
                  </View>
                </BlurView>
              </View>
            )}

            {/* Correct Information Card */}
            {data.recommendation ? (
              <View style={styles.card}>
                <BlurView intensity={30} tint="dark" style={styles.cardBlur}>
                  <LinearGradient
                    colors={["rgba(255, 255, 255, 0.05)", "rgba(255, 255, 255, 0.02)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.cardGradient}
                  />
                  <View style={styles.cardContent}>
                    <Text style={styles.cardLabel}>
                      CORRECT INFORMATION
                    </Text>
                    <Text style={styles.cardText}>
                      {data.recommendation}
                    </Text>
                  </View>
                </BlurView>
              </View>
            ) : null}

            {/* Sources Card */}
            <View style={styles.card}>
              <BlurView intensity={30} tint="dark" style={styles.cardBlur}>
                <LinearGradient
                  colors={["rgba(255, 255, 255, 0.05)", "rgba(255, 255, 255, 0.02)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.cardGradient}
                />
                <View style={styles.cardContent}>
                  <Text style={styles.cardLabel}>
                    VERIFIED SOURCES
                  </Text>
                  {data.sources.length === 0 ? (
                    <Text style={styles.emptyText}>
                      No supporting sources yet.
                    </Text>
                  ) : (
                    <View style={styles.sourcesList}>
                      {data.sources.map((source) => (
                        <SourceItem
                          key={source.id}
                          outlet={source.title || source.provider}
                          reliability={source.reliability ?? 0}
                          url={source.url}
                          onPress={() => {
                            if (source.url) {
                              Linking.openURL(source.url).catch(() => {});
                            }
                          }}
                        />
                      ))}
                    </View>
                  )}
                </View>
              </BlurView>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function LoadingState({ stage }: { stage?: string }) {
  const theme = useTheme();
  const label = stage ?? "Analyzing";

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: theme.spacing(3)
      }}
      accessible
      accessibilityLabel={`${label} content`}
    >
      <MotiView
        from={{ opacity: 0.3, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ loop: true, type: "timing", duration: 1200 }}
        style={{
          width: 180,
          height: 180,
          borderRadius: 90,
          borderWidth: 2,
          borderColor: theme.colors.primary,
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Text style={{ color: theme.colors.primary, fontSize: 18, fontFamily: "Inter_600SemiBold" }}>{label}</Text>
      </MotiView>
      <View style={{ marginTop: theme.spacing(4), width: "100%", gap: theme.spacing(1) }}>
        {stages.map((stageName, idx) => (
          <View key={stageName} style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(1) }}>
            <View
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: theme.colors.card
              }}
            />
            <Text style={{ color: theme.colors.subtitle, fontFamily: "Inter_500Medium" }}>{stageName}</Text>
          </View>
        ))}
      </View>
      <Text style={{ color: theme.colors.subtitle, marginTop: theme.spacing(3), textAlign: "center" }}>
        We’re parsing claims, evaluating evidence, and scoring credibility…
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000"
  },
  noiseOverlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: "none",
    opacity: 0.3
  },
  vignetteContainer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: "none"
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 8 : 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center"
  },
  backButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2
  },
  biasTag: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 8
  },
  biasTagBlur: {
    borderRadius: 20,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)"
  },
  biasTagBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)"
  },
  biasTagText: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  shareButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center"
  },
  shareButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2
  },
  scrollView: {
    flex: 1
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32
  },
  contentInner: {
    gap: 24
  },
  inputClaimContainer: {
    paddingTop: 8
  },
  inputClaimHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },
  inputClaimDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#5A8FD4",
    marginRight: 8
  },
  inputClaimLabel: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  inputClaimText: {
    color: "#FFFFFF",
    fontSize: 24,
    lineHeight: 32,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3
  },
  scoreSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32
  },
  scoreRingContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    width: 180,
    height: 180
  },
  scoreNumberGlow: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -50,
    marginLeft: -50,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 50,
    elevation: 0
  },
  verdictConfidenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 24,
    paddingHorizontal: 4
  },
  verdictColumn: {
    flex: 1
  },
  verdictLabel: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6
  },
  verdictValue: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 36,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5
  },
  confidenceColumn: {
    flex: 1,
    alignItems: "flex-end"
  },
  confidenceLabel: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
    textAlign: "right"
  },
  confidenceBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 8
  },
  confidenceBarBackground: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    overflow: "hidden"
  },
  confidenceBarFill: {
    height: "100%",
    borderRadius: 3
  },
  confidenceValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    minWidth: 36,
    textAlign: "right",
    letterSpacing: -0.2
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4
  },
  cardBlur: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    backgroundColor: "rgba(15, 15, 15, 0.7)"
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16
  },
  cardContent: {
    padding: 20
  },
  cardLabel: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12
  },
  cardText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.1
  },
  emptyText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.1
  },
  sourcesList: {
    gap: 12
  }
});

