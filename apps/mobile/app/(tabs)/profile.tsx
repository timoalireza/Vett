import { Text, TouchableOpacity, View, StyleSheet, Platform, ScrollView, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useUser } from "@clerk/clerk-expo";

import { useTheme } from "../../src/hooks/use-theme";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";

const settingsSections = [
  {
    title: "Account",
    items: [
      { label: "Profile", icon: "person-outline", route: "/settings/profile" },
      { label: "Request Features", icon: "bulb-outline", action: "requestFeatures" }
    ]
  },
  {
    title: "Preferences",
    items: [
      { label: "Notifications", icon: "notifications-outline", route: "/settings/notifications" }
    ]
  },
  {
    title: "About",
    items: [
      { label: "About Vett", icon: "information-circle-outline", route: "/settings/about" },
      { label: "Privacy Policy", icon: "shield-checkmark-outline", route: "/settings/privacy" },
      { label: "Terms of Service", icon: "document-text-outline", route: "/settings/terms" }
    ]
  }
];

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useUser();
  
  // Get user display name
  const displayName = user 
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.fullName || user.primaryEmailAddress?.emailAddress?.split("@")[0] || "User"
    : "Guest Investigator";
  
  const userEmail = user?.primaryEmailAddress?.emailAddress || "guest@vett.app";

  const handleRequestFeatures = () => {
    const email = "support@vett.app";
    const subject = "Feature Request";
    const body = `Hi Vett Team,\n\nI'd like to request the following feature:\n\n[Describe your feature request here]\n\nThanks!`;
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    Linking.canOpenURL(mailtoUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(mailtoUrl);
        } else {
          Alert.alert(
            "Email Not Available",
            `Please send your feature request to ${email}`,
            [{ text: "OK" }]
          );
        }
      })
      .catch((err) => {
        console.error("Error opening email:", err);
        Alert.alert(
          "Error",
          `Please send your feature request to ${email}`,
          [{ text: "OK" }]
        );
      });
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: Platform.OS === "ios" ? 20 : 16,
              paddingBottom: 120 // Space for tab bar
            }
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header */}
          <GlassCard radius="lg" intensity="medium" style={[styles.profileCard, { marginBottom: theme.spacing(1) }]}>
            <View style={styles.profileContent}>
              <View
                style={[
                  styles.avatarContainer,
                  {
                    backgroundColor: theme.colors.primary + "30",
                    borderRadius: theme.radii.lg,
                    width: 72,
                    height: 72,
                    alignItems: "center",
                    justifyContent: "center"
                  }
                ]}
              >
                <Ionicons name="person" size={36} color={theme.colors.primary} />
              </View>
              <View style={styles.profileInfo}>
                <Text
                  style={[
                    styles.profileName,
                    {
                      color: theme.colors.text,
                      fontSize: theme.typography.subheading,
                      lineHeight: theme.typography.subheading * theme.typography.lineHeight.tight
                    }
                  ]}
                >
                  {displayName}
                </Text>
                <Text
                  style={[
                    styles.profileEmail,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.body,
                      marginTop: theme.spacing(0.5)
                    }
                  ]}
                >
                  {userEmail}
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* Settings Sections */}
          {settingsSections.map((section, sectionIndex) => (
            <View key={section.title} style={styles.section}>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: theme.colors.textTertiary,
                    fontSize: theme.typography.caption,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    marginBottom: theme.spacing(1.5),
                    marginTop: sectionIndex > 0 ? theme.spacing(3) : 0
                  }
                ]}
              >
                {section.title}
              </Text>
              <GlassCard radius="md" intensity="light">
                {section.items.map((item, itemIndex) => (
                  <View key={item.label}>
                    {itemIndex > 0 && (
                      <View
                        style={[
                          styles.divider,
                          {
                            backgroundColor: theme.colors.borderLight,
                            height: 1,
                            marginLeft: theme.spacing(3)
                          }
                        ]}
                      />
                    )}
                    <TouchableOpacity
                        style={[
                          styles.settingItem,
                          {
                            paddingVertical: theme.spacing(2.5),
                            paddingHorizontal: theme.spacing(3),
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between"
                          }
                        ]}
                        activeOpacity={0.7}
                        onPress={() => {
                          if (item.route) {
                            router.push(item.route as any);
                          } else if (item.action === "requestFeatures") {
                            handleRequestFeatures();
                          }
                        }}
                      >
                        <View style={styles.settingLeft}>
                          <View
                            style={[
                              styles.settingIcon,
                              {
                                backgroundColor: theme.colors.card,
                                borderRadius: theme.radii.sm,
                                width: 36,
                                height: 36,
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: theme.spacing(2.5)
                              }
                            ]}
                          >
                            <Ionicons
                              name={item.icon as keyof typeof Ionicons.glyphMap}
                              size={20}
                              color={theme.colors.textSecondary}
                            />
                          </View>
                          <Text
                            style={[
                              styles.settingLabel,
                              {
                                color: theme.colors.text,
                                fontSize: theme.typography.body
                              }
                            ]}
                          >
                            {item.label}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
                      </TouchableOpacity>
                  </View>
                ))}
              </GlassCard>
            </View>
          ))}

          {/* Version Info */}
          <View style={styles.versionContainer}>
            <Text
              style={[
                styles.versionText,
                {
                  color: theme.colors.textTertiary,
                  fontSize: theme.typography.small,
                  textAlign: "center"
                }
              ]}
            >
              v0.1.0 • Internal build
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollView: {
    flex: 1
  },
  content: {
    paddingHorizontal: 20,
    gap: 20
  },
  profileCard: {
    marginBottom: 4
  },
  profileContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 24
  },
  avatarContainer: {
    // Styled inline
  },
  profileInfo: {
    flex: 1
  },
  profileName: {
    fontWeight: "600",
    letterSpacing: -0.3
  },
  profileEmail: {
    letterSpacing: 0.1
  },
  section: {
    // Container for section
  },
  sectionTitle: {
    fontWeight: "600"
  },
  divider: {
    // Styled inline
  },
  settingItem: {
    // Styled inline
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  settingIcon: {
    // Styled inline
  },
  settingLabel: {
    fontWeight: "500",
    letterSpacing: 0.1
  },
  settingSubtext: {
    letterSpacing: 0.1
  },
  versionContainer: {
    paddingVertical: 24,
    alignItems: "center"
  },
  versionText: {
    letterSpacing: 0.2
  }
});
