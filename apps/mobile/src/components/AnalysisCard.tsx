import { Text, View, StyleSheet, TouchableOpacity, Image, Linking } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import { useTheme } from "../hooks/use-theme";
import { getTopicGradient } from "../utils/topicGradients";
import { getScoreGradient } from "../utils/scoreColors";

interface AnalysisCardProps {
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
 * Square glass card with gradient background for analysis display
 * Similar to discovery/local services cards with image backgrounds
 */
export function AnalysisCard({
  id,
  title,
  score,
  topic,
  imageUrl,
  imageAttribution,
  onPress
}: AnalysisCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const topicGradient = getTopicGradient(topic);
  const scoreGradient = getScoreGradient(score);
  
  // Only show attribution for Unsplash images (not DALL-E generated)
  const showAttribution = imageAttribution && !imageAttribution.isGenerated && imageAttribution.photographer;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/result/${id}`);
    }
  };

  // Fallback gradient colors if no image
  const fallbackGradient = [
    theme.colors.primary + "80",
    theme.colors.secondary + "60",
    theme.colors.highlight + "40"
  ];

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
            aspectRatio: 1,
            overflow: "hidden"
          }
        ]}
      >
        {/* Background Image or Gradient */}
        {imageUrl ? (
          <>
            <Image
              source={{ uri: imageUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
            <BlurView
              intensity={40}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={[
                "rgba(10, 14, 26, 0.85)",
                "rgba(10, 14, 26, 0.75)",
                "rgba(10, 14, 26, 0.85)"
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </>
        ) : (
          <LinearGradient
            colors={fallbackGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}

        {/* Topic-based gradient accent bar */}
        <LinearGradient
          colors={topicGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientAccent}
        />

        {/* Content */}
        <View style={styles.content}>
          {/* Title */}
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.text,
                fontSize: theme.typography.subheading,
                fontWeight: "700",
                letterSpacing: -0.3
              }
            ]}
            numberOfLines={3}
          >
            {title}
          </Text>

          {/* Bottom section: Score and Topic */}
          <View style={styles.bottomSection}>
            {/* Score Badge */}
            <View
              style={[
                styles.scoreBadge,
                {
                  backgroundColor: theme.colors.background + "E0",
                  borderRadius: theme.radii.pill,
                  borderWidth: 1,
                  borderColor: theme.colors.border
                }
              ]}
            >
              <Text
                style={[
                  styles.scoreLabel,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.small,
                    letterSpacing: 0.5
                  }
                ]}
              >
                VETT SCORE
              </Text>
              <Text
                style={[
                  styles.scoreValue,
                  {
                    color: scoreGradient.end,
                    fontSize: theme.typography.heading,
                    fontWeight: "700",
                    letterSpacing: -0.5
                  }
                ]}
              >
                {score}
              </Text>
            </View>
            
            {/* Topic */}
            {topic && (
              <Text
                style={[
                  styles.topicText,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.caption,
                    letterSpacing: 0.3
                  }
                ]}
                numberOfLines={1}
              >
                {topic}
              </Text>
            )}
          </View>

          {/* Minimal Unsplash Attribution - White text, no background */}
          {showAttribution && (
            <TouchableOpacity
              onPress={() => {
                const url = imageAttribution.photographerProfileUrl || imageAttribution.unsplashPhotoUrl;
                if (url) {
                  Linking.openURL(url).catch(() => {});
                }
              }}
              activeOpacity={0.7}
              style={styles.attribution}
            >
              <Text
                style={[
                  styles.attributionText,
                  {
                    color: "#FFFFFF",
                    fontSize: 9,
                    letterSpacing: 0.3,
                    opacity: 0.8
                  }
                ]}
              >
                Photo by {imageAttribution.photographer} from Unsplash
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "48%",
    marginBottom: 16
  },
  card: {
    width: "100%",
    position: "relative"
  },
  gradientAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    opacity: 0.8
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between"
  },
  title: {
    flex: 1,
    lineHeight: 24,
    marginBottom: 16
  },
  bottomSection: {
    gap: 8
  },
  scoreBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    minWidth: 100
  },
  topicText: {
    fontWeight: "500"
  },
  scoreLabel: {
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: 4
  },
  scoreValue: {
    lineHeight: 36
  },
  attribution: {
    position: "absolute",
    bottom: 8,
    right: 8,
    paddingHorizontal: 0,
    paddingVertical: 0
  },
  attributionText: {
    textAlign: "right"
  }
});

