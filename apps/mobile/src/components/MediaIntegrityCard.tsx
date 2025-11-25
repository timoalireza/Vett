import { Text, View } from "react-native";
import { MotiView } from "moti";

import { useTheme } from "../hooks/use-theme";

interface MediaIntegrityCardProps {
  reverseHits: number;
  firstSeen: string;
  aiLikelihood: number;
  manipulationScore: number;
}

export function MediaIntegrityCard({
  reverseHits,
  firstSeen,
  aiLikelihood,
  manipulationScore
}: MediaIntegrityCardProps) {
  const theme = useTheme();

  return (
    <MotiView
      from={{ opacity: 0, translateY: 16 }}
      animate={{ opacity: 1, translateY: 0 }}
      style={{
        borderRadius: theme.radii.lg,
        padding: theme.spacing(2),
        backgroundColor: theme.colors.card,
        gap: theme.spacing(1.5)
      }}
    >
      <Row label="Reverse Image Hits" value={`${reverseHits}`} />
      <Row label="First Seen" value={firstSeen} />
      <View>
        <Row label="AI Generation Likelihood" value={`${(aiLikelihood * 100).toFixed(0)}%`} />
        <Progress value={aiLikelihood} color={theme.colors.warning} />
      </View>
      <View>
        <Row label="Manipulation Score" value={`${(manipulationScore * 100).toFixed(0)}%`} />
        <Progress value={manipulationScore} color={theme.colors.danger} />
      </View>
    </MotiView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text
        style={{
          color: theme.colors.subtitle,
          fontFamily: "Inter_400Regular"
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: theme.colors.text,
          fontFamily: "Inter_600SemiBold"
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function Progress({ value, color }: { value: number; color: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        marginTop: 6,
        height: 8,
        borderRadius: theme.radii.pill,
        backgroundColor: theme.colors.surface
      }}
    >
      <View
        style={{
          width: `${Math.min(100, Math.max(0, value * 100))}%`,
          height: "100%",
          backgroundColor: color,
          borderRadius: theme.radii.pill
        }}
      />
    </View>
  );
}

