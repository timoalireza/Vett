import { ScrollView, Text, View, StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useTheme } from "../../src/hooks/use-theme";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";

export default function TermsOfServiceScreen() {
  const theme = useTheme();
  const router = useRouter();

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
            Terms of Service
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
          <GlassCard radius="lg" intensity="medium" style={styles.card}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.colors.text,
                  fontSize: theme.typography.subheading,
                  fontWeight: "600",
                  marginBottom: theme.spacing(2)
                }
              ]}
            >
              Last Updated: November 2024
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
              By using Vett, you agree to these Terms of Service. Please read them carefully.
            </Text>

            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.colors.text,
                  fontSize: theme.typography.subheading,
                  fontWeight: "600",
                  marginTop: theme.spacing(4),
                  marginBottom: theme.spacing(2)
                }
              ]}
            >
              Acceptance of Terms
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
              By accessing or using Vett, you agree to be bound by these Terms of Service and all applicable laws and regulations.
            </Text>

            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.colors.text,
                  fontSize: theme.typography.subheading,
                  fontWeight: "600",
                  marginTop: theme.spacing(4),
                  marginBottom: theme.spacing(2)
                }
              ]}
            >
              Use License
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
              Permission is granted to use Vett for personal, non-commercial fact-checking purposes. You may not modify, copy, distribute, or use the service for any commercial purpose without explicit written permission.
            </Text>

            <Text
              style={[
                styles.bodyText,
                {
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.caption,
                  marginTop: theme.spacing(4),
                  fontStyle: "italic"
                }
              ]}
            >
              For the complete Terms of Service, please visit our website or contact us at legal@vett.app
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
    paddingHorizontal: 20
  },
  card: {
    padding: 24
  },
  sectionTitle: {
    letterSpacing: -0.3
  },
  bodyText: {
    letterSpacing: 0.1
  }
});





