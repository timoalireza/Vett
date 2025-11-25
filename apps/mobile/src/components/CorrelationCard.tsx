import { Text, View } from "react-native";
import { MotiView } from "moti";

import { useTheme } from "../hooks/use-theme";

interface CorrelationCardProps {
  title: string;
  correlation: number;
  confidenceInterval: string;
  sampleSize: number;
  delay?: number;
}

export function CorrelationCard({
  title,
  correlation,
  confidenceInterval,
  sampleSize,
  delay = 0
}: CorrelationCardProps) {
  const theme = useTheme();

  const color =
    Math.abs(correlation) > 0.7 ? theme.colors.success : Math.abs(correlation) > 0.4 ? theme.colors.warning : theme.colors.danger;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ delay, type: "timing", duration: 400 }}
      style={{
        borderRadius: theme.radii.md,
        backgroundColor: theme.colors.card,
        padding: theme.spacing(2),
        marginRight: theme.spacing(2),
        width: 200
      }}
      accessible
      accessibilityLabel={`${title} correlation ${correlation}`}
    >
      <Text
        style={{
          color: theme.colors.subtitle,
          fontFamily: "Inter_400Regular",
          marginBottom: theme.spacing(1)
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: color,
          fontSize: 28,
          fontFamily: "Inter_600SemiBold"
        }}
      >
        r = {correlation.toFixed(2)}
      </Text>
      <Text
        style={{
          color: theme.colors.subtitle,
          fontSize: 14,
          marginTop: theme.spacing(1),
          fontFamily: "Inter_400Regular"
        }}
      >
        CI {confidenceInterval}
      </Text>
      <Text
        style={{
          color: theme.colors.subtitle,
          fontSize: 12,
          marginTop: theme.spacing(0.5)
        }}
      >
        n = {sampleSize.toLocaleString()}
      </Text>
    </MotiView>
  );
}

