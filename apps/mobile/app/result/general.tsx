import { View, Text } from "react-native";

import { ResultTabConfig, ResultTemplate } from "../../src/screens/ResultTemplate";
import { useTheme } from "../../src/hooks/use-theme";

function Timeline() {
  const theme = useTheme();
  const entries = [
    { time: "10:02", text: "Claim submitted" },
    { time: "10:04", text: "Sources retrieved" },
    { time: "10:06", text: "Verdict drafted" }
  ];
  return (
    <View style={{ padding: theme.spacing(3) }}>
      {entries.map((entry, idx) => (
        <View key={entry.time} style={{ flexDirection: "row", marginBottom: theme.spacing(1.5) }}>
          <View style={{ width: 60 }}>
            <Text style={{ color: theme.colors.subtitle }}>{entry.time}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text }}>{entry.text}</Text>
            {idx < entries.length - 1 && <View style={{ height: 1, backgroundColor: theme.colors.border, marginTop: theme.spacing(1) }} />}
          </View>
        </View>
      ))}
    </View>
  );
}

export default function GeneralResultScreen() {
  const tabs: ResultTabConfig[] = [
    {
      key: "overview",
      label: "Overview",
      content: (
        <View style={{ padding: 16 }}>
          <Text style={{ color: "#fff" }}>Consensus summary placeholder.</Text>
        </View>
      )
    },
    { key: "claims", label: "Claims", content: null },
    { key: "sources", label: "Sources", content: null },
    { key: "bias", label: "Bias/Stats", content: <Timeline /> },
    { key: "community", label: "Community", content: null }
  ];

  return (
    <ResultTemplate
      topic="general"
      title="Did Joe Rogan join Spirit Airlines?"
      platform="Instagram post"
      verdict="False"
      score={8}
      confidence={0.9}
      summary="All references trace back to a satire outlet. No official statements corroborate the hiring rumor."
      tabs={tabs}
    />
  );
}

