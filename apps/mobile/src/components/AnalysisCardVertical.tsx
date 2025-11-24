import { Text, View, StyleSheet, TouchableOpacity, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";

import { useTheme } from "../hooks/use-theme";
import { getScoreGradient } from "../utils/scoreColors";

interface AnalysisCardVerticalProps {
  id: string;
  title: string;
  score: number;
  topic?: string;
  imageUrl?: string | null;
  createdAt?: string;
  imageAttribution?: {
    photographer?: string;
    photographerProfileUrl?: string;
    unsplashPhotoUrl?: string;
    isGenerated?: boolean;
  } | null;
  onPress?: () => void;
}

/**
 * Vertical rectangular card for analysis display
 * Background image with blur on top portion
 * Bottom section: Title/Topic/Date on left, Score circle on right
 */
export function AnalysisCardVertical({
  id,
  title,
  score,
  topic,
  imageUrl,
  createdAt,
  imageAttribution,
  onPress
}: AnalysisCardVerticalProps) {
  const theme = useTheme();
  const router = useRouter();
  const scoreGradient = getScoreGradient(score);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/result/${id}`);
    }
  };

  // Generate fallback Unsplash image URL based on topic
  // Prefer photorealistic documentary-style images
  const getFallbackImageUrl = () => {
    const topicKeywords: Record<string, string> = {
      political: "politics,election,government,documentary,professional",
      health: "health,medical,science,laboratory,professional",
      media: "media,news,technology,professional,documentary",
      general: "documentary,professional,photorealistic,neutral"
    };
    const keyword = topicKeywords[topic || "general"] || "documentary,professional,photorealistic";
    // Use Unsplash Source API for random images - prefer documentary style
    return `https://source.unsplash.com/800x600/?${keyword}`;
  };

  const backgroundImageUrl = imageUrl || getFallbackImageUrl();

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
            overflow: "hidden"
          }
        ]}
      >
        {/* Background Image - Full card */}
        <Image
          source={{ uri: backgroundImageUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />

        {/* Blur effect on top portion (about 2/3 down) */}
        <View style={styles.blurContainer}>
          <BlurView
            intensity={60}
            tint="dark"
            style={styles.blurView}
          />
          {/* Gradient fade at bottom of blur to smooth transition */}
          <LinearGradient
            colors={["transparent", "rgba(0, 0, 0, 0.3)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.blurFade}
          />
        </View>

        {/* Bottom section with content */}
        <View style={styles.bottomSection}>
          {/* Left side: Title, Topic, Date */}
          <View style={styles.leftContent}>
            <Text
              style={[
                styles.title,
                {
                  color: "#FFFFFF",
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
                    color: "rgba(255, 255, 255, 0.7)",
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
                    color: "rgba(255, 255, 255, 0.6)",
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
  blurContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "66%", // Blur about 2/3 of the card
    overflow: "hidden"
  },
  blurView: {
    flex: 1
  },
  blurFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 20 // Smooth transition
  },
  bottomSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "34%", // Bottom 1/3 of card
    flexDirection: "row",
    padding: 20,
    paddingTop: 24,
    justifyContent: "space-between",
    alignItems: "flex-start"
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
  }
});

