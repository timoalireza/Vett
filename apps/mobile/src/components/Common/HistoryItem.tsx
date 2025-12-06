import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getScoreColor } from "../../utils/scoreColors";

interface HistoryItemProps {
  item: {
    id: string;
    score: number | null;
    claims?: Array<{ text: string }>;
    createdAt: string;
  };
  onPress: () => void;
}

export const HistoryItem: React.FC<HistoryItemProps> = ({ item, onPress }) => {
  const scoreColor = getScoreColor(item.score || 0);
  const date = new Date(item.createdAt);
  const timeAgo = getTimeAgo(date);
  const claimText = item.claims && item.claims.length > 0 ? item.claims[0].text : "Analyzed Claim";

  return (
    <Pressable onPress={onPress} style={styles.container}>
      {/* Mini score indicator */}
      <View style={[styles.scoreBadge, { borderColor: scoreColor }]}>
        <Text style={[styles.scoreText, { color: scoreColor }]}>
          {Math.round(item.score || 0)}%
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.claimText}>
          {claimText}
        </Text>
        <Text style={styles.timeText}>{timeAgo}</Text>
      </View>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={20} color="#4A4A4A" />
    </Pressable>
  );
};

function getTimeAgo(date: Date) {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return "Just now";
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0A0A0A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1A1A1A",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  scoreBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#000000",
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  content: {
    flex: 1,
  },
  claimText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#E5E5E5",
  },
  timeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#6B6B6B",
    marginTop: 4,
  },
});

