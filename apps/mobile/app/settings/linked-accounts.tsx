import { Text, View } from "react-native";

import { useTheme } from "../../src/hooks/use-theme";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";

export default function LinkedAccountsScreen() {
  const theme = useTheme();

  return (
    <GradientBackground>
      <View style={{ flex: 1, padding: theme.spacing(3), gap: theme.spacing(2) }}>
        {["Apple", "Google", "X / Twitter"].map((provider) => (
          <GlassCard key={provider} style={{ padding: theme.spacing(2) }}>
            <Text style={{ color: theme.colors.text }}>{provider}</Text>
            <Text style={{ color: theme.colors.subtitle }}>Not linked</Text>
          </GlassCard>
        ))}
      </View>
    </GradientBackground>
  );
}

