import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "../hooks/use-theme";
import { GlassCard } from "./GlassCard";
import { GlassChip } from "./GlassChip";

interface ReportCardProps {
  title: string;
  subtitle: string;
  badge?: string;
  score?: number;
  topic?: string;
  gradientColors?: string[];
  onPress?: () => void;
}

export function ReportCard({
  title,
  subtitle,
  badge,
  score,
  topic,
  gradientColors,
  onPress
}: ReportCardProps) {
  const theme = useTheme();

  const getGradientColors = (): string[] => {
    if (gradientColors) return gradientColors;
    if (topic) {
      const gradients: Record<string, string[]> = {
        political: [theme.colors.primary, theme.colors.secondary],
        health: [theme.colors.highlight, theme.colors.primary],
        media: [theme.colors.secondary, theme.colors.highlight],
        general: [theme.colors.primary, theme.colors.secondary]
      };
      return gradients[topic] || gradients.general;
    }
    return [theme.colors.primary, theme.colors.secondary];
  };

  const colors = getGradientColors();

  return (
    <GlassCard
      radius="md"
      style={styles.card}
      gradientAccent={{
        colors,
        start: { x: 0, y: 0 },
        end: { x: 1, y: 0 }
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={styles.content}
        accessibilityLabel={`Report ${title}`}
      >
        <View style={styles.header}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: colors[0] + "30",
                borderRadius: theme.radii.sm,
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center"
              }
            ]}
          >
            <Ionicons name="document-text-outline" size={20} color={colors[0]} />
          </View>
          {badge && (
            <GlassChip label={badge} gradientColors={colors} />
          )}
        </View>

        <Text
          style={[
            styles.title,
            {
              color: theme.colors.text,
              fontSize: theme.typography.subheading,
              marginTop: theme.spacing(1.5),
              lineHeight: theme.typography.subheading * theme.typography.lineHeight.tight
            }
          ]}
          numberOfLines={2}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.subtitle,
            {
              color: theme.colors.textSecondary,
              fontSize: theme.typography.caption,
              marginTop: theme.spacing(0.5),
              lineHeight: theme.typography.caption * theme.typography.lineHeight.normal
            }
          ]}
          numberOfLines={2}
        >
          {subtitle}
        </Text>

        {score !== undefined && (
          <View style={styles.footer}>
            <View
              style={[
                styles.scoreBadge,
                {
                  backgroundColor: colors[0] + "30",
                  borderRadius: theme.radii.xs,
                  paddingHorizontal: theme.spacing(1.5),
                  paddingVertical: 4
                }
              ]}
            >
              <Text
                style={[
                  styles.scoreText,
                  {
                    color: theme.colors.text,
                    fontSize: theme.typography.caption,
                    fontWeight: "600"
                  }
                ]}
              >
                {score}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 220,
    marginRight: 16,
    overflow: "hidden"
  },
  content: {
    padding: 20
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  iconContainer: {
    // Styled inline
  },
  title: {
    fontWeight: "600",
    letterSpacing: -0.3
  },
  subtitle: {
    letterSpacing: 0.1
  },
  footer: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center"
  },
  scoreBadge: {
    // Styled inline
  },
  scoreText: {
    letterSpacing: 0.2
  }
});


