import { useState, useCallback, useEffect, useMemo } from "react";
import { ScrollView, Text, TouchableOpacity, View, StyleSheet, Platform, FlatList, Modal, Alert } from "react-native";
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
import { AnalysisCardVertical } from "../../src/components/AnalysisCardVertical";
import { fetchAnalyses } from "../../src/api/analysis";

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
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<"date_desc" | "date_asc" | "score_desc" | "score_asc">("date_desc");
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
    
    let filtered = analysesData.edges
      .filter((edge) => edge.node.status === "COMPLETED")
      .map((edge) => {
        const node = edge.node;
        let topic = node.topic?.toLowerCase() || "general";
        if (!node.topic && node.bias) {
          topic = "political";
        }
        return {
          id: node.id,
          title: node.claims?.[0]?.text || node.summary || "Analysis",
          topic: topic,
          score: node.score ?? 0,
          verdict: node.verdict ?? null,
          createdAt: node.createdAt
        };
      });

    // Apply filters
    if (selectedTopic) {
      filtered = filtered.filter(a => a.topic === selectedTopic);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortOption) {
        case "date_desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "date_asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "score_desc":
          return b.score - a.score;
        case "score_asc":
          return a.score - b.score;
        default:
          return 0;
      }
    });

    return filtered;
  }, [analysesData, selectedTopic, sortOption]);

  const handleResubmit = useCallback((id: string, title: string) => {
    router.push(`/(tabs)/analyze?openSheet=true`);
    // Note: The analyze screen will need to handle pre-filling the input
  }, [router]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const { deleteAnalysis } = await import("@/src/api/analysis");
      await deleteAnalysis(id);
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
    } catch (error) {
      console.error("Failed to delete analysis:", error);
      // Show error toast or alert
      Alert.alert("Error", "Failed to delete analysis. Please try again.");
    }
  }, [queryClient]);

  const handleShare = useCallback((id: string, title: string, score: number) => {
    router.push({
      pathname: "/modals/share",
      params: {
        score: score.toString(),
        verdict: "Analysis",
        analysisId: id
      }
    });
  }, [router]);

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
            onPress={() => setFilterVisible(true)}
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
              {selectedTopic ? `${selectedTopic.charAt(0).toUpperCase() + selectedTopic.slice(1)} • ` : ""}
              {sortOption === "date_desc" ? "Newest" : 
               sortOption === "date_asc" ? "Oldest" :
               sortOption === "score_desc" ? "High Score" : "Low Score"}
            </Text>
            <Ionicons name="chevron-down" size={14} color={theme.colors.textSecondary} style={{ marginLeft: "auto" }} />
          </TouchableOpacity>
        </GlassCard>

        {/* Filter Modal */}
        <Modal
          visible={filterVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setFilterVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setFilterVisible(false)}
          >
            <View style={styles.filterModalContent}>
              <GlassCard radius="lg" intensity="heavy" style={styles.filterModalCard}>
                <View style={styles.filterSection}>
                  <Text style={[styles.filterSectionTitle, { color: theme.colors.text }]}>Sort By</Text>
                  <View style={styles.filterOptions}>
                    {[
                      { label: "Newest", value: "date_desc" },
                      { label: "Oldest", value: "date_asc" },
                      { label: "High Score", value: "score_desc" },
                      { label: "Low Score", value: "score_asc" }
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.filterOption,
                          sortOption === option.value && { backgroundColor: theme.colors.primary + "30" }
                        ]}
                        onPress={() => setSortOption(option.value as any)}
                      >
                        <Text
                          style={[
                            styles.filterOptionText,
                            { 
                              color: sortOption === option.value ? theme.colors.primary : theme.colors.textSecondary 
                            }
                          ]}
                        >
                          {option.label}
                        </Text>
                        {sortOption === option.value && (
                          <Ionicons name="checkmark" size={16} color={theme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={[styles.filterDivider, { backgroundColor: theme.colors.border }]} />

                <View style={styles.filterSection}>
                  <Text style={[styles.filterSectionTitle, { color: theme.colors.text }]}>Filter Topic</Text>
                  <View style={styles.filterOptions}>
                    <TouchableOpacity
                      style={[
                        styles.filterOption,
                        selectedTopic === null && { backgroundColor: theme.colors.primary + "30" }
                      ]}
                      onPress={() => setSelectedTopic(null)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          { 
                            color: selectedTopic === null ? theme.colors.primary : theme.colors.textSecondary 
                          }
                        ]}
                      >
                        All Topics
                      </Text>
                      {selectedTopic === null && (
                        <Ionicons name="checkmark" size={16} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                    
                    {["political", "health", "media", "general"].map((topic) => (
                      <TouchableOpacity
                        key={topic}
                        style={[
                          styles.filterOption,
                          selectedTopic === topic && { backgroundColor: theme.colors.primary + "30" }
                        ]}
                        onPress={() => setSelectedTopic(topic)}
                      >
                        <Text
                          style={[
                            styles.filterOptionText,
                            { 
                              color: selectedTopic === topic ? theme.colors.primary : theme.colors.textSecondary 
                            }
                          ]}
                        >
                          {topic.charAt(0).toUpperCase() + topic.slice(1)}
                        </Text>
                        {selectedTopic === topic && (
                          <Ionicons name="checkmark" size={16} color={theme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.filterCloseButton, { backgroundColor: theme.colors.card }]}
                  onPress={() => setFilterVisible(false)}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "600" }}>Done</Text>
                </TouchableOpacity>
              </GlassCard>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Analysis Feed */}
        {mode === "reports" ? (
          userAnalyses.length > 0 ? (
            <View style={styles.analysesList}>
              {userAnalyses.map((analysis) => {
                return (
                  <AnalysisCardVertical
                    key={analysis.id}
                    id={analysis.id}
                    title={analysis.title}
                    score={analysis.score}
                    verdict={analysis.verdict}
                    topic={analysis.topic}
                    createdAt={analysis.createdAt}
                    onResubmit={handleResubmit}
                    onDelete={handleDelete}
                    onShare={handleShare}
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
  analysesList: {
    gap: 16
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  filterModalContent: {
    width: "100%",
    maxWidth: 320
  },
  filterModalCard: {
    padding: 20
  },
  filterSection: {
    gap: 12
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4
  },
  filterOptions: {
    gap: 8
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: "500"
  },
  filterDivider: {
    height: 1,
    opacity: 0.1,
    marginVertical: 16
  },
  filterCloseButton: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8
  }
});
