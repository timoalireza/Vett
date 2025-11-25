import { Text, TouchableOpacity, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../src/hooks/use-theme";
import { GlassCard } from "../../src/components/GlassCard";

export default function PermissionModal() {
  const theme = useTheme();
  const router = useRouter();
  const { type = "media" } = useLocalSearchParams<{ type?: string }>();

  return (
    <View style={{ flex: 1, justifyContent: "center", backgroundColor: "rgba(5,7,13,0.8)", padding: theme.spacing(3) }}>
      <GlassCard
        style={{
          borderRadius: theme.radii.lg,
          padding: theme.spacing(3),
          gap: theme.spacing(2),
          alignItems: "center"
        }}
      >
        <Ionicons name="lock-closed-outline" size={48} color={theme.colors.primary} />
        <Text style={{ color: theme.colors.text, fontSize: 20, fontFamily: "Inter_600SemiBold" }}>
          Give {type === "media" ? "media" : "notification"} access
        </Text>
        <Text style={{ color: theme.colors.subtitle, textAlign: "center", lineHeight: 20 }}>
          We only use this permission to pull attachments directly into a fact-check. Nothing is uploaded without confirmation.
        </Text>
        <TouchableOpacity
          style={{
            width: "100%",
            borderRadius: theme.radii.pill,
            paddingVertical: theme.spacing(1.5),
            backgroundColor: theme.colors.primary
          }}
        >
          <Text style={{ color: theme.colors.background, textAlign: "center" }}>Allow</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: "100%",
            borderRadius: theme.radii.pill,
            paddingVertical: theme.spacing(1.5),
            backgroundColor: theme.colors.card
          }}
        >
          <Text style={{ color: theme.colors.text, textAlign: "center" }}>Not now</Text>
        </TouchableOpacity>
      </GlassCard>
    </View>
  );
}

