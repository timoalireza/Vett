import { useEffect, useMemo, useState, useCallback } from "react";
import { ScrollView, Text, View, TouchableOpacity, StyleSheet, Platform, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MotiView } from "moti";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "../../src/hooks/use-theme";
import { LinearGradient } from "expo-linear-gradient";
import { fetchAnalysis, submitFeedback, fetchFeedback } from "../../src/api/analysis";
import { GlassCard } from "../../src/components/GlassCard";
import { ScoreRing } from "../../src/components/ScoreRing";
import { ClaimItem } from "../../src/components/ClaimItem";
import { SourceItem } from "../../src/components/SourceItem";
import { getScoreGradient, adjustConfidence } from "../../src/utils/scoreColors";
import { RatingPopup } from "../../src/components/RatingPopup";
import { VettAIChat } from "../../src/components/VettAIChat";
import { fetchSubscription } from "../../src/api/subscription";
import { chatWithVettAI } from "../../src/api/vettai";

const stages = ["Extracting", "Classifying", "Verifying", "Scoring"];

const FEEDBACK_STORAGE_KEY = "vett.ratedAnalyses";
const MAX_CONTEXTUAL_LINES = 12; // Show 12 lines before "Read more" to avoid mid-sentence cuts

// Component for expandable contextual information card
function ContextualInfoCard({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  // Increased threshold to show more content before truncating
  // Using 500 chars as threshold for "Read more" button to ensure full sentences are visible
  const CHAR_THRESHOLD = 500;
  const shouldShowReadMore = text.length > CHAR_THRESHOLD;

  return (
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
            CONTEXTUAL INFORMATION
          </Text>
          <Text
            style={styles.cardText}
            numberOfLines={expanded ? undefined : MAX_CONTEXTUAL_LINES}
          >
            {text}
          </Text>
          {shouldShowReadMore && (
            <TouchableOpacity
              onPress={() => setExpanded(!expanded)}
              style={styles.readMoreButton}
              activeOpacity={0.7}
            >
              <Text style={styles.readMoreText}>
                {expanded ? "Show less" : "Read more"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </BlurView>
    </View>
  );
}
const FEEDBACK_PROMPT_DELAY = 5000; // Show popup after 5 seconds of viewing
const FEEDBACK_PROMPT_PROBABILITY = 0.3; // 30% chance to show popup

async function hasRatedAnalysis(analysisId: string): Promise<boolean> {
  try {
    const rated = await AsyncStorage.getItem(FEEDBACK_STORAGE_KEY);
    if (!rated) return false;
    const ratedIds = JSON.parse(rated) as string[];
    return ratedIds.includes(analysisId);
  } catch {
    return false;
  }
}

async function markAnalysisAsRated(analysisId: string): Promise<void> {
  try {
    const rated = await AsyncStorage.getItem(FEEDBACK_STORAGE_KEY);
    const ratedIds = rated ? (JSON.parse(rated) as string[]) : [];
    if (!ratedIds.includes(analysisId)) {
      ratedIds.push(analysisId);
      await AsyncStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(ratedIds));
    }
  } catch (error) {
    console.error("[Feedback] Error marking analysis as rated:", error);
  }
}

export default function ResultScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();

  const analysisId = useMemo(() => (typeof jobId === "string" ? jobId : ""), [jobId]);

  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const [showVettAI, setShowVettAI] = useState(false);

  // Check subscription status for Pro members
  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: fetchSubscription,
    staleTime: 60000,
    retry: 1,
    refetchOnWindowFocus: false
  });
  const isPro = subscription?.plan === "PRO";

  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ["analysis", analysisId],
    queryFn: () => fetchAnalysis(analysisId),
    enabled: Boolean(analysisId),
    refetchInterval: (query) => {
      // Stop polling if there's an authorization error
      if (query.state.error?.message?.includes("Unauthorized")) {
        return false;
      }
      const status = query.state.data?.status;
      return status && status !== "COMPLETED" ? 2000 : false;
    },
    retry: (failureCount, error: any) => {
      // Don't retry on authorization errors - they won't resolve
      if (error?.message?.includes("Unauthorized")) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    }
  });

  // Check if user has already rated this analysis
  const { data: existingFeedback } = useQuery({
    queryKey: ["feedback", analysisId],
    queryFn: () => fetchFeedback(analysisId),
    enabled: Boolean(analysisId) && data?.status === "COMPLETED"
  });

  const feedbackMutation = useMutation({
    mutationFn: ({ isAgree, comment }: { isAgree: boolean; comment?: string | null }) =>
      submitFeedback(analysisId, isAgree, comment ?? null),
    onSuccess: async () => {
      await markAnalysisAsRated(analysisId);
      queryClient.invalidateQueries({ queryKey: ["feedback", analysisId] });
      setShowRatingPopup(false);
    }
  });

  // REMOVED: Duplicate polling mechanism - useQuery's refetchInterval handles this
  // This was causing double polling and performance issues

  // Show rating popup occasionally after viewing completed analysis
  useEffect(() => {
    if (!analysisId || !data || data.status !== "COMPLETED" || existingFeedback) {
      return;
    }

    let mounted = true;
    let timer: NodeJS.Timeout | null = null;

    const checkAndShowPopup = async () => {
      // Check if already rated
      const hasRated = await hasRatedAnalysis(analysisId);
      if (hasRated || !mounted) return;

      // Random chance to show popup (30% probability)
      if (Math.random() > FEEDBACK_PROMPT_PROBABILITY) {
        return;
      }

      // Show popup after delay
      timer = setTimeout(() => {
        if (mounted) {
          setShowRatingPopup(true);
        }
      }, FEEDBACK_PROMPT_DELAY);
    };

    checkAndShowPopup();

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [analysisId, data?.status, existingFeedback]);

  const handleThumbsUp = useCallback(() => {
    // Prevent multiple simultaneous mutations
    if (feedbackMutation.isPending) return;
    feedbackMutation.mutate({ isAgree: true });
  }, [feedbackMutation]);

  const handleThumbsDown = useCallback(() => {
    // Feedback form is now handled within RatingPopup component
    // Prevent action if mutation is in progress
    if (feedbackMutation.isPending) return;
  }, [feedbackMutation]);

  const handleFeedbackSubmit = useCallback(
    (comment: string) => {
      // Prevent multiple simultaneous mutations
      if (feedbackMutation.isPending) return;
      feedbackMutation.mutate({ isAgree: false, comment });
    },
    [feedbackMutation]
  );

  const handleDismissRating = useCallback(() => {
    setShowRatingPopup(false);
    // Mark as dismissed (don't show again for this analysis)
    markAnalysisAsRated(analysisId).catch(() => {});
  }, [analysisId]);

  // Move hooks before early returns to maintain consistent hook order
  const adjustedConfidence = useMemo(() => {
    const rawConfidence = data?.confidence ?? 0;
    return adjustConfidence(rawConfidence);
  }, [data?.confidence]);

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

          <View style={styles.headerRight}>
            {isPro && (
              <TouchableOpacity
                onPress={() => setShowVettAI(true)}
                style={styles.vettAIButton}
                activeOpacity={0.6}
              >
                <View style={styles.vettAIButtonInner}>
                  <Ionicons name="sparkles" size={16} color="#2EFAC0" />
                </View>
              </TouchableOpacity>
            )}
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
              {/* Atmospheric glow using SVG radial gradient - smooth feathered falloff */}
              <View style={styles.scoreGlowContainer}>
                <Svg width={580} height={580} style={styles.scoreGlowSvg}>
                  <Defs>
                    <RadialGradient
                      id="scoreGlow"
                      cx="50%"
                      cy="50%"
                      rx="50%"
                      ry="50%"
                      fx="50%"
                      fy="50%"
                    >
                      {/* Ultra-smooth falloff - larger spread, lower intensity for atmospheric effect */}
                      <Stop offset="0%" stopColor={scoreGradient.end} stopOpacity={0.15} />
                      <Stop offset="12%" stopColor={scoreGradient.end} stopOpacity={0.13} />
                      <Stop offset="25%" stopColor={scoreGradient.end} stopOpacity={0.11} />
                      <Stop offset="37%" stopColor={scoreGradient.end} stopOpacity={0.09} />
                      <Stop offset="50%" stopColor={scoreGradient.end} stopOpacity={0.07} />
                      <Stop offset="62%" stopColor={scoreGradient.end} stopOpacity={0.05} />
                      <Stop offset="75%" stopColor={scoreGradient.end} stopOpacity={0.03} />
                      <Stop offset="87%" stopColor={scoreGradient.end} stopOpacity={0.01} />
                      <Stop offset="100%" stopColor={scoreGradient.end} stopOpacity={0} />
                    </RadialGradient>
                  </Defs>
                  <Rect x="0" y="0" width="580" height="580" fill="url(#scoreGlow)" />
                </Svg>
              </View>
              <View style={styles.scoreRingContainer}>
                <ScoreRing 
                  score={data.score ?? 0}
                  label="VETT SCORE" 
                  size={180}
                  verdict={data.verdict ?? null}
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
                          width: `${Math.min(100, Math.max(0, adjustedConfidence * 100))}%`,
                          backgroundColor: scoreGradient.end,
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.confidenceValue}>
                    {(adjustedConfidence * 100).toFixed(0)}%
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

            {/* Contextual Information Card */}
            {data.recommendation ? (
              <ContextualInfoCard text={data.recommendation} />
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

      {/* Rating Popup with integrated feedback form */}
      <RatingPopup
        visible={showRatingPopup}
        onThumbsUp={handleThumbsUp}
        onThumbsDown={handleThumbsDown}
        onDismiss={handleDismissRating}
        onSubmitFeedback={handleFeedbackSubmit}
        isSubmitting={feedbackMutation.isPending}
      />

      {/* VettAI Chat - Pro members only */}
      {isPro && (
        <VettAIChat
          visible={showVettAI}
          onClose={() => setShowVettAI(false)}
          analysisId={analysisId}
          analysisData={{
            claim: data.rawInput || (data.claims.length > 0 ? data.claims[0].text : undefined),
            verdict: data.verdict ?? undefined,
            score: data.score ?? undefined,
            summary: data.summary ?? undefined,
            sources: (data.sources || []).map((s) => ({ 
              title: s.title || "Untitled Source", 
              url: s.url || "" 
            }))
          }}
          onSendMessage={chatWithVettAI}
        />
      )}
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
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  vettAIButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center"
  },
  vettAIButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(46, 250, 192, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(46, 250, 192, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2EFAC0",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2
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
    paddingVertical: 32,
    position: "relative"
  },
  scoreGlowContainer: {
    position: "absolute",
    width: 580,
    height: 580,
    alignItems: "center",
    justifyContent: "center"
  },
  scoreGlowSvg: {
    position: "absolute"
  },
  scoreRingContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    width: 180,
    height: 180,
    zIndex: 1
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
    letterSpacing: 0.1,
    flexShrink: 1
  },
  readMoreButton: {
    marginTop: 12,
    alignSelf: "flex-start"
  },
  readMoreText: {
    color: "#2EFAC0",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2
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

