import { Text, TouchableOpacity, View, StyleSheet, Platform, ScrollView } from "react-native";
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
      { label: "Profile", icon: "person-outline", route: "/settings/index" }
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

          {/* Stats Cards */}
          <View style={[styles.statsContainer, { marginBottom: theme.spacing(1) }]}>
            {[
              { label: "Analyses", value: "8", icon: "document-text-outline", gradient: ["#5A8FD4", "#6BA8B8"] },
              { label: "Accuracy", value: "92%", icon: "checkmark-circle-outline", gradient: ["#6BA88A", "#6BA8B8"] },
              { label: "Sources", value: "34", icon: "library-outline", gradient: ["#8A7FA8", "#5A8FD4"] }
            ].map((stat, index) => (
              <GlassCard
                key={stat.label}
                radius="md"
                intensity="light"
                style={styles.statCard}
                gradientAccent={{
                  colors: stat.gradient,
                  start: { x: 0, y: 0 },
                  end: { x: 1, y: 0 }
                }}
              >
                <View style={[styles.statContent, { padding: theme.spacing(2.5) }]}>
                  <View
                    style={[
                      styles.statIcon,
                      {
                        backgroundColor: stat.gradient[0] + "20",
                        borderRadius: theme.radii.sm,
                        width: 40,
                        height: 40,
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: theme.spacing(1.5)
                      }
                    ]}
                  >
                    <Ionicons name={stat.icon as keyof typeof Ionicons.glyphMap} size={20} color={stat.gradient[0]} />
                  </View>
                  <Text
                    style={[
                      styles.statValue,
                      {
                        color: theme.colors.text,
                        fontSize: theme.typography.subheading,
                        marginTop: theme.spacing(0.5),
                        lineHeight: theme.typography.subheading * theme.typography.lineHeight.tight
                      }
                    ]}
                  >
                    {stat.value}
                  </Text>
                  <Text
                    style={[
                      styles.statLabel,
                      {
                        color: theme.colors.textSecondary,
                        fontSize: theme.typography.caption,
                        marginTop: theme.spacing(0.5)
                      }
                    ]}
                  >
                    {stat.label}
                  </Text>
                </View>
              </GlassCard>
            ))}
          </View>

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
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 4
  },
  statCard: {
    flex: 1,
    overflow: "hidden"
  },
  statContent: {
    alignItems: "center",
    padding: 16
  },
  statIcon: {
    // Styled inline
  },
  statValue: {
    fontWeight: "600",
    letterSpacing: -0.3
  },
  statLabel: {
    letterSpacing: 0.2,
    textAlign: "center"
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
