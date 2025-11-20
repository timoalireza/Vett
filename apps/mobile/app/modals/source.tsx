import { Text, TouchableOpacity, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

import { useTheme } from "../../src/hooks/use-theme";
import { GlassCard } from "../../src/components/GlassCard";

export default function SourceModal() {
  const theme = useTheme();
  const router = useRouter();
  const { outlet = "Source", score = "0.8" } = useLocalSearchParams<{ outlet?: string; score?: string }>();

  return (
    <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(5,7,13,0.7)" }}>
      <GlassCard
        style={{
          borderTopLeftRadius: theme.radii.lg,
          borderTopRightRadius: theme.radii.lg,
          padding: theme.spacing(3),
          gap: theme.spacing(2)
        }}
      >
        <Text style={{ color: theme.colors.text, fontSize: 18, fontFamily: "SpaceGrotesk_600SemiBold" }}>{outlet}</Text>
        <Text style={{ color: theme.colors.subtitle }}>Reliability: {(Number(score) * 100).toFixed(0)}%</Text>
        <Text style={{ color: theme.colors.subtitle }}>Bias badge: Center</Text>
        <TouchableOpacity
          style={{
            borderRadius: theme.radii.md,
            padding: theme.spacing(1.5),
            backgroundColor: theme.colors.card
          }}
        >
          <Text style={{ color: theme.colors.primary, textAlign: "center" }}>Open link</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            borderRadius: theme.radii.pill,
            paddingVertical: theme.spacing(1.25),
            backgroundColor: theme.colors.primary
          }}
        >
          <Text
            style={{
              color: theme.colors.background,
              textAlign: "center",
              fontSize: 16
            }}
          >
            Close
          </Text>
        </TouchableOpacity>
      </GlassCard>
    </View>
  );
}

