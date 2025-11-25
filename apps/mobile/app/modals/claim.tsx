import { Text, TouchableOpacity, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

import { useTheme } from "../../src/hooks/use-theme";
import { GlassCard } from "../../src/components/GlassCard";

export default function ClaimModal() {
  const theme = useTheme();
  const router = useRouter();
  const { text = "Claim placeholder", verdict = "False", score = "0" } = useLocalSearchParams<{
    text?: string;
    verdict?: string;
    score?: string;
  }>();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(5,7,13,0.7)"
      }}
    >
      <GlassCard
        style={{
          borderTopLeftRadius: theme.radii.lg,
          borderTopRightRadius: theme.radii.lg,
          padding: theme.spacing(3),
          gap: theme.spacing(2)
        }}
      >
        <View style={{ alignItems: "center" }}>
          <View style={{ width: 48, height: 4, borderRadius: 2, backgroundColor: theme.colors.border }} />
        </View>
        <Text style={{ color: theme.colors.subtitle, fontSize: 12 }}>Claim</Text>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontFamily: "Inter_500Medium" }}>{text}</Text>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between"
          }}
        >
          <View>
            <Text style={{ color: theme.colors.subtitle }}>Verdict</Text>
            <Text style={{ color: theme.colors.text, fontSize: 20 }}>{verdict}</Text>
          </View>
          <View>
            <Text style={{ color: theme.colors.subtitle }}>Confidence</Text>
            <Text style={{ color: theme.colors.text, fontSize: 20 }}>{score}%</Text>
          </View>
        </View>
        <View>
          <Text style={{ color: theme.colors.subtitle, marginBottom: 6 }}>Reasoning</Text>
          <Text style={{ color: theme.colors.subtitle }}>
            Placeholder reasoning explaining how the pipeline weighted evidence and penalties.
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            borderRadius: theme.radii.pill,
            paddingVertical: theme.spacing(1.5),
            backgroundColor: theme.colors.primary,
            alignItems: "center"
          }}
        >
          <Text style={{ color: theme.colors.background, fontSize: 16 }}>Close</Text>
        </TouchableOpacity>
      </GlassCard>
    </View>
  );
}

