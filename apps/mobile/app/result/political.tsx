import { Text, View } from "react-native";

import { ResultTabConfig, ResultTemplate } from "../../src/screens/ResultTemplate";
import { useTheme } from "../../src/hooks/use-theme";

function PoliticalOverview() {
  const theme = useTheme();
  return (
    <View style={{ padding: theme.spacing(3), gap: theme.spacing(1.5) }}>
      <Text style={{ color: theme.colors.text, fontFamily: "SpaceGrotesk_600SemiBold" }}>Consensus summary</Text>
      <Text style={{ color: theme.colors.subtitle }}>
        Independent fact-checkers agree the WHO treaty does not override the constitutions of EU member states. Our retrieval pulled 11 vetted sources with high concordance.
      </Text>
    </View>
  );
}

function BiasStats() {
  const theme = useTheme();
  return (
    <View style={{ padding: theme.spacing(3), gap: theme.spacing(1) }}>
      <Text style={{ color: theme.colors.text, fontFamily: "SpaceGrotesk_600SemiBold" }}>Community</Text>
      <Text style={{ color: theme.colors.subtitle }}>Analysts favor center-left outlets for treaty coverage. Conservative commentators question sovereignty safeguards.</Text>
    </View>
  );
}

export default function PoliticalResultScreen() {
  const tabs: ResultTabConfig[] = [
    { key: "overview", label: "Overview", content: <PoliticalOverview /> },
    { key: "claims", label: "Claims", content: null },
    { key: "sources", label: "Sources", content: null },
    { key: "bias", label: "Bias/Stats", content: <BiasStats /> },
    { key: "community", label: "Community", content: null }
  ];

  return (
    <ResultTemplate
      topic="political"
      title="EU secretly ceded pandemic power to WHO?"
      platform="Politico link"
      verdict="False"
      score={12}
      confidence={0.93}
      summary="Cold-start verdict: No evidence that the EU adopted a treaty granting WHO direct control over member pandemic responses."
      tabs={tabs}
    />
  );
}

