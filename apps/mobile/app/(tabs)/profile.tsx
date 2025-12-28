import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Pressable, Linking, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import { fetchAnalyses } from "../../src/api/analysis";
import { SettingsRow } from "../../src/components/Common/SettingsRow";

// Time saved calculation based on complexity
const COMPLEXITY_TIMES = {
  simple: 30, // seconds
  medium: 60, // seconds
  complex: 120, // seconds
};

function formatTimeSaved(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return "<1 min";
  }
  
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} hr ${minutes} min`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useUser();

  // Fetch all analyses for statistics
  const { data: analysesData } = useQuery({
    queryKey: ["analyses", "all"],
    queryFn: async () => {
      let allAnalyses: any[] = [];
      let hasNextPage = true;
      let after: string | undefined = undefined;
      
      while (hasNextPage) {
        const result = await fetchAnalyses(100, after);
        allAnalyses = [...allAnalyses, ...result.edges.map(edge => edge.node)];
        hasNextPage = result.pageInfo.hasNextPage;
        after = result.pageInfo.endCursor || undefined;
      }
      
      return allAnalyses;
    },
    enabled: !!user,
  });

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!analysesData || analysesData.length === 0) {
      return {
        analysesRun: 0,
        averageScore: 0,
        timeSaved: 0,
      };
    }

    const completedAnalyses = analysesData.filter(
      (analysis) => analysis.status === "COMPLETED" && analysis.score !== null
    );

    const analysesRun = completedAnalyses.length;
    
    const averageScore = completedAnalyses.length > 0
      ? Math.round(
          completedAnalyses.reduce((sum, a) => sum + (a.score || 0), 0) / completedAnalyses.length
        )
      : 0;

    const totalSeconds = completedAnalyses.reduce((sum, analysis) => {
      const complexity = (analysis.complexity || "medium").toLowerCase() as keyof typeof COMPLEXITY_TIMES;
      const timeForAnalysis = COMPLEXITY_TIMES[complexity] || COMPLEXITY_TIMES.medium;
      return sum + timeForAnalysis;
    }, 0);

    return {
      analysesRun,
      averageScore,
      timeSaved: totalSeconds,
    };
  }, [analysesData]);

  const handleSignOut = async () => {
    try {
      await signOut();
      // Always restart onboarding from the beginning after an explicit sign out.
      // NOTE: We must route directly to /onboarding/welcome (not /onboarding) because
      // /onboarding/index redirects onboarded users into the main app.
      router.replace("/onboarding/welcome");
    } catch (error) {
      console.error("Sign out error:", error);
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* User section */}
        <View style={styles.userSection}>
          {/* Statistics */}
          <View style={styles.statisticsContainer}>
            <View style={styles.statisticItem}>
              <Text style={styles.statisticValue}>{statistics.analysesRun}</Text>
              <Text style={styles.statisticLabel}>Analyses Run</Text>
            </View>
            <View style={styles.statisticItem}>
              <Text style={styles.statisticValue}>{statistics.averageScore}</Text>
              <Text style={styles.statisticLabel}>Average Score</Text>
            </View>
            <View style={styles.statisticItem}>
              <Text style={styles.statisticValue}>{formatTimeSaved(statistics.timeSaved)}</Text>
              <Text style={styles.statisticLabel}>Time Saved</Text>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Settings list */}
        <View style={styles.settingsList}>
          <SettingsRow 
            icon="settings-outline" 
            label="Settings" 
            onPress={() => router.push("/settings")} 
          />
          <SettingsRow 
            icon="help-circle-outline" 
            label="Help & Support" 
            onPress={() => Linking.openURL("mailto:support@vett.app")} 
          />
          <SettingsRow 
            icon="document-text-outline" 
            label="Terms & Privacy" 
            onPress={() => router.push("/settings/terms")} 
          />
        </View>

        {/* Sign out */}
        <View style={styles.signOutContainer}>
          <Pressable onPress={handleSignOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: "#FFFFFF",
  },
  userSection: {
    alignItems: "center",
    paddingVertical: 32,
  },
  statisticsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  statisticItem: {
    alignItems: "center",
    flex: 1,
  },
  statisticValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  statisticLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#8A8A8A",
    textAlign: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#1A1A1A",
    marginHorizontal: 16,
  },
  settingsList: {
    paddingTop: 24,
    paddingHorizontal: 16,
    gap: 8,
  },
  signOutContainer: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 40,
  },
  signOutButton: {
    backgroundColor: "#0A0A0A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1A1A1A",
    paddingVertical: 16,
    alignItems: "center",
  },
  signOutText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#EF4444",
  },
});
