import { useMemo, useState } from "react";
import { Text, TouchableOpacity, View, ScrollView, StyleSheet, ActivityIndicator, Alert, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../../src/hooks/use-theme";
import { GlassCard } from "../../src/components/GlassCard";
import { useRevenueCat } from "../../src/hooks/use-revenuecat";

type BillingCycle = "monthly" | "annual";
type Plan = "PLUS" | "PRO";

const PLAN_PRICES = {
  PLUS: { monthly: 2.99, annual: 19.99 },
  PRO: { monthly: 6.99, annual: 49.99 }
};

// Features comparison: Free vs PLUS vs PRO
// Based on new tier structure:
// FREE: 3 DM/10 app analyses, watermark, 30 days history, 10 sources, standard processing
// PLUS: 10 DM/unlimited app, no watermark, unlimited history, 10 sources, standard processing, limited Vett Chat
// PRO: unlimited all, no watermark, unlimited history, 20 sources, priority processing, unlimited Vett Chat
const FEATURES = [
  { name: "App analyses", free: "10/mo", plus: "Unlimited", pro: "Unlimited" },
  { name: "DM analyses", free: "3/mo", plus: "10/mo", pro: "Unlimited" },
  { name: "No watermark", free: false, plus: true, pro: true },
  { name: "Unlimited history", free: false, plus: true, pro: true },
  { name: "Priority processing", free: false, plus: false, pro: true },
  { name: "Up to 20 sources", free: false, plus: false, pro: true },
  { name: "Vett Chat", free: false, plus: "Limited", pro: "Unlimited" }
];

export default function SubscriptionModal() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ plan?: string }>();
  const initialPlan = (params.plan === "PLUS" || params.plan === "PRO" ? params.plan : "PRO") as Plan;
  const [activeTab, setActiveTab] = useState<Plan>(initialPlan);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("annual");
  const [purchasing, setPurchasing] = useState(false);
  
  const { offerings, loading, purchase, getMonthlyPackage, getAnnualPackage } = useRevenueCat();

  const selectedPackage = useMemo(() => {
    if (!offerings) return null;

    const planKey = activeTab.toLowerCase();
    const cycleKey = billingCycle === "annual" ? "annual" : "monthly";

    const haystack = (pkg: any) =>
      `${pkg.identifier} ${pkg.product?.identifier ?? ""} ${pkg.product?.title ?? ""}`.toLowerCase();

    const planMatches = offerings.availablePackages.filter((pkg) => haystack(pkg).includes(planKey));
    const cycleMatches = planMatches.filter((pkg) => {
      const h = haystack(pkg);
      if (cycleKey === "annual") return h.includes("annual") || h.includes("year") || h.includes("yearly");
      return h.includes("month") || h.includes("monthly");
    });

    // Fallbacks:
    // - If RevenueCat offering doesn't separate plan packages, fall back to default monthly/annual.
    return (
      cycleMatches[0] ||
      planMatches[0] ||
      (billingCycle === "monthly" ? offerings.monthly : offerings.annual) ||
      (billingCycle === "monthly" ? getMonthlyPackage() : getAnnualPackage())
    );
  }, [offerings, activeTab, billingCycle, getMonthlyPackage, getAnnualPackage]);

  const handleSubscribe = async () => {
    if (purchasing) return;

    try {
      setPurchasing(true);

      if (!selectedPackage) {
        Alert.alert("Error", "Package not available. Please try again later.");
        return;
      }

      // Purchase the package
      const customerInfo = await purchase(selectedPackage);

      // Check if purchase was successful
      // entitlements.active is an object (dictionary), not an array
      if (Object.keys(customerInfo.entitlements.active).length > 0) {
        Alert.alert("Success", `Vett ${activeTab} subscription activated successfully!`, [
          {
            text: "OK",
            onPress: () => router.back()
          }
        ]);
      } else {
        Alert.alert("Error", "Purchase completed but subscription not activated. Please contact support.");
      }
    } catch (error: any) {
      console.error("Purchase failed:", error);
      
      if (error.message?.includes("cancelled") || error.userCancelled) {
        return;
      }
      
      Alert.alert(
        "Purchase Failed",
        error.message || "An error occurred during purchase. Please try again."
      );
    } finally {
      setPurchasing(false);
    }
  };

  // Get features for the active tab
  const getFeaturesForPlan = (plan: Plan) => {
    return FEATURES.map(feature => {
      const planValue = plan === "PLUS" ? feature.plus : feature.pro;
      return {
        ...feature,
        planValue,
        // For boolean values, use them directly. For strings, consider them "available"
        available: typeof planValue === "boolean" ? planValue : true
      };
    });
  };

  // Helper to render feature value (checkmark, X, or text)
  const renderFeatureValue = (value: boolean | string, isAvailable: boolean) => {
    if (typeof value === "string") {
      return (
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.typography.caption,
            fontFamily: "Inter_500Medium",
            textAlign: "center"
          }}
        >
          {value}
        </Text>
      );
    }
    
    if (value) {
      return (
        <View
          style={{
            backgroundColor: theme.colors.success + "20",
            width: 24,
            height: 24,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Ionicons name="checkmark" size={16} color={theme.colors.success} />
        </View>
      );
    }
    
    return (
      <View
        style={{
          backgroundColor: theme.colors.card,
          width: 24,
          height: 24,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Ionicons name="close" size={14} color={theme.colors.textTertiary} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Close Button */}
        <View style={styles.closeButtonContainer}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "spring", damping: 20 }}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text
                style={[
                  styles.headerTitle,
                  {
                    color: theme.colors.text,
                    fontSize: theme.typography.heading + 4,
                    fontFamily: "Inter_700Bold",
                    textAlign: "center",
                    marginBottom: theme.spacing(1)
                  }
                ]}
              >
                Unlock the full{"\n"}Vett experience
              </Text>
              <View style={{ marginTop: -4 }}>
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.secondary, theme.colors.highlight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 4
                  }}
                >
                  <Text
                    style={{
                    fontSize: theme.typography.heading + 4,
                    fontFamily: "Inter_700Bold",
                    color: "#FFFFFF",
                    textAlign: "center"
                    }}
                  >
                    with Pro
                  </Text>
                </LinearGradient>
              </View>
            </View>

            {/* Plan Tabs */}
            <View
              style={[
                styles.planTabs,
                {
                  backgroundColor: theme.colors.card,
                  borderRadius: theme.radii.md,
                  padding: 4,
                  gap: 4,
                  marginTop: theme.spacing(2)
                }
              ]}
            >
              <TouchableOpacity
                onPress={() => setActiveTab("PLUS")}
                style={{
                  flex: 1,
                  paddingVertical: theme.spacing(1.5),
                  borderRadius: theme.radii.sm,
                  backgroundColor: activeTab === "PLUS" ? theme.colors.primary : "transparent",
                  alignItems: "center"
                }}
              >
                <Text
                  style={{
                    color: activeTab === "PLUS" ? "#FFFFFF" : theme.colors.text,
                    fontSize: theme.typography.body,
                    fontFamily: activeTab === "PLUS" ? "Inter_500Medium" : "Inter_400Regular"
                  }}
                >
                  Vett Plus
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab("PRO")}
                style={{
                  flex: 1,
                  paddingVertical: theme.spacing(1.5),
                  borderRadius: theme.radii.sm,
                  backgroundColor: activeTab === "PRO" ? theme.colors.primary : "transparent",
                  alignItems: "center",
                  position: "relative"
                }}
              >
                <Text
                  style={{
                    color: activeTab === "PRO" ? "#FFFFFF" : theme.colors.text,
                    fontSize: theme.typography.body,
                    fontFamily: activeTab === "PRO" ? "Inter_500Medium" : "Inter_400Regular"
                  }}
                >
                  Vett Pro
                </Text>
                {activeTab === "PRO" && (
                  <View
                    style={{
                      position: "absolute",
                      top: -8,
                      right: 8,
                      backgroundColor: theme.colors.success,
                      borderRadius: 8,
                      paddingHorizontal: 6,
                      paddingVertical: 2
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 10,
                        fontFamily: "Inter_500Medium"
                      }}
                    >
                      POPULAR
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Feature Comparison Table */}
            <GlassCard
              intensity="medium"
              radius="lg"
              style={styles.comparisonCard}
            >
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text
                  style={[
                    styles.tableHeaderText,
                    {
                      color: theme.colors.text,
                      fontSize: theme.typography.body,
                      fontFamily: "Inter_700Bold",
                      flex: 2.5
                    }
                  ]}
                >
                  Benefits
                </Text>
                <Text
                  style={[
                    styles.tableHeaderText,
                    {
                      color: theme.colors.text,
                      fontSize: theme.typography.caption,
                      fontFamily: "Inter_700Bold",
                      textAlign: "center",
                      flex: 1
                    }
                  ]}
                >
                  Free
                </Text>
                <Text
                  style={[
                    styles.tableHeaderText,
                    {
                      color: theme.colors.text,
                      fontSize: theme.typography.caption,
                      fontFamily: "Inter_700Bold",
                      textAlign: "center",
                      flex: 1
                    }
                  ]}
                >
                  {activeTab === "PLUS" ? "Plus" : "Pro"}
                </Text>
              </View>

              {/* Feature Rows */}
              <View style={styles.featureRows}>
                {getFeaturesForPlan(activeTab).map((feature, index) => (
                  <View
                    key={feature.name}
                    style={[
                      styles.featureRow,
                      {
                        borderBottomWidth: index < FEATURES.length - 1 ? 1 : 0,
                        borderBottomColor: theme.colors.borderLight,
                        paddingVertical: theme.spacing(2)
                      }
                    ]}
                  >
                    <Text
                      style={[
                        styles.featureName,
                        {
                          color: theme.colors.text,
                          fontSize: theme.typography.body,
                          flex: 2.5
                        }
                      ]}
                    >
                      {feature.name}
                    </Text>
                    {/* Free Column */}
                    <View style={{ flex: 1, alignItems: "center" }}>
                      {renderFeatureValue(feature.free, typeof feature.free === "string" || feature.free === true)}
                    </View>
                    {/* Plan Column */}
                    <View style={{ flex: 1, alignItems: "center" }}>
                      {renderFeatureValue(feature.planValue, feature.available)}
                    </View>
                  </View>
                ))}
              </View>
            </GlassCard>

            {/* Billing Cycle Toggle - Nudge to Annual */}
            <View
              style={[
                styles.billingToggle,
                {
                  backgroundColor: theme.colors.card,
                  borderRadius: theme.radii.md,
                  padding: 4,
                  gap: 4
                }
              ]}
            >
              <TouchableOpacity
                onPress={() => setBillingCycle("monthly")}
                style={{
                  flex: 1,
                  paddingVertical: theme.spacing(1.5),
                  borderRadius: theme.radii.sm,
                  backgroundColor: billingCycle === "monthly" ? theme.colors.primary : "transparent",
                  alignItems: "center"
                }}
              >
                <Text
                  style={{
                    color: billingCycle === "monthly" ? "#FFFFFF" : theme.colors.text,
                    fontSize: theme.typography.body,
                    fontFamily: billingCycle === "monthly" ? "Inter_500Medium" : "Inter_400Regular"
                  }}
                >
                  Monthly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setBillingCycle("annual")}
                style={{
                  flex: 1,
                  paddingVertical: theme.spacing(1.5),
                  borderRadius: theme.radii.sm,
                  backgroundColor: billingCycle === "annual" ? theme.colors.primary : "transparent",
                  alignItems: "center",
                  position: "relative"
                }}
              >
                <Text
                  style={{
                    color: billingCycle === "annual" ? "#FFFFFF" : theme.colors.text,
                    fontSize: theme.typography.body,
                    fontFamily: billingCycle === "annual" ? "Inter_500Medium" : "Inter_400Regular"
                  }}
                >
                  Annual
                </Text>
                {billingCycle === "annual" && (
                  <View
                    style={{
                      position: "absolute",
                      top: -8,
                      right: 8,
                      backgroundColor: theme.colors.success,
                      borderRadius: 8,
                      paddingHorizontal: 6,
                      paddingVertical: 2
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 10,
                        fontFamily: "Inter_500Medium"
                      }}
                    >
                      Save
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Plan Card */}
            <GlassCard
              intensity="medium"
              radius="lg"
              style={{
                ...styles.planCard,
                padding: theme.spacing(3),
                marginTop: theme.spacing(2)
              }}
            >
              <View style={{ alignItems: "center" }}>
                <Text
                  style={[
                    styles.planName,
                    {
                      color: theme.colors.text,
                      fontSize: theme.typography.subheading + 4,
                      fontFamily: "Inter_700Bold",
                      marginBottom: theme.spacing(1.5)
                    }
                  ]}
                >
                  Vett {activeTab}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, marginBottom: theme.spacing(0.5) }}>
                  <Text
                    style={[
                      styles.planPrice,
                      {
                        color: theme.colors.text,
                        fontSize: theme.typography.heading + 8,
                        fontFamily: "Inter_700Bold"
                      }
                    ]}
                  >
                    ${billingCycle === "annual" ? (PLAN_PRICES[activeTab].annual / 12).toFixed(2) : PLAN_PRICES[activeTab].monthly.toFixed(2)}
                  </Text>
                  <Text
                    style={[
                      styles.planPeriod,
                      {
                        color: theme.colors.textSecondary,
                        fontSize: theme.typography.body
                      }
                    ]}
                  >
                    /mo
                  </Text>
                </View>
                {billingCycle === "annual" && (
                  <Text
                    style={[
                      styles.planSavings,
                      {
                        color: theme.colors.success,
                        fontSize: theme.typography.body,
                        marginTop: theme.spacing(0.5),
                        fontFamily: "Inter_700Bold"
                      }
                    ]}
                  >
                    Save ${(PLAN_PRICES[activeTab].monthly * 12 - PLAN_PRICES[activeTab].annual).toFixed(2)}/year
                  </Text>
                )}
                <Text
                  style={[
                    styles.planAnnualPrice,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.caption,
                      marginTop: theme.spacing(1.5)
                    }
                  ]}
                >
                  {billingCycle === "annual" ? `$${PLAN_PRICES[activeTab].annual.toFixed(2)}/year` : `$${PLAN_PRICES[activeTab].monthly.toFixed(2)}/month`}
                </Text>
              </View>
            </GlassCard>

            {/* Terms */}
            <View style={styles.termsContainer}>
              <Text
                style={[
                  styles.termsText,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.caption,
                    lineHeight: theme.typography.caption * theme.typography.lineHeight.relaxed,
                    textAlign: "center"
                  }
                ]}
              >
                {activeTab === "PRO" ? (
                  <>
                    Start with a 7-day free trial.{"\n"}
                    You won't be charged until after your free trial ends.{"\n"}
                  </>
                ) : (
                  <>
                    You won't be charged until after your subscription starts.{"\n"}
                  </>
                )}
                Your subscription automatically renews unless cancelled at least 24 hours before the end of your current period. Cancel anytime in the App Store.
              </Text>
            </View>

            {/* CTA Button */}
            {loading ? (
              <View
                style={[
                  styles.ctaButton,
                  {
                    backgroundColor: theme.colors.card,
                    borderRadius: theme.radii.pill,
                    paddingVertical: theme.spacing(3)
                  }
                ]}
              >
                <ActivityIndicator color={theme.colors.primary} />
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleSubscribe}
                disabled={purchasing}
                style={[
                  styles.ctaButton,
                  {
                    backgroundColor: theme.colors.primary,
                    borderRadius: theme.radii.pill,
                    paddingVertical: theme.spacing(3),
                    opacity: purchasing ? 0.5 : 1
                  }
                ]}
                activeOpacity={0.8}
              >
                {purchasing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: theme.typography.body,
                      fontFamily: "Inter_500Medium",
                      letterSpacing: 0.3
                    }}
                  >
                    {activeTab === "PRO" ? "Start my free week" : `Subscribe to Vett ${activeTab}`}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </MotiView>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  safeArea: {
    flex: 1
  },
  closeButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 8 : 16,
    paddingBottom: 8,
    alignItems: "flex-end"
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 24
  },
  header: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8
  },
  headerTitle: {
    letterSpacing: -0.5,
    lineHeight: 40
  },
  planTabs: {
    marginBottom: 8
  },
  comparisonCard: {
    padding: 20,
    marginTop: 8
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)"
  },
  tableHeaderText: {
    letterSpacing: -0.1
  },
  featureRows: {
    gap: 0
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  featureName: {
    letterSpacing: 0.1
  },
  checkmarkCircle: {
    // Styled inline
  },
  billingToggle: {
    marginTop: 8
  },
  planCard: {
    minHeight: 140
  },
  planName: {
    letterSpacing: -0.3
  },
  planPrice: {
    letterSpacing: -0.5
  },
  planPeriod: {
    letterSpacing: 0.1
  },
  planSavings: {
    letterSpacing: 0.1
  },
  planAnnualPrice: {
    letterSpacing: 0.1
  },
  termsContainer: {
    paddingHorizontal: 8,
    marginTop: 4
  },
  termsText: {
    letterSpacing: 0.1
  },
  ctaButton: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    minHeight: 56
  }
});
