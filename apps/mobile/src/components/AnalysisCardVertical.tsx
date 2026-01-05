import { useState } from "react";
import { Text, View, StyleSheet, TouchableOpacity, Modal, Alert, Share, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop, RadialGradient, Rect } from "react-native-svg";

import { useTheme } from "../hooks/use-theme";
import { getScoreGradient } from "../utils/scoreColors";
import { GlassCard } from "./GlassCard";

interface AnalysisCardVerticalProps {
  id: string;
  title: string;
  score: number;
  verdict?: string | null;
  topic?: string;
  createdAt?: string;
  onPress?: () => void;
  onResubmit?: (id: string, title: string) => void;
  onDelete?: (id: string) => void;
  onShare?: (id: string, title: string, score: number) => void;
  // Epistemic scoring
  scoreBand?: string | null;
}

/**
 * Vertical rectangular card for analysis display
 * Redesigned to match reference: Dark background, horizontal layout, large score ring
 */
export function AnalysisCardVertical({
  id,
  title,
  score,
  verdict,
  topic,
  createdAt,
  onPress,
  onResubmit,
  onDelete,
  onShare,
  scoreBand
}: AnalysisCardVerticalProps) {
  const theme = useTheme();
  const router = useRouter();
  // Use epistemic scoreBand for gradient if available
  const scoreGradient = getScoreGradient(score, verdict ?? null, scoreBand);
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
      if (isNaN(date.getTime())) return "";
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      if (isNaN(diffMs)) return "";
      
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays} days ago`;
      
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
  const MAX_TITLE_LENGTH = 80; // Increased length since we're using numberOfLines
  const displayTitle = title; // Let Text component handle truncation visually via numberOfLines

  const handleMenuPress = (e: any) => {
    e.stopPropagation();
    setMenuVisible(true);
  };

  const handleResubmit = () => {
    setMenuVisible(false);
    if (onResubmit) {
      onResubmit(id, title);
    } else {
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
            backgroundColor: "#1C1C1E", // Dark charcoal from reference
            borderRadius: 20,
            borderColor: "rgba(255, 255, 255, 0.05)",
            borderWidth: 1
          }
        ]}
      >
        <View style={styles.contentRow}>
          {/* Left Content */}
          <View style={styles.leftContent}>
            <Text
              style={[
                styles.title,
                {
                  color: "#FFFFFF",
                  fontSize: 17,
                  fontFamily: "Inter_700Bold",
                  lineHeight: 22,
                  marginBottom: 8
                }
              ]}
              numberOfLines={3}
            >
              {displayTitle}
            </Text>
            
            <View style={styles.metadataContainer}>
              {topic && (
                <Text
                  style={[
                    styles.topicText,
                    {
                      color: "rgba(255, 255, 255, 0.5)",
                      fontSize: 11,
                      fontFamily: "Inter_500Medium",
                      letterSpacing: 0.5,
                      textTransform: "uppercase"
                    }
                  ]}
                >
                  {topic}
                </Text>
              )}
              {createdAt && (
                <Text
                  style={[
                    styles.dateText,
                    {
                      color: "rgba(255, 255, 255, 0.5)",
                      fontSize: 11,
                      fontFamily: "Inter_400Regular"
                    }
                  ]}
                >
                  {formatDate(createdAt)}
                </Text>
              )}
            </View>
          </View>

          {/* Right Content - Score Ring */}
          <View style={styles.rightContent}>
            {/* Menu Button - Positioned top right of the card, not overlapping ring */}
            <TouchableOpacity
              onPress={handleMenuPress}
              style={styles.menuButton}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="rgba(255, 255, 255, 0.6)" />
            </TouchableOpacity>

            <View style={{ position: "relative", width: 72, height: 72, alignItems: "center", justifyContent: "center", marginTop: 24 }}>
              {/* Atmospheric Glow - scaled down version of result page effect */}
              <View style={{ position: "absolute", width: 200, height: 200, top: "50%", left: "50%", marginTop: -100, marginLeft: -100 }}>
                <Svg width={200} height={200} style={{ position: "absolute" }}>
                  <Defs>
                    <RadialGradient
                      id={`glow-${id}`}
                      cx="50%"
                      cy="50%"
                      rx="50%"
                      ry="50%"
                      fx="50%"
                      fy="50%"
                    >
                      <Stop offset="0%" stopColor={scoreGradient.end} stopOpacity={0.12} />
                      <Stop offset="25%" stopColor={scoreGradient.end} stopOpacity={0.08} />
                      <Stop offset="50%" stopColor={scoreGradient.end} stopOpacity={0.04} />
                      <Stop offset="75%" stopColor={scoreGradient.end} stopOpacity={0.01} />
                      <Stop offset="100%" stopColor={scoreGradient.end} stopOpacity={0} />
                    </RadialGradient>
                  </Defs>
                  <Rect x="0" y="0" width="200" height="200" fill={`url(#glow-${id})`} />
                </Svg>
              </View>
              
              <Svg width={72} height={72}>
                <Defs>
                  <SvgLinearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor={scoreGradient.start} />
                    <Stop offset="100%" stopColor={scoreGradient.end} />
                  </SvgLinearGradient>
                </Defs>
                {/* Background Circle - Matches Result Page style */}
                <Circle
                  cx={36}
                  cy={36}
                  r={32}
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth={8}
                  fill="transparent"
                />
                {/* Progress Circle */}
                <Circle
                  cx={36}
                  cy={36}
                  r={32}
                  stroke={`url(#grad-${id})`}
                  strokeWidth={8}
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  strokeDashoffset={2 * Math.PI * 32 * (1 - score / 100)}
                  strokeLinecap="round"
                  transform={`rotate(-90 36 36)`}
                />
              </Svg>
              <Text
                style={{
                  position: "absolute",
                  color: "#FFFFFF",
                  fontSize: 20,
                  fontFamily: "Inter_700Bold",
                  letterSpacing: -0.5
                }}
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
                <Text style={[styles.menuItemText, { color: theme.colors.text }]}>
                  Resubmit
                </Text>
              </TouchableOpacity>

              <View style={[styles.menuDivider, { backgroundColor: theme.colors.border }]} />

              <TouchableOpacity
                onPress={handleShare}
                style={styles.menuItem}
                activeOpacity={0.7}
              >
                <Ionicons name="share-outline" size={20} color={theme.colors.text} />
                <Text style={[styles.menuItemText, { color: theme.colors.text }]}>
                  Share
                </Text>
              </TouchableOpacity>

              <View style={[styles.menuDivider, { backgroundColor: theme.colors.border }]} />

              <TouchableOpacity
                onPress={handleDelete}
                style={styles.menuItem}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                <Text style={[styles.menuItemText, { color: theme.colors.danger }]}>
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
    marginBottom: 12
  },
  card: {
    width: "100%",
    minHeight: 120,
    padding: 20,
    position: "relative",
    overflow: "visible"
  },
  contentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  leftContent: {
    flex: 1,
    marginRight: 16,
    justifyContent: "center",
    paddingVertical: 4
  },
  rightContent: {
    alignItems: "flex-end", // Align to right
    justifyContent: "flex-start",
    position: "relative",
    minWidth: 80
  },
  title: {
    // Styled inline
  },
  metadataContainer: {
    flexDirection: "column",
    gap: 4
  },
  topicText: {
    // Styled inline
  },
  dateText: {
    // Styled inline
  },
  menuButton: {
    position: "absolute",
    top: -12, // Adjusted to be at the very top right of the card container context
    right: -12,
    padding: 8,
    zIndex: 10
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center"
  },
  menuContainer: {
    width: 250
  },
  menuCard: {
    padding: 8,
    backgroundColor: "#2C2C2E"
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 8
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "500"
  },
  menuDivider: {
    height: 1,
    marginHorizontal: 16,
    opacity: 0.1
  }
});

