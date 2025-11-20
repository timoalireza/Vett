import { useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";

import { useTheme } from "../../src/hooks/use-theme";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";

export default function SettingsScreen() {
  const theme = useTheme();
  const [privacy, setPrivacy] = useState(true);
  const [credibilityMode, setCredibilityMode] = useState<"standard" | "strict" | "max">("strict");
  const [notifications, setNotifications] = useState({
    analyses: true,
    community: false
  });

  return (
    <GradientBackground>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: theme.spacing(3), gap: theme.spacing(2) }}>
        <Section title="Theme selector">
          <Text style={{ color: theme.colors.subtitle }}>Following system appearance for now.</Text>
        </Section>
        <Section title="Default analysis privacy">
          <Row label="Private by default" value={<Switch value={privacy} onValueChange={setPrivacy} />} />
        </Section>
        <Section title="Credibility mode">
          <View style={{ flexDirection: "row", gap: theme.spacing(1) }}>
            {(["standard", "strict", "max"] as const).map((mode) => (
              <GlassCard
                key={mode}
                style={{
                  flex: 1,
                  padding: theme.spacing(1.5),
                  backgroundColor: credibilityMode === mode ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"
                }}
              >
                <Text
                  onPress={() => setCredibilityMode(mode)}
                  style={{
                    textAlign: "center",
                    color: theme.colors.text
                  }}
                >
                  {mode.toUpperCase()}
                </Text>
              </GlassCard>
            ))}
          </View>
        </Section>
        <Section title="Notifications">
          <Row label="Analysis complete" value={<Switch value={notifications.analyses} onValueChange={(val) => setNotifications((prev) => ({ ...prev, analyses: val }))} />} />
          <Row label="Community updates" value={<Switch value={notifications.community} onValueChange={(val) => setNotifications((prev) => ({ ...prev, community: val }))} />} />
        </Section>
      </ScrollView>
    </GradientBackground>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <GlassCard
      style={{
        borderRadius: theme.radii.lg,
        padding: theme.spacing(2),
        gap: theme.spacing(1)
      }}
    >
      <Text style={{ color: theme.colors.text, fontFamily: "SpaceGrotesk_600SemiBold" }}>{title}</Text>
      {children}
    </GlassCard>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ color: theme.colors.subtitle }}>{label}</Text>
      {value}
    </View>
  );
}

