import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, StyleSheet, Platform, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";

import { useTheme } from "../../src/hooks/use-theme";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";
import { GlassChip } from "../../src/components/GlassChip";
import { AnalysisCard } from "../../src/components/AnalysisCard";
import { fetchAnalysis } from "../../src/api/analysis";

// Empty array - analyses will be fetched from API when available
const mockAnalyses: Array<{
  id: string;
  title: string;
  score: number;
  imageUrl?: string | null;
}> = [];

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
        <View style={styles.header}>
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
          mockAnalyses.length > 0 ? (
            <View style={styles.feed}>
              {mockAnalyses.map((analysis, index) => {
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
                  onPress={() => router.push("/(tabs)/analyze")}
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
