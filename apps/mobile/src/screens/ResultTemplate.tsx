import { ReactNode, useEffect, useState } from "react";
import { AccessibilityInfo, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

import { ResultHeader } from "../components/ResultHeader";
import { ClaimItem } from "../components/ClaimItem";
import { SourceItem } from "../components/SourceItem";
import { BiasSpectrum } from "../components/BiasSpectrum";
import { CorrelationCard } from "../components/CorrelationCard";
import { MediaIntegrityCard } from "../components/MediaIntegrityCard";
import { useTheme } from "../hooks/use-theme";
import { dummyClaims, dummySources } from "../data/dummy";
import { GradientBackground } from "../components/GradientBackground";

type TabKey = "overview" | "claims" | "sources" | "bias" | "media" | "community";

export interface ResultTabConfig {
  key: TabKey;
  label: string;
  content: ReactNode;
}

interface ResultTemplateProps {
  topic: string;
  title: string;
  platform: string;
  verdict: string;
  score: number;
  confidence: number;
  summary: string;
  tabs: ResultTabConfig[];
}

export function ResultTemplate({
  topic,
  title,
  platform,
  verdict,
  score,
  confidence,
  summary,
  tabs
}: ResultTemplateProps) {
  const theme = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(tabs[0].key);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`Loaded ${topic} result`);
  }, [topic]);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${tabs.find((tab) => tab.key === activeTab)?.label} tab selected`);
  }, [activeTab, tabs]);

  const handleClaimPress = (claim: string) => {
    router.push({
      pathname: "/modals/claim",
      params: { text: claim, score: score.toString(), verdict }
    });
  };

  const handleSourcePress = (source: string) => {
    router.push({
      pathname: "/modals/source",
      params: { outlet: source, score: "0.88" }
    });
  };

  return (
    <GradientBackground>
      <ScrollView
        style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: theme.spacing(6) }}
      stickyHeaderIndices={[1]}
    >
      <View style={{ padding: theme.spacing(3) }}>
        <ResultHeader
          title={title}
          platform={platform}
          verdict={verdict}
          confidence={confidence}
          score={score}
          onShare={() =>
            router.push({
              pathname: "/modals/share",
              params: { score: score.toString(), verdict }
            })
          }
          onSave={() => router.push("/collections")}
        />
        <Text
          style={{
            color: theme.colors.subtitle,
            marginTop: theme.spacing(2),
            lineHeight: 20
          }}
        >
          {summary}
        </Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          backgroundColor: theme.colors.background,
          paddingHorizontal: theme.spacing(2),
          gap: theme.spacing(1)
        }}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              paddingVertical: theme.spacing(1),
              borderBottomWidth: 2,
              borderBottomColor: activeTab === tab.key ? theme.colors.primary : "transparent"
            }}
            accessibilityLabel={`Open ${tab.label} tab`}
          >
            <Text
              style={{
                textAlign: "center",
                color: activeTab === tab.key ? theme.colors.text : theme.colors.subtitle,
                fontFamily: "SpaceGrotesk_500Medium"
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {tabs.map((tab) => (
        <View key={tab.key} style={{ display: activeTab === tab.key ? "flex" : "none" }}>
          {tab.content}
        </View>
      ))}
      <View style={{ padding: theme.spacing(3), gap: theme.spacing(1.5) }}>
        {activeTab === "claims" &&
          dummyClaims.map((claim) => (
            <ClaimItem key={claim.text} text={claim.text} verdict={claim.verdict} confidence={claim.confidence} onPress={() => handleClaimPress(claim.text)} />
          ))}
        {activeTab === "sources" &&
          dummySources.map((source) => (
            <SourceItem key={source.outlet} outlet={source.outlet} reliability={source.reliability} bias={source.bias} onPress={() => handleSourcePress(source.outlet)} />
          ))}
        {activeTab === "bias" && (
          <View style={{ gap: theme.spacing(2) }}>
            <BiasSpectrum position={0.3} />
            <View
              style={{
                borderRadius: theme.radii.md,
                backgroundColor: theme.colors.card,
                padding: theme.spacing(2)
              }}
            >
              <Text style={{ color: theme.colors.subtitle }}>Example headlines across the spectrum</Text>
              {["Left: WHO expands emergency powers", "Center: WHO pact focuses on coordination", "Right: Treaty erodes sovereignty"].map((headline) => (
                <Text key={headline} style={{ color: theme.colors.text, marginTop: theme.spacing(1) }}>
                  {headline}
                </Text>
              ))}
            </View>
          </View>
        )}
        {activeTab === "media" && <MediaIntegrityCard reverseHits={34} firstSeen="Oct 3, 2025" aiLikelihood={0.22} manipulationScore={0.14} />}
        {activeTab === "overview" && (
          <View
            style={{
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.surface,
              padding: theme.spacing(2)
            }}
          >
            <Text style={{ color: theme.colors.text, fontFamily: "SpaceGrotesk_600SemiBold" }}>{topic.toUpperCase()} OVERVIEW</Text>
            <Text style={{ color: theme.colors.subtitle, marginTop: theme.spacing(1) }}>
              This is a placeholder overview detailing how the verdict was reached. Replace with real pipeline output once backend wiring is ready.
            </Text>
          </View>
        )}
        {activeTab === "community" && (
          <View style={{ gap: theme.spacing(1) }}>
            {["Analyst Jalen flagged low-trust blog", "Community requested additional WHO source"].map((item) => (
              <Text key={item} style={{ color: theme.colors.subtitle }}>
                • {item}
              </Text>
            ))}
          </View>
        )}
        {activeTab === "bias" && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[0.82, 0.66, 0.53].map((value, idx) => (
              <CorrelationCard key={idx} title={`Signal ${idx + 1}`} correlation={value} confidenceInterval="0.45–0.91" sampleSize={1200 + idx * 100} delay={idx * 120} />
            ))}
          </ScrollView>
        )}
      </View>
      </ScrollView>
    </GradientBackground>
  );
}

