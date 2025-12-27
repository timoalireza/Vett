import { ScrollView, Text, View } from "react-native";

import { ResultTabConfig, ResultTemplate } from "../../src/screens/ResultTemplate";
import { useTheme } from "../../src/hooks/use-theme";
import { CorrelationCard } from "../../src/components/CorrelationCard";

function HealthOverview() {
  const theme = useTheme();
  return (
    <View style={{ padding: theme.spacing(3), gap: theme.spacing(1.5) }}>
      <Text style={{ color: theme.colors.text, fontFamily: "Inter_700Bold" }}>Clinical snapshot</Text>
      <Text style={{ color: theme.colors.subtitle }}>
        CDC, WHO, and peer-reviewed cohort studies confirm flu shots remain recommended for pregnant people in 2025. Our ingestion flagged policy memos supporting continuity of care.
      </Text>
    </View>
  );
}

function EvidenceQuality() {
  const theme = useTheme();
  return (
    <View style={{ padding: theme.spacing(3) }}>
      <Text style={{ color: theme.colors.text, fontSize: 18, marginBottom: theme.spacing(1) }}>Evidence quality</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {["Clinical trials", "Systematic reviews", "Fact-check partners"].map((label, idx) => (
          <View
            key={label}
            style={{
              width: 180,
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.card,
              padding: theme.spacing(2),
              marginRight: theme.spacing(2)
            }}
          >
            <Text style={{ color: theme.colors.text, fontFamily: "Inter_500Medium" }}>{label}</Text>
            <Text style={{ color: theme.colors.subtitle, marginTop: 6 }}>Quality: {["High", "Medium", "High"][idx]}</Text>
            <Text style={{ color: theme.colors.subtitle }}>n = {120 + idx * 30}</Text>
          </View>
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: theme.spacing(2) }}>
        {[0.82, 0.74].map((value, idx) => (
          <CorrelationCard key={idx} title={idx === 0 ? "Adoption vs risk drop" : "Myth virality"} correlation={value} confidenceInterval="0.55–0.90" sampleSize={1800 + idx * 400} delay={idx * 120} />
        ))}
      </ScrollView>
    </View>
  );
}

export default function HealthResultScreen() {
  const tabs: ResultTabConfig[] = [
    { key: "overview", label: "Overview", content: <HealthOverview /> },
    { key: "claims", label: "Claims", content: null },
    { key: "sources", label: "Sources", content: null },
    { key: "bias", label: "Bias/Stats", content: <EvidenceQuality /> },
    { key: "community", label: "Community", content: null }
  ];

  return (
    <ResultTemplate
      topic="health"
      title="CDC halted flu shots for pregnancy?"
      platform="Health blog screenshot"
      verdict="Partially Accurate"
      score={46}
      confidence={0.72}
      summary="Policy review indicates certain waivers expired, but core immunization guidance is unchanged."
      tabs={tabs}
    />
  );
}

