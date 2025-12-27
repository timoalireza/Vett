import { View, Text, Image, TouchableOpacity } from "react-native";

import { ResultTabConfig, ResultTemplate } from "../../src/screens/ResultTemplate";
import { useTheme } from "../../src/hooks/use-theme";
import { MediaIntegrityCard } from "../../src/components/MediaIntegrityCard";

function MediaOverview() {
  const theme = useTheme();
  return (
    <View style={{ padding: theme.spacing(3), gap: theme.spacing(1.5) }}>
      <Text style={{ color: theme.colors.text, fontFamily: "Inter_700Bold" }}>Media integrity</Text>
      <Text style={{ color: theme.colors.subtitle }}>
        Reverse image search linked the viral powerlifting post to an earlier Reuters gallery. Captions were altered to insert fabricated quotes.
      </Text>
      <TouchableOpacity
        style={{
          borderRadius: theme.radii.md,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: theme.colors.border
        }}
      >
        <Image source={{ uri: "https://placehold.co/600x400/png" }} style={{ height: 160 }} />
      </TouchableOpacity>
    </View>
  );
}

export default function MediaResultScreen() {
  const tabs: ResultTabConfig[] = [
    { key: "overview", label: "Overview", content: <MediaOverview /> },
    { key: "claims", label: "Claims", content: null },
    { key: "sources", label: "Sources", content: null },
    { key: "media", label: "Media Integrity", content: <MediaIntegrityCard reverseHits={62} firstSeen="Nov 8, 2025" aiLikelihood={0.37} manipulationScore={0.58} /> },
    { key: "community", label: "Community", content: null }
  ];

  return (
    <ResultTemplate
      topic="media"
      title="Powerlifter breaks record with AI assist?"
      platform="Instagram"
      verdict="Mostly Accurate"
      score={64}
      confidence={0.61}
      summary="Post uses genuine footage but overlays AI narration claiming a banned supplement partnership."
      tabs={tabs}
    />
  );
}

