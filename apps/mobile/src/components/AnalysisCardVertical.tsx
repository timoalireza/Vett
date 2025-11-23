import { Text, View, StyleSheet, TouchableOpacity, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import { useTheme } from "../hooks/use-theme";
import { getScoreGradient } from "../utils/scoreColors";

interface AnalysisCardVerticalProps {
  id: string;
  title: string;
  score: number;
  topic?: string;
  imageUrl?: string | null;
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
 * Score centered in middle, title below
 * Background image with dark overlay for readability
 */
export function AnalysisCardVertical({
  id,
  title,
  score,
  topic,
  imageUrl,
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
  const getFallbackImageUrl = () => {
    const topicKeywords: Record<string, string> = {
      political: "politics,election,government",
      health: "health,medical,science",
      media: "media,news,technology",
      general: "abstract,modern,minimal"
    };
    const keyword = topicKeywords[topic || "general"] || "abstract";
    // Use Unsplash Source API for random images
    return `https://source.unsplash.com/800x600/?${keyword}`;
  };

  const backgroundImageUrl = imageUrl || getFallbackImageUrl();

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
        {/* Background Image */}
        <Image
          source={{ uri: backgroundImageUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />

        {/* Dark Overlay - Dark enough for text but image still visible */}
        <LinearGradient
          colors={[
            "rgba(0, 0, 0, 0.55)",
            "rgba(0, 0, 0, 0.65)",
            "rgba(0, 0, 0, 0.75)"
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Content - Centered vertically */}
        <View style={styles.content}>
          {/* Score - Centered in middle */}
          <View style={styles.scoreContainer}>
            <Text
              style={[
                styles.scoreLabel,
                {
                  color: "rgba(255, 255, 255, 0.8)",
                  fontSize: 12,
                  letterSpacing: 2,
                  marginBottom: 12
                }
              ]}
            >
              VETT SCORE
            </Text>
            <View
              style={[
                styles.scoreCircle,
                {
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  borderWidth: 3,
                  borderColor: scoreGradient.end,
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
                    fontSize: 40,
                    fontWeight: "700",
                    letterSpacing: -1
                  }
                ]}
              >
                {score}
              </Text>
            </View>
          </View>

          {/* Title - Below score */}
          <View style={styles.titleContainer}>
            <Text
              style={[
                styles.title,
                {
                  color: "#FFFFFF",
                  fontSize: 20,
                  fontWeight: "600",
                  letterSpacing: -0.3,
                  lineHeight: 28,
                  textAlign: "center"
                }
              ]}
              numberOfLines={3}
            >
              {title}
            </Text>
            {topic && (
              <Text
                style={[
                  styles.topicText,
                  {
                    color: "rgba(255, 255, 255, 0.7)",
                    fontSize: 13,
                    letterSpacing: 0.5,
                    marginTop: 8,
                    textTransform: "uppercase",
                    textAlign: "center"
                  }
                ]}
              >
                {topic}
              </Text>
            )}
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
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center"
  },
  scoreContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24
  },
  scoreLabel: {
    fontWeight: "600",
    textTransform: "uppercase"
  },
  scoreCircle: {
    // Styled inline
  },
  scoreValue: {
    lineHeight: 48
  },
  titleContainer: {
    alignItems: "center",
    paddingHorizontal: 16,
    maxWidth: "100%"
  },
  title: {
    lineHeight: 24
  },
  topicText: {
    fontWeight: "500"
  }
});

