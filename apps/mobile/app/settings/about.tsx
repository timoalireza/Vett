import { Text, View } from "react-native";

import { useTheme } from "../../src/hooks/use-theme";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";

export default function AboutScreen() {
  const theme = useTheme();

  return (
    <GradientBackground>
      <View
        style={{
          flex: 1,
          padding: theme.spacing(3),
          gap: theme.spacing(2)
        }}
      >
        <GlassCard style={{ padding: theme.spacing(2) }}>
          <Text style={{ color: theme.colors.text, fontSize: 22, fontFamily: "SpaceGrotesk_600SemiBold" }}>About Vett</Text>
          <Text style={{ color: theme.colors.subtitle, lineHeight: 20, marginTop: theme.spacing(1) }}>
            Vett is a fact-checking assistant that blends human-first UX with automated retrieval, claim extraction, and verdict reasoning. This build is UI-only for internal testing.
          </Text>
        </GlassCard>
      </View>
    </GradientBackground>
  );
}

