import { useEffect, useMemo } from "react";
import { ScrollView, Text, View, TouchableOpacity, StyleSheet, Platform, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MotiView } from "moti";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../../src/hooks/use-theme";
import { GradientBackground } from "../../src/components/GradientBackground";
import { fetchAnalysis } from "../../src/api/analysis";
import { GlassCard } from "../../src/components/GlassCard";
import { GlassCardWithImage } from "../../src/components/GlassCardWithImage";
import { ResultHeader } from "../../src/components/ResultHeader";
import { ClaimItem } from "../../src/components/ClaimItem";
import { SourceItem } from "../../src/components/SourceItem";

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

  if (!analysisId) {
    return (
      <GradientBackground>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: theme.colors.text }}>No analysis selected.</Text>
        </View>
      </GradientBackground>
    );
  }

  if (!data && !isLoading) {
    return (
      <GradientBackground>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: theme.colors.text }}>Analysis not found.</Text>
        </View>
      </GradientBackground>
    );
  }

  const isPending = isLoading || !data || data.status !== "COMPLETED";

  if (isPending) {
    return (
      <GradientBackground>
        <LoadingState stage={data?.status === "FAILED" ? "Failed" : undefined} />
      </GradientBackground>
    );
  }

  // Fallback image if Unsplash image is not available
  const getBackgroundImage = () => {
    // Use actual Unsplash image from analysis if available, otherwise fallback
    if (data.imageUrl) {
      return data.imageUrl;
    }
    const topic = data.topic?.toLowerCase() || "general";
    const images: Record<string, string> = {
      political: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a78e?w=800&q=80",
      health: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&q=80",
      media: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80",
      general: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80"
    };
    return images[topic] || images.general;
  };

  const getGradientColors = () => {
    const score = data.score ?? 0;
    if (score >= 75) {
      return [theme.colors.success, theme.colors.highlight];
    } else if (score >= 50) {
      return [theme.colors.warning, theme.colors.highlight];
    }
    return [theme.colors.primary, theme.colors.secondary];
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* Return Button */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.backButton,
              {
                backgroundColor: theme.colors.surface + "E0",
                borderRadius: theme.radii.pill,
                padding: theme.spacing(1.5)
              }
            ]}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: theme.spacing(6),
              paddingTop: theme.spacing(2)
            }
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentInner}>
            <ResultHeader
              platform={data.bias ? `Bias · ${data.bias}` : "Vett"}
              verdict={data.verdict ?? "Pending"}
              confidence={data.confidence ?? 0}
              score={data.score ?? 0}
              imageUrl={data.imageUrl ?? null}
              onShare={() => undefined}
            />

            {/* Summary Card - Separate card underneath Vett Score */}
            {data.summary && (
              <GlassCardWithImage
                imageUrl={getBackgroundImage()}
                intensity="heavy"
                radius="md"
                gradientAccent={{
                  colors: getGradientColors(),
                  start: { x: 0, y: 0 },
                  end: { x: 1, y: 0 }
                }}
              >
                <Text
                  style={[
                    styles.sectionLabel,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.caption,
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                      fontWeight: "600",
                      marginBottom: theme.spacing(1.5)
                    }
                  ]}
                >
                  Summary
                </Text>
                <Text
                  style={[
                    styles.summaryText,
                    {
                      color: theme.colors.text,
                      fontSize: theme.typography.body,
                      lineHeight: theme.typography.body * theme.typography.lineHeight.relaxed,
                      fontWeight: "500",
                      letterSpacing: 0.1
                    }
                  ]}
                >
                  {data.summary}
                </Text>
              </GlassCardWithImage>
            )}

            {data.recommendation ? (
              <GlassCardWithImage
                imageUrl={getBackgroundImage()}
                intensity="heavy"
                radius="md"
                gradientAccent={{
                  colors: getGradientColors(),
                  start: { x: 0, y: 0 },
                  end: { x: 1, y: 0 }
                }}
              >
                <Text
                  style={[
                    styles.sectionLabel,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.caption,
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                      fontWeight: "600",
                      marginBottom: theme.spacing(1.5)
                    }
                  ]}
                >
                  Recommendation
                </Text>
                <Text
                  style={[
                    styles.recommendationText,
                    {
                      color: theme.colors.text,
                      fontSize: theme.typography.body,
                      lineHeight: theme.typography.body * theme.typography.lineHeight.relaxed,
                      fontWeight: "500",
                      letterSpacing: 0.1
                    }
                  ]}
                >
                  {data.recommendation}
                </Text>
              </GlassCardWithImage>
            ) : null}

            <GlassCardWithImage
              imageUrl={getBackgroundImage()}
              intensity="heavy"
              radius="md"
              gradientAccent={{
                colors: getGradientColors(),
                start: { x: 0, y: 0 },
                end: { x: 1, y: 0 }
              }}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: theme.colors.text,
                    fontSize: theme.typography.subheading,
                    marginBottom: theme.spacing(2.5),
                    fontWeight: "600",
                    letterSpacing: -0.2
                  }
                ]}
              >
                Claims
              </Text>
              {data.claims.length === 0 ? (
                <Text
                  style={[
                    styles.emptyText,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.body,
                      lineHeight: theme.typography.body * theme.typography.lineHeight.normal,
                      letterSpacing: 0.1
                    }
                  ]}
                >
                  No claims detected.
                </Text>
              ) : (
                <View style={styles.claimsList}>
                  {data.claims.map((claim) => (
                    <ClaimItem
                      key={claim.id}
                      text={claim.text}
                      verdict={claim.verdict ?? "Pending"}
                      confidence={claim.confidence ?? 0}
                    />
                  ))}
                </View>
              )}
            </GlassCardWithImage>

            <GlassCardWithImage
              imageUrl={getBackgroundImage()}
              intensity="heavy"
              radius="md"
              gradientAccent={{
                colors: getGradientColors(),
                start: { x: 0, y: 0 },
                end: { x: 1, y: 0 }
              }}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: theme.colors.text,
                    fontSize: theme.typography.subheading,
                    marginBottom: theme.spacing(2.5),
                    fontWeight: "600",
                    letterSpacing: -0.2
                  }
                ]}
              >
                Sources
              </Text>
              {data.sources.length === 0 ? (
                <Text
                  style={[
                    styles.emptyText,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.body,
                      lineHeight: theme.typography.body * theme.typography.lineHeight.normal,
                      letterSpacing: 0.1
                    }
                  ]}
                >
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
            </GlassCardWithImage>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
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
        <Text style={{ color: theme.colors.primary, fontSize: 18, fontFamily: "SpaceGrotesk_600SemiBold" }}>{label}</Text>
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
            <Text style={{ color: theme.colors.subtitle, fontFamily: "SpaceGrotesk_500Medium" }}>{stageName}</Text>
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
    flex: 1
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 8 : 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center"
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  scrollView: {
    flex: 1
  },
  content: {
    paddingHorizontal: 20
  },
  contentInner: {
    gap: 16
  },
  sectionLabel: {
    fontWeight: "600"
  },
  sectionTitle: {
    fontWeight: "600",
    letterSpacing: -0.3
  },
  recommendationText: {
    letterSpacing: 0.1
  },
  summaryText: {
    letterSpacing: 0.1
  },
  emptyText: {
    letterSpacing: 0.1
  },
  claimsList: {
    gap: 12
  },
  sourcesList: {
    gap: 12
  }
});

