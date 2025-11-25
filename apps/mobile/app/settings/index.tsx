import { useState } from "react";
import { ScrollView, Switch, Text, View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useTheme } from "../../src/hooks/use-theme";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [credibilityMode, setCredibilityMode] = useState<"standard" | "strict" | "max">("strict");
  const [notifications, setNotifications] = useState({
    analyses: true,
    community: false
  });

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text
            style={[
              styles.headerTitle,
              {
                color: theme.colors.text,
                fontSize: theme.typography.heading,
                fontWeight: "700"
              }
            ]}
          >
            Profile Settings
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: theme.spacing(2),
              paddingBottom: theme.spacing(6),
              gap: theme.spacing(2.5)
            }
          ]}
          showsVerticalScrollIndicator={false}
        >
        <Section title="Theme selector">
          <Text style={{ color: theme.colors.subtitle }}>Following system appearance for now.</Text>
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
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 8 : 16,
    paddingBottom: 12
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  headerTitle: {
    letterSpacing: -0.5
  },
  scrollView: {
    flex: 1
  },
  content: {
    paddingHorizontal: 20
  }
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <GlassCard
      style={{
        borderRadius: theme.radii.lg,
        padding: theme.spacing(2.5),
        gap: theme.spacing(1.5)
      }}
    >
      <Text 
        style={{ 
          color: theme.colors.text, 
          fontFamily: "Inter_600SemiBold",
          fontSize: theme.typography.body,
          marginBottom: theme.spacing(0.5)
        }}
      >
        {title}
      </Text>
      {children}
    </GlassCard>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View 
      style={{ 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center",
        paddingVertical: theme.spacing(0.5)
      }}
    >
      <Text 
        style={{ 
          color: theme.colors.text,
          fontSize: theme.typography.body,
          flex: 1,
          marginRight: theme.spacing(2)
        }}
      >
        {label}
      </Text>
      {value}
    </View>
  );
}

