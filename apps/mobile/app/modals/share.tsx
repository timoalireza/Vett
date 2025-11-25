import { Text, TouchableOpacity, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

import { useTheme } from "../../src/hooks/use-theme";
import { GlassCard } from "../../src/components/GlassCard";

export default function ShareModal() {
  const theme = useTheme();
  const router = useRouter();
  const { score = "80", verdict = "Mostly Accurate" } = useLocalSearchParams<{ score?: string; verdict?: string }>();

  return (
    <View style={{ flex: 1, justifyContent: "center", backgroundColor: "rgba(5,7,13,0.8)", padding: theme.spacing(3) }}>
      <GlassCard
        style={{
          borderRadius: theme.radii.lg,
          padding: theme.spacing(3),
          gap: theme.spacing(2)
        }}
      >
        <Text style={{ color: theme.colors.text, fontSize: 20, fontFamily: "Inter_600SemiBold" }}>Share report</Text>
        <View
          style={{
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.card,
            padding: theme.spacing(2),
            alignItems: "center",
            gap: theme.spacing(1)
          }}
        >
          <Text style={{ color: theme.colors.subtitle }}>Preview</Text>
          <Text style={{ color: theme.colors.text, fontSize: 32 }}>{score}</Text>
          <Text style={{ color: theme.colors.text }}>{verdict}</Text>
          <Text style={{ color: theme.colors.subtitle }}>Vetted by AI</Text>
        </View>
        <TouchableOpacity
          style={{
            borderRadius: theme.radii.pill,
            paddingVertical: theme.spacing(1.5),
            backgroundColor: theme.colors.primary
          }}
        >
          <Text style={{ color: theme.colors.background, textAlign: "center" }}>Export image</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            borderRadius: theme.radii.pill,
            paddingVertical: theme.spacing(1.5),
            borderWidth: 1,
            borderColor: theme.colors.border
          }}
        >
          <Text style={{ color: theme.colors.text, textAlign: "center" }}>Copy link</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.colors.subtitle, textAlign: "center" }}>Close</Text>
        </TouchableOpacity>
      </GlassCard>
    </View>
  );
}

