import { ScrollView, Text, View, StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useTheme } from "../../src/hooks/use-theme";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";

export default function PrivacyPolicyScreen() {
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
            Privacy Policy
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
              At Vett, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our fact-checking application.
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
              Information We Collect
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
              We collect information you provide directly to us, including your name, email address, and any content you submit for analysis. We also collect usage data to improve our services.
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
              How We Use Your Information
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
              We use your information to provide, maintain, and improve our services, process your analyses, communicate with you, and ensure the security of our platform.
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
              For the complete Privacy Policy, please visit our website or contact us at privacy@vett.app
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





