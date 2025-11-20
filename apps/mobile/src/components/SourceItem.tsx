import { Text, TouchableOpacity, View, StyleSheet, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import { useTheme } from "../hooks/use-theme";

interface SourceItemProps {
  outlet: string;
  reliability: number;
  bias?: "Left" | "Center" | "Right" | string;
  url?: string;
  onPress?: () => void;
}

export function SourceItem({ outlet, reliability, bias, url, onPress }: SourceItemProps) {
  const theme = useTheme();

  const reliabilityColor =
    reliability >= 0.75
      ? theme.colors.success
      : reliability >= 0.5
        ? theme.colors.warning
        : theme.colors.danger;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.container}
      accessibilityLabel={`Source ${outlet}`}
    >
      <BlurView
        intensity={30}
        tint="dark"
        style={[
          styles.blurContainer,
          {
            borderRadius: theme.radii.sm,
            backgroundColor: theme.colors.background + "F0",
            borderWidth: 1,
            borderColor: theme.colors.border
          }
        ]}
      >
        <View style={styles.textBox}>
          <View style={styles.content}>
            <View style={styles.leftSection}>
              <Text
                style={[
                  styles.outletText,
                  {
                    color: theme.colors.text,
                    fontSize: theme.typography.body,
                    fontWeight: "600",
                    letterSpacing: -0.1,
                    lineHeight: theme.typography.body * theme.typography.lineHeight.normal
                  }
                ]}
              >
                {outlet}
              </Text>
              {bias && (
                <Text
                  style={[
                    styles.metaText,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.caption,
                      marginTop: 6,
                      letterSpacing: 0.2,
                      lineHeight: theme.typography.caption * theme.typography.lineHeight.normal
                    }
                  ]}
                >
                  Bias: {bias}
                </Text>
              )}
              {url && (
                <TouchableOpacity
                  onPress={() => {
                    if (onPress) {
                      onPress();
                    } else if (url) {
                      Linking.openURL(url).catch(() => {});
                    }
                  }}
                  activeOpacity={0.7}
                  style={{ marginTop: bias ? 4 : 6 }}
                >
                  <Text
                    style={[
                      styles.urlText,
                      {
                        color: theme.colors.primary,
                        fontSize: theme.typography.caption,
                        letterSpacing: 0.2,
                        textDecorationLine: "underline"
                      }
                    ]}
                    numberOfLines={1}
                  >
                    {url}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.rightSection}>
              <Text
                style={[
                  styles.reliabilityLabel,
                  {
                    color: theme.colors.textTertiary,
                    fontSize: theme.typography.small,
                    letterSpacing: 0.2
                  }
                ]}
              >
                Reliability
              </Text>
              <View style={styles.reliabilityContainer}>
                <Ionicons name="shield-outline" size={16} color={reliabilityColor} />
                <Text
                  style={[
                    styles.reliabilityText,
                    {
                      color: reliabilityColor,
                      fontSize: theme.typography.body,
                      fontWeight: "600",
                      marginLeft: 6,
                      letterSpacing: -0.2
                    }
                  ]}
                >
                  {(reliability * 100).toFixed(0)}%
                </Text>
              </View>
            </View>
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12
  },
  blurContainer: {
    overflow: "hidden"
  },
  textBox: {
    padding: 16
  },
  content: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  leftSection: {
    flex: 1,
    marginRight: 16
  },
  outletText: {
    letterSpacing: -0.2
  },
  metaText: {
    letterSpacing: 0.1
  },
  urlText: {
    letterSpacing: 0.1
  },
  rightSection: {
    alignItems: "flex-end"
  },
  reliabilityLabel: {
    letterSpacing: 0.2,
    marginBottom: 4
  },
  reliabilityContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  reliabilityText: {
    letterSpacing: -0.2
  }
});

