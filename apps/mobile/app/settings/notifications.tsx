import { useState } from "react";
import { ScrollView, Switch, Text, View, StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useTheme } from "../../src/hooks/use-theme";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";

export default function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [notifications, setNotifications] = useState({
    analyses: true,
    community: false,
    marketing: false
  });

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
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
            Notifications
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: theme.spacing(2),
              paddingBottom: theme.spacing(6)
            }
          ]}
        >
          <GlassCard radius="lg" intensity="medium">
            <Row
              label="Analysis Complete"
              description="Get notified when your fact-check analysis is ready"
              value={
                <Switch
                  value={notifications.analyses}
                  onValueChange={(val) => setNotifications((prev) => ({ ...prev, analyses: val }))}
                />
              }
            />
            <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
            <Row
              label="Community Updates"
              description="News and updates from the Vett community"
              value={
                <Switch
                  value={notifications.community}
                  onValueChange={(val) => setNotifications((prev) => ({ ...prev, community: val }))}
                />
              }
            />
            <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
            <Row
              label="Marketing"
              description="Product updates and promotional content"
              value={
                <Switch
                  value={notifications.marketing}
                  onValueChange={(val) => setNotifications((prev) => ({ ...prev, marketing: val }))}
                />
              }
            />
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function Row({ label, description, value }: { label: string; description?: string; value: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text
          style={[
            styles.rowLabel,
            {
              color: theme.colors.text,
              fontSize: theme.typography.body,
              fontWeight: "600"
            }
          ]}
        >
          {label}
        </Text>
        {description && (
          <Text
            style={[
              styles.rowDescription,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.typography.caption,
                marginTop: theme.spacing(0.5)
              }
            ]}
          >
            {description}
          </Text>
        )}
      </View>
      {value}
    </View>
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
    paddingBottom: 8
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
    paddingHorizontal: 20,
    gap: 20
  },
  divider: {
    height: 1,
    marginVertical: 16,
    marginLeft: 0
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4
  },
  rowLeft: {
    flex: 1,
    marginRight: 16
  },
  rowLabel: {
    letterSpacing: -0.1
  },
  rowDescription: {
    letterSpacing: 0.1
  }
});





