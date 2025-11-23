import { useState, useCallback, useEffect } from "react";
import { ScrollView, Text, TouchableOpacity, View, StyleSheet, Platform, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-expo";
import { tokenProvider } from "../../src/api/token-provider";

import { useTheme } from "../../src/hooks/use-theme";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";
import { GlassChip } from "../../src/components/GlassChip";
import { AnalysisCard } from "../../src/components/AnalysisCard";
import { fetchAnalyses } from "../../src/api/analysis";
import { useMemo } from "react";

const getTopicGradient = (topic: string): string[] => {
  const gradients: Record<string, string[]> = {
    political: ["#5A7BC4", "#8A7FA8"],
    health: ["#6BA8B8", "#5A8FD4"],
    media: ["#8A7FA8", "#6BA88A"],
    general: ["#6B8FD4", "#8A8D92"]
  };
  return gradients[topic] || gradients.general;
};

export default function CollectionsScreen() {
  const theme = useTheme();
  const [mode, setMode] = useState<"reports" | "folders">("reports");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSignedIn, getToken } = useAuth();

  // Update token provider when auth state changes
  useEffect(() => {
    const updateToken = async () => {
      if (isSignedIn && getToken) {
        try {
          const token = await getToken();
          tokenProvider.setToken(token);
          console.log("[Collections] Token set in provider:", !!token);
        } catch (error) {
          console.error("[Collections] Error getting token:", error);
          tokenProvider.setToken(null);
        }
      } else {
        tokenProvider.setToken(null);
      }
    };
    updateToken();
  }, [isSignedIn, getToken]);

  // Fetch user's analyses for history
  const { data: analysesData, refetch: refetchAnalyses, error: analysesError, isLoading: analysesLoading } = useQuery({
    queryKey: ["analyses", "history"],
    queryFn: async () => {
      try {
        const result = await fetchAnalyses(50);
        console.log("[Collections] Fetched analyses:", result?.edges?.length || 0, "analyses");
        console.log("[Collections] Analyses data:", JSON.stringify(result, null, 2));
        return result;
      } catch (error) {
        console.error("[Collections] Error fetching analyses:", error);
        throw error;
      }
    },
    enabled: isSignedIn ?? false,
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true // Refetch when screen comes into focus
  });

  // Log authentication and query state
  useEffect(() => {
    console.log("[Collections] Auth state:", { isSignedIn, analysesLoading, error: analysesError?.message });
    if (analysesData) {
      console.log("[Collections] Analyses count:", analysesData?.edges?.length || 0);
    }
  }, [isSignedIn, analysesData, analysesLoading, analysesError]);

  // Refetch analyses when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isSignedIn) {
        // Small delay to ensure backend has processed any new analyses
        setTimeout(() => {
          refetchAnalyses();
          queryClient.invalidateQueries({ queryKey: ["analyses"] });
        }, 500);
      }
    }, [isSignedIn, refetchAnalyses, queryClient])
  );

  const userAnalyses = useMemo(() => {
    if (!analysesData?.edges) return [];
    return analysesData.edges
      .filter((edge) => edge.node.status === "COMPLETED")
      .map((edge) => ({
        id: edge.node.id,
        title: edge.node.summary?.substring(0, 100) || "Analysis",
        score: edge.node.score ?? 0,
        imageUrl: edge.node.imageUrl || null
      }));
  }, [analysesData]);

  return (
    <GradientBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Platform.OS === "ios" ? 60 : 40,
            paddingBottom: 120 // Space for tab bar
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { marginBottom: theme.spacing(1) }]}>
          <Text
            style={[
              styles.headerTitle,
              {
                color: theme.colors.text,
                fontSize: theme.typography.heading,
                lineHeight: theme.typography.heading * theme.typography.lineHeight.tight
              }
            ]}
          >
            History
          </Text>
          <Text
            style={[
              styles.headerSubtitle,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.typography.body,
                marginTop: theme.spacing(0.5)
              }
            ]}
          >
            Chronological feed of all analyses
          </Text>
        </View>

        {/* Filter/Sort Glass Button */}
        <GlassCard radius="md" style={styles.filterCard}>
          <TouchableOpacity
            style={styles.filterButton}
            activeOpacity={0.7}
            onPress={() => {
              // TODO: Open filter modal
            }}
          >
            <Ionicons name="filter-outline" size={18} color={theme.colors.textSecondary} />
            <Text
              style={[
                styles.filterText,
                {
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.caption
                }
              ]}
            >
              Filter & Sort
            </Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Analysis Feed */}
        {mode === "reports" ? (
          userAnalyses.length > 0 ? (
            <View style={styles.feed}>
              {userAnalyses.map((analysis) => {
                return (
                  <AnalysisCard
                    key={analysis.id}
                    id={analysis.id}
                    title={analysis.title}
                    score={analysis.score}
                    imageUrl={analysis.imageUrl}
                  />
                );
              })}
            </View>
          ) : (
            <GlassCard radius="lg" style={styles.emptyState} intensity="light">
              <View style={styles.emptyContent}>
                <View
                  style={[
                    styles.emptyIcon,
                    {
                      backgroundColor: theme.colors.card,
                      borderRadius: theme.radii.lg,
                      width: 80,
                      height: 80,
                      alignItems: "center",
                      justifyContent: "center"
                    }
                  ]}
                >
                  <Ionicons name="document-text-outline" size={40} color={theme.colors.textSecondary} />
                </View>
                <Text
                  style={[
                    styles.emptyTitle,
                    {
                      color: theme.colors.text,
                      fontSize: theme.typography.subheading,
                      marginTop: theme.spacing(2.5)
                    }
                  ]}
                >
                  No analyses yet
                </Text>
                <Text
                  style={[
                    styles.emptySubtitle,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.body,
                      marginTop: theme.spacing(1),
                      textAlign: "center"
                    }
                  ]}
                >
                  Your fact-checking history will appear here
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    // Navigate to analyze tab and open the sheet
                    router.push("/(tabs)/analyze?openSheet=true");
                  }}
                  style={[
                    styles.emptyButton,
                    {
                      borderRadius: theme.radii.pill,
                      backgroundColor: theme.colors.primary,
                      paddingHorizontal: theme.spacing(3),
                      paddingVertical: theme.spacing(1.5),
                      marginTop: theme.spacing(3)
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.emptyButtonText,
                      {
                        color: theme.colors.text,
                        fontSize: theme.typography.body,
                        fontWeight: "600"
                      }
                    ]}
                  >
                    Run an Analysis
                  </Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          )
        ) : (
          <View style={styles.foldersContainer}>
            {["Elections", "Health", "Media Integrity"].map((folder, index) => {
              const gradients = [
                ["#5A7BC4", "#8A7FA8"],
                ["#6BA8B8", "#5A8FD4"],
                ["#8A7FA8", "#6BA88A"]
              ];
              return (
                <GlassCard
                  key={folder}
                  radius="md"
                  style={{ marginBottom: theme.spacing(2) }}
                  gradientAccent={{
                    colors: gradients[index],
                    start: { x: 0, y: 0 },
                    end: { x: 1, y: 0 }
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.folderItem,
                      {
                        padding: theme.spacing(2.5),
                        flexDirection: "row",
                        alignItems: "center",
                        gap: theme.spacing(2)
                      }
                    ]}
                  >
                    <View
                      style={[
                        styles.folderIcon,
                        {
                          backgroundColor: gradients[index][0] + "30",
                          borderRadius: theme.radii.md,
                          width: 48,
                          height: 48,
                          alignItems: "center",
                          justifyContent: "center"
                        }
                      ]}
                    >
                      <Ionicons name="folder-open-outline" size={24} color={gradients[index][0]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.folderName,
                          {
                            color: theme.colors.text,
                            fontSize: theme.typography.body,
                            fontWeight: "600"
                          }
                        ]}
                      >
                        {folder}
                      </Text>
                      <Text
                        style={[
                          styles.folderHint,
                          {
                            color: theme.colors.textSecondary,
                            fontSize: theme.typography.caption,
                            marginTop: 2
                          }
                        ]}
                      >
                        Tap to start curating
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
                  </TouchableOpacity>
                </GlassCard>
              );
            })}
          </View>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    paddingHorizontal: 20,
    gap: 20
  },
  header: {
    marginBottom: 4
  },
  headerTitle: {
    fontWeight: "600",
    letterSpacing: -0.5
  },
  headerSubtitle: {
    letterSpacing: 0.2
  },
  filterCard: {
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  filterText: {
    fontWeight: "500",
    letterSpacing: 0.3,
    textTransform: "uppercase"
  },
  feed: {
    gap: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between"
  },
  analysisTile: {
    overflow: "hidden"
  },
  tileContent: {
    padding: 20
  },
  tileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  tileDate: {
    letterSpacing: 0.2
  },
  tileTitle: {
    fontWeight: "600",
    letterSpacing: -0.3
  },
  tileSummary: {
    letterSpacing: 0.1
  },
  tileFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  scoreBadge: {
    // Styled inline
  },
  scoreText: {
    letterSpacing: 0.2
  },
  verdictText: {
    letterSpacing: 0.1
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyContent: {
    alignItems: "center"
  },
  emptyIcon: {
    // Styled inline
  },
  emptyTitle: {
    fontWeight: "600",
    letterSpacing: -0.3
  },
  emptySubtitle: {
    letterSpacing: 0.1,
    maxWidth: 240
  },
  emptyButton: {
    // Styled inline
  },
  emptyButtonText: {
    letterSpacing: 0.2
  },
  foldersContainer: {
    gap: 12
  },
  folderItem: {
    // Styled inline
  },
  folderIcon: {
    // Styled inline
  },
  folderName: {
    letterSpacing: 0.1
  },
  folderHint: {
    letterSpacing: 0.1
  }
});
