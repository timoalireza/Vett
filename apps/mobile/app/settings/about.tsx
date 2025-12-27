import { Text, View, TouchableOpacity, StyleSheet, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useTheme } from "../../src/hooks/use-theme";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";

export default function AboutScreen() {
  const theme = useTheme();
  const router = useRouter();

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
            About Vett
          </Text>
          <View style={{ width: 40 }} />
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
          showsVerticalScrollIndicator={false}
        >
          <GlassCard 
            radius="lg" 
            intensity="medium" 
            style={styles.card}
          >
            <Text 
              style={[
                styles.title,
                {
                  color: theme.colors.text,
                  fontSize: theme.typography.heading,
                  fontFamily: "Inter_700Bold",
                  marginBottom: theme.spacing(3)
                }
              ]}
            >
              About Vett
            </Text>
            <Text 
              style={[
                styles.bodyText,
                {
                  color: theme.colors.text,
                  fontSize: theme.typography.body,
                  lineHeight: theme.typography.body * theme.typography.lineHeight.relaxed,
                  marginBottom: theme.spacing(3)
                }
              ]}
            >
              Vett is a fact-checking assistant that blends human-first UX with automated retrieval, claim extraction, and verdict reasoning. This build is UI-only for internal testing.
            </Text>
            <Text 
              style={[
                styles.bodyText,
                {
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.caption,
                  marginTop: theme.spacing(2)
                }
              ]}
            >
              Version 0.1.0 • Internal Build
            </Text>
          </GlassCard>
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
  },
  card: {
    padding: 24
  },
  title: {
    letterSpacing: -0.5
  },
  bodyText: {
    letterSpacing: 0.1
  }
});

