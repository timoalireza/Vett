import { View, Text, ScrollView } from "react-native";

import { useTheme } from "../src/hooks/use-theme";
import { GradientBackground } from "../src/components/GradientBackground";
import { GlassCard } from "../src/components/GlassCard";

const states = [
  { title: "No Internet", message: "Reconnect to continue fact-checking." },
  { title: "Unsupported link", message: "We can’t parse this site yet." },
  { title: "Timeout", message: "Retrieval stalled. Retry in a few seconds." },
  { title: "Empty result", message: "Insufficient evidence surfaced. Try adding context." },
  { title: "Crash fallback", message: "Something broke. We sandboxed the error and preserved your draft." }
];

export default function ErrorStatesScreen() {
  const theme = useTheme();

  return (
    <GradientBackground>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: theme.spacing(3), gap: theme.spacing(2) }}
      >
        {states.map((state) => (
          <GlassCard
            key={state.title}
            style={{
              borderRadius: theme.radii.lg,
              padding: theme.spacing(2)
            }}
          >
            <Text style={{ color: theme.colors.text, fontSize: 18 }}>{state.title}</Text>
            <Text style={{ color: theme.colors.subtitle, marginTop: theme.spacing(0.5) }}>{state.message}</Text>
          </GlassCard>
        ))}
      </ScrollView>
    </GradientBackground>
  );
}

