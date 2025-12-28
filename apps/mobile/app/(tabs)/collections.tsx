import React, { useCallback, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, SafeAreaView, RefreshControl, Pressable } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-expo";
import { fetchAnalyses } from "../../src/api/analysis";
import { HistoryItem } from "../../src/components/Common/HistoryItem";

function isAuthRequiredError(err: unknown): boolean {
  const message = (err as any)?.message;
  return typeof message === "string" && message.toLowerCase().includes("authentication required");
}

export default function HistoryScreen() {
  const router = useRouter();
  const { isSignedIn, signOut } = useAuth();

  const { data, refetch, isLoading, isError, error } = useQuery({
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
  const authError = isError && isAuthRequiredError(error);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>

      {authError ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Session expired</Text>
          <Text style={styles.emptySubtitle}>Please sign in again to view your history</Text>
          <Pressable
            style={styles.primaryButton}
            onPress={async () => {
              try {
                await signOut();
              } catch {}
              router.replace("/signin");
            }}
          >
            <Text style={styles.primaryButtonText}>Sign in</Text>
          </Pressable>
        </View>
      ) : isError ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Couldn’t load history</Text>
          <Text style={styles.emptySubtitle}>{(error as any)?.message || "Please try again"}</Text>
          <Pressable style={styles.primaryButton} onPress={() => refetch()}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        historyItems.length === 0 && !isLoading ? (
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
        )
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
    fontFamily: "Inter_700Bold",
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
  primaryButton: {
    marginTop: 18,
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#000000",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
