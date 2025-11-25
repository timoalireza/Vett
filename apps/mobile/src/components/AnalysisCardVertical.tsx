import { useState } from "react";
import { Text, View, StyleSheet, TouchableOpacity, Modal, Alert, Share, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../hooks/use-theme";
import { getScoreGradient } from "../utils/scoreColors";
import { GlassCard } from "./GlassCard";

interface AnalysisCardVerticalProps {
  id: string;
  title: string;
  score: number;
  topic?: string;
  createdAt?: string;
  onPress?: () => void;
  onResubmit?: (id: string, title: string) => void;
  onDelete?: (id: string) => void;
  onShare?: (id: string, title: string, score: number) => void;
}

/**
 * Vertical rectangular card for analysis display
 * Background image visible at top, blur effect on bottom portion
 * Bottom section: Title/Topic/Date on left, Score circle on right
 */
export function AnalysisCardVertical({
  id,
  title,
  score,
  topic,
  createdAt,
  onPress,
  onResubmit,
  onDelete,
  onShare
}: AnalysisCardVerticalProps) {
  const theme = useTheme();
  const router = useRouter();
  const scoreGradient = getScoreGradient(score);
  const [menuVisible, setMenuVisible] = useState(false);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/result/${id}`);
    }
  };


  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      // Check if date is valid - Invalid Date objects return NaN for getTime()
      if (isNaN(date.getTime())) return "";
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      // Additional check: if diffMs is NaN, return empty string
      if (isNaN(diffMs)) return "";
      
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays} days ago`;
      
      // Fix Bug 1: Use singular/plural forms correctly
      const weeks = Math.floor(diffDays / 7);
      if (diffDays < 30) return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
      
      const months = Math.floor(diffDays / 30);
      if (diffDays < 365) return `${months} ${months === 1 ? "month" : "months"} ago`;
      
      const years = Math.floor(diffDays / 365);
      return `${years} ${years === 1 ? "year" : "years"} ago`;
    } catch {
      return "";
    }
  };

  // Truncate title if too long
  const MAX_TITLE_LENGTH = 60;
  const displayTitle = title.length > MAX_TITLE_LENGTH 
    ? title.substring(0, MAX_TITLE_LENGTH).trim() + "..." 
    : title;

  const handleMenuPress = (e: any) => {
    e.stopPropagation();
    setMenuVisible(true);
  };

  const handleResubmit = () => {
    setMenuVisible(false);
    if (onResubmit) {
      onResubmit(id, title);
    } else {
      // Default: navigate to analyze screen
      router.push("/(tabs)/analyze?openSheet=true");
    }
  };

  const handleDelete = () => {
    setMenuVisible(false);
    Alert.alert(
      "Delete Analysis",
      "Are you sure you want to delete this analysis? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (onDelete) {
              onDelete(id);
            }
          }
        }
      ]
    );
  };

  const handleShare = async () => {
    setMenuVisible(false);
    if (onShare) {
      onShare(id, title, score);
    } else {
      // Default: use React Native Share API
      try {
        const shareUrl = `https://vett.app/result/${id}`;
        const message = `Vett Score: ${score}\n${title}\n\nView full analysis: ${shareUrl}`;
        
        await Share.share({
          message: Platform.OS === "ios" ? message : message,
          url: Platform.OS === "ios" ? shareUrl : undefined,
          title: "Share Analysis"
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.9}
      style={styles.container}
    >
      <View
        style={[
          styles.card,
          {
            borderRadius: theme.radii.lg,
            overflow: "hidden",
            backgroundColor: theme.colors.card
          }
        ]}
      >
        {/* Menu Icon - Top Right */}
        <TouchableOpacity
          onPress={handleMenuPress}
          style={styles.menuButton}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.menuButtonBackground,
              {
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                borderRadius: theme.radii.pill
              }
            ]}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
        </View>
        </TouchableOpacity>

        {/* Content section */}
        <View style={styles.bottomSection}>
          {/* Left side: Title, Topic, Date */}
          <View style={styles.leftContent}>
            <Text
              style={[
                styles.title,
                {
                  color: theme.colors.text,
                  fontSize: 18,
                  fontWeight: "600",
                  letterSpacing: -0.3,
                  lineHeight: 24,
                  marginBottom: 8
                }
              ]}
              numberOfLines={2}
            >
              {displayTitle}
            </Text>
            {topic && (
              <Text
                style={[
                  styles.topicText,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: 12,
                    letterSpacing: 0.5,
                    marginBottom: 4,
                    textTransform: "uppercase",
                    fontWeight: "500"
                  }
                ]}
                numberOfLines={1}
              >
                {topic}
              </Text>
            )}
            {createdAt && (
              <Text
                style={[
                  styles.dateText,
                  {
                    color: theme.colors.textTertiary,
                    fontSize: 11,
                    letterSpacing: 0.3
                  }
                ]}
              >
                {formatDate(createdAt)}
              </Text>
            )}
          </View>

          {/* Right side: Score circle (open at top) */}
          <View style={styles.scoreContainer}>
            <View
              style={[
                styles.scoreCircle,
                {
                  width: 80,
                  height: 80,
                  borderWidth: 4,
                  borderColor: scoreGradient.end,
                  borderTopWidth: 0, // Open at top
                  borderRadius: 40,
                  backgroundColor: "rgba(0, 0, 0, 0.4)",
                  alignItems: "center",
                  justifyContent: "center"
                }
              ]}
            >
              <Text
                style={[
                  styles.scoreValue,
                  {
                    color: scoreGradient.end,
                    fontSize: 32,
                    fontWeight: "700",
                    letterSpacing: -1
                  }
                ]}
              >
                {score}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <GlassCard
              radius="md"
              intensity="heavy"
              style={styles.menuCard}
            >
              <TouchableOpacity
                onPress={handleResubmit}
                style={styles.menuItem}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={20} color={theme.colors.text} />
                <Text
                  style={[
                    styles.menuItemText,
                    {
                      color: theme.colors.text,
                      fontSize: theme.typography.body
                    }
                  ]}
                >
                  Resubmit
                </Text>
              </TouchableOpacity>

              <View
                style={[
                  styles.menuDivider,
                  {
                    backgroundColor: theme.colors.border,
                    height: 1,
                    marginVertical: theme.spacing(1)
                  }
                ]}
              />

              <TouchableOpacity
                onPress={handleShare}
                style={styles.menuItem}
                activeOpacity={0.7}
              >
                <Ionicons name="share-outline" size={20} color={theme.colors.text} />
                <Text
                  style={[
                    styles.menuItemText,
                    {
                      color: theme.colors.text,
                      fontSize: theme.typography.body
                    }
                  ]}
                >
                  Share
                </Text>
              </TouchableOpacity>

              <View
                style={[
                  styles.menuDivider,
                  {
                    backgroundColor: theme.colors.border,
                    height: 1,
                    marginVertical: theme.spacing(1)
                  }
                ]}
              />

              <TouchableOpacity
                onPress={handleDelete}
                style={styles.menuItem}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                <Text
                  style={[
                    styles.menuItemText,
                    {
                      color: theme.colors.danger,
                      fontSize: theme.typography.body
                    }
                  ]}
                >
                  Delete
                </Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        </TouchableOpacity>
      </Modal>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 16
  },
  card: {
    width: "100%",
    height: 260, // Rectangular aspect ratio - taller than wide
    position: "relative"
  },
  bottomSection: {
    flexDirection: "row",
    padding: 20,
    paddingTop: 24,
    justifyContent: "space-between",
    alignItems: "flex-start",
    minHeight: 120
  },
  leftContent: {
    flex: 1,
    marginRight: 16,
    justifyContent: "flex-start"
  },
  title: {
    lineHeight: 22
  },
  topicText: {
    // Styled inline
  },
  dateText: {
    // Styled inline
  },
  scoreContainer: {
    alignItems: "center",
    justifyContent: "center"
  },
  scoreCircle: {
    // Styled inline
  },
  scoreValue: {
    lineHeight: 38
  },
  menuButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10
  },
  menuButtonBackground: {
    padding: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center"
  },
  menuContainer: {
    width: "80%",
    maxWidth: 300
  },
  menuCard: {
    padding: 8
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 8
  },
  menuItemText: {
    fontWeight: "500",
    letterSpacing: 0.1
  },
  menuDivider: {
    // Styled inline
  }
});

