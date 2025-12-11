import React, { useCallback, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, SafeAreaView, RefreshControl } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-expo";
import { fetchAnalyses } from "../../src/api/analysis";
import { tokenProvider } from "../../src/api/token-provider";
import { HistoryItem } from "../../src/components/Common/HistoryItem";

export default function HistoryScreen() {
  const router = useRouter();
  const { isSignedIn, getToken } = useAuth();
  
  // Update token provider
  useEffect(() => {
    const updateToken = async () => {
      if (isSignedIn && getToken) {
        try {
          const token = await getToken();
          tokenProvider.setToken(token);
        } catch (error) {
          console.error("[History] Error getting token:", error);
          tokenProvider.setToken(null);
        }
      } else {
        tokenProvider.setToken(null);
      }
    };
    updateToken();
  }, [isSignedIn, getToken]);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["analyses", "history"],
    queryFn: () => fetchAnalyses(20),
    enabled: !!isSignedIn,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const historyItems = data?.edges?.map((edge: any) => edge.node) || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>

      {historyItems.length === 0 && !isLoading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No claims analyzed yet</Text>
          <Text style={styles.emptySubtitle}>Submit one to get started</Text>
        </View>
      ) : (
        <FlatList
          data={historyItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#FFF" />}
          renderItem={({ item }) => (
            <HistoryItem 
              item={item} 
              onPress={() => router.push(`/result/${item.id}`)} 
            />
          )}
        />
      )}
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
    paddingBottom: 24,
  },
  title: {
    fontFamily: "Inter_200ExtraLight",
    fontSize: 28,
    color: "#FFFFFF",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
  emptyTitle: {
    marginTop: 24,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#4A4A4A",
  },
  emptySubtitle: {
    marginTop: 8,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#3A3A3A",
  },
});
