import { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, BackHandler } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";

import { fetchAnalysis } from "../../src/api/analysis";
import { LensMotif } from "../../src/components/Lens/LensMotif";
import { ScoreRing } from "../../src/components/Lens/ScoreRing";
import { ColorTintOverlay } from "../../src/components/Lens/ColorTintOverlay";
import { SummaryCard } from "../../src/components/Results/SummaryCard";
// We don't have ClaimCard yet, reusing SummaryCard style or creating one? 
// Doc says: "ClaimCard", "SummaryCard", "SourcesCard".
// I will create generic Card wrapper or reuse components.
// Let's create a generic Card component in this file or separate.
import { SourcesCard } from "../../src/components/Results/SourcesCard";
import { tokenProvider } from "../../src/api/token-provider";
import { getScoreColor } from "../../src/utils/scoreColors";

// Generic Card Component matching the doc
const Card = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <View style={styles.card}>
    <Text style={styles.cardLabel}>{label}</Text>
    {children}
  </View>
);

export default function ResultScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const { getToken } = useAuth();

  // Ensure token is set
  useEffect(() => {
    const setToken = async () => {
      try {
        const token = await getToken();
        if (token) tokenProvider.setToken(token);
      } catch (e) {
        console.error("Failed to set token", e);
      }
    };
    setToken();
  }, [getToken]);

  const { data: analysis, isLoading, error } = useQuery({
    queryKey: ["analysis", jobId],
    queryFn: () => fetchAnalysis(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "COMPLETED" || status === "FAILED" ? false : 2000;
    },
  });

  // Back handler
  useEffect(() => {
    const backAction = () => {
      router.replace("/(tabs)/analyze");
      return true;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [router]);

  const isCompleted = analysis?.status === "COMPLETED";
  const isFailed = analysis?.status === "FAILED";
  const score = analysis?.score || 0;
  const scoreColor = getScoreColor(score);

  const getVerdictLabel = (s: number) => {
    if (s >= 90) return 'True';
    if (s >= 70) return 'Mostly True';
    if (s >= 55) return 'Mixed';
    if (s >= 45) return 'Mostly False';
    if (s >= 25) return 'False';
    return 'Completely False';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header with lens and score */}
        <View style={styles.header}>
          <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
            <LensMotif size={120} />
            {isCompleted && (
              <>
                <ScoreRing score={score} size={120} />
                <ColorTintOverlay score={score} size={120} />
              </>
            )}
          </View>
          
          {isCompleted ? (
            <>
              <Text style={[styles.scoreValue, { color: scoreColor }]}>
                {score}%
              </Text>
              <Text style={[styles.verdictLabel, { color: scoreColor }]}>
                {getVerdictLabel(score)}
              </Text>
            </>
          ) : isFailed ? (
            <Text style={[styles.loadingText, { color: "#EF4444" }]}>
              Analysis Failed
            </Text>
          ) : (
            <Text style={styles.loadingText}>Analyzing...</Text>
          )}
        </View>
        
        {/* Cards */}
        {isCompleted && (
          <View style={styles.cardsContainer}>
            {/* CLAIM CARD */}
            <Card label="CLAIM">
              <Text style={styles.cardText}>
                "{analysis?.rawInput || analysis?.claims?.[0]?.text || "No claim text detected"}"
              </Text>
            </Card>

            {/* SUMMARY CARD */}
            <Card label="SUMMARY">
              <Text style={styles.cardText}>
                {analysis?.summary || "No summary available."}
              </Text>
            </Card>

            {/* SOURCES CARD */}
            {analysis?.sources && analysis.sources.length > 0 && (
               <SourcesCard sources={analysis.sources} />
            )}
          </View>
        )}
      </ScrollView>

      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.replace("/(tabs)/analyze")}
      >
        <Ionicons name="arrow-back" size={24} color="#8A8A8A" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    alignItems: 'center',
    paddingTop: 20, // Adjusted for SafeAreaView
    paddingBottom: 24,
  },
  scoreValue: {
    marginTop: 16,
    fontFamily: 'Inter_200ExtraLight',
    fontSize: 32,
    color: '#22C55E',
  },
  verdictLabel: {
    marginTop: 4,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  loadingText: {
    marginTop: 24,
    color: '#6B6B6B',
    fontFamily: 'Inter_400Regular',
  },
  cardsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    padding: 16,
    marginBottom: 12,
  },
  cardLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#6B6B6B',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  cardText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#E5E5E5',
    lineHeight: 22,
  },
  backButton: {
    position: "absolute",
    top: 20, // Adjusted for SafeAreaView
    left: 20,
    padding: 8,
  },
});
