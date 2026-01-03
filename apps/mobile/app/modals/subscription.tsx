import { useEffect, useMemo, useState } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";

import { fetchSubscription, syncSubscription } from "../../src/api/subscription";
import { useRevenueCat } from "../../src/hooks/use-revenuecat";
import { tokenProvider } from "../../src/api/token-provider";

type BillingCycle = "monthly" | "annual";
type Plan = "FREE" | "PLUS" | "PRO";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Colors - Deep charcoal palette
const COLORS = {
  void: "#000000",
  background: "#0C0C0C",
  surface: "#141414",
  surfaceElevated: "#1A1A1A",
  border: "#252525",
  borderSubtle: "#1E1E1E",
  text: "#F5F5F5",
  textSecondary: "#A0A0A0",
  textMuted: "#6B6B6B",
  accent: "#FFFFFF",
  accentMuted: "rgba(255, 255, 255, 0.08)",
  popular: "#3B82F6",
  pro: "#F5F5F5",
};

const PLAN_PRICES = {
  FREE: { monthly: 0, annual: 0 },
  PLUS: { monthly: 2.99, annual: 19.99 },
  PRO: { monthly: 6.99, annual: 49.99 },
};

const PLAN_FEATURES: Record<Plan, string[]> = {
  FREE: [
    "10 in-app analyses / month",
    "3 Instagram DM analyses / month",
    "30-day history",
    "Up to 10 sources",
    "Standard processing",
  ],
  PLUS: [
    "Unlimited in-app analyses",
    "10 Instagram DM analyses / month",
    "Unlimited history",
    "Up to 10 sources",
    "Limited Vett Chat access",
  ],
  PRO: [
    "Unlimited in-app analyses",
    "Unlimited Instagram DM analyses",
    "Unlimited history",
    "Up to 20 sources",
    "Priority processing",
    "Unlimited Vett Chat access",
  ],
};

interface PlanCardProps {
  plan: Plan;
  billingCycle: BillingCycle;
  isSelected: boolean;
  currentPlan: Plan | null;
  onSelect: () => void;
  onSubscribe: () => void;
  purchasing: boolean;
  loading: boolean;
  subscriptionLoading: boolean;
}

function PlanCard({
  plan,
  billingCycle,
  isSelected,
  currentPlan,
  onSelect,
  onSubscribe,
  purchasing,
  loading,
  subscriptionLoading,
}: PlanCardProps) {
  const price = PLAN_PRICES[plan];
  const features = PLAN_FEATURES[plan];
  const isPopular = plan === "PLUS";
  const isPro = plan === "PRO";
  const isFree = plan === "FREE";
  const isCurrent = currentPlan ? plan === currentPlan : false;

  const planRank = (p: Plan) => (p === "FREE" ? 0 : p === "PLUS" ? 1 : 2);
  const isDowngrade = currentPlan ? planRank(plan) < planRank(currentPlan) : false;
  const isUpgrade = currentPlan ? planRank(plan) > planRank(currentPlan) : false;

  const monthlyPrice = billingCycle === "annual" && !isFree
    ? (price.annual / 12).toFixed(2)
    : price.monthly.toFixed(2);

  const annualPrice = price.annual.toFixed(2);

  const getButtonText = () => {
    if (subscriptionLoading) return "Loading…";
    if (isCurrent) return "Current plan";
    if (isDowngrade) return "Downgrade in Settings";
    if (isUpgrade) return plan === "PRO" ? "Upgrade to Pro" : "Upgrade to Plus";
    // Fallback (no current plan available): keep previous marketing copy.
    if (isFree) return "Continue with Free";
    if (isPro) return "Go Pro";
    return "Upgrade to Plus";
  };

  const getButtonStyle = () => {
    if (subscriptionLoading || isCurrent || isDowngrade) {
      return {
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: COLORS.border,
      };
    }
    if (isFree) {
      return {
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: COLORS.border,
      };
    }
    if (isPro) {
      return {
        backgroundColor: COLORS.accent,
      };
    }
    return {
      backgroundColor: COLORS.surfaceElevated,
      borderWidth: 1,
      borderColor: COLORS.border,
    };
  };

  const getButtonTextColor = () => {
    if (subscriptionLoading || isCurrent || isDowngrade) return COLORS.textSecondary;
    if (isFree) return COLORS.textSecondary;
    if (isPro) return COLORS.void;
    return COLORS.text;
  };

  const cardContent = (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.8}
      style={[
        styles.planCard,
        isSelected && styles.planCardSelected,
        isPro && styles.planCardPro,
      ]}
    >
      {/* Badges */}
      {isCurrent && (
        <View style={styles.currentBadge}>
          <Text style={styles.currentBadgeText}>CURRENT</Text>
        </View>
      )}
      {!isCurrent && isPopular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
        </View>
      )}

      {/* Plan Header */}
      <View style={styles.planHeader}>
        <Text style={[styles.planName, isPro && styles.planNamePro]}>
          {plan}
        </Text>
      </View>

      {/* Price */}
      <View style={styles.priceContainer}>
        <Text style={styles.priceMain}>
          €{monthlyPrice}
          <Text style={styles.pricePeriod}> / month</Text>
        </Text>
        {!isFree && billingCycle === "annual" && (
          <Text style={styles.priceSecondary}>
            €{annualPrice} / year
          </Text>
        )}
        {!isFree && billingCycle === "monthly" && (
          <Text style={styles.priceSecondary}>
            or €{annualPrice} / year
          </Text>
        )}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Features */}
      <View style={styles.featuresContainer}>
        {features.map((feature, index) => (
          <Text key={index} style={styles.featureText}>
            {feature}
          </Text>
        ))}
      </View>

      {/* CTA Button */}
      <TouchableOpacity
        onPress={onSubscribe}
        disabled={purchasing || loading || subscriptionLoading || isCurrent || isDowngrade}
        style={[styles.ctaButton, getButtonStyle()]}
        activeOpacity={0.7}
      >
        {purchasing && isSelected ? (
          <ActivityIndicator
            size="small"
            color={isPro ? COLORS.void : COLORS.text}
          />
        ) : loading ? (
          <ActivityIndicator size="small" color={COLORS.textMuted} />
        ) : (
          <Text style={[styles.ctaButtonText, { color: getButtonTextColor() }]}>
            {getButtonText()}
          </Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Wrap Pro plan with gradient border
  if (isPro) {
    return (
      <LinearGradient
        colors={["#9D7FEF", "#E89CDA", "#FFC58F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientBorder}
      >
        {cardContent}
      </LinearGradient>
    );
  }

  return cardContent;
}

export default function SubscriptionModal() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ plan?: string }>();
  const { user } = useUser();
  const { getToken } = useAuth();
  const userId = user?.id;
  const initialPlan = (params.plan === "FREE" || params.plan === "PLUS" || params.plan === "PRO" 
    ? params.plan 
    : "PLUS") as Plan;
  const [selectedPlan, setSelectedPlan] = useState<Plan>(initialPlan);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("annual");
  const [purchasing, setPurchasing] = useState(false);

  const { offerings, loading, purchase, getMonthlyPackage, getAnnualPackage } =
    useRevenueCat();

  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["subscription", userId],
    queryFn: fetchSubscription,
    enabled: !!userId,
  });

  const currentPlan: Plan | null = subscription?.plan ?? null;

  useEffect(() => {
    if (!currentPlan) return;
    // If the modal opens without a plan param, bias selection toward the best available upgrade.
    if (!params.plan) {
      if (currentPlan === "FREE") setSelectedPlan("PLUS");
      else if (currentPlan === "PLUS") setSelectedPlan("PRO");
      else setSelectedPlan("PRO");
    }
  }, [currentPlan, params.plan]);

  const getPackageForPlan = useMemo(() => {
    return (plan: Plan) => {
      if (!offerings || plan === "FREE") return null;

      const planKey = plan.toLowerCase();
      const cycleKey = billingCycle === "annual" ? "annual" : "monthly";

      const haystack = (pkg: any) =>
        `${pkg.identifier} ${pkg.product?.identifier ?? ""} ${pkg.product?.title ?? ""}`.toLowerCase();

      const planMatches = offerings.availablePackages.filter((pkg) =>
        haystack(pkg).includes(planKey)
      );
      const cycleMatches = planMatches.filter((pkg) => {
        const h = haystack(pkg);
        if (cycleKey === "annual")
          return h.includes("annual") || h.includes("year") || h.includes("yearly");
        return h.includes("month") || h.includes("monthly");
      });

      return (
        cycleMatches[0] ||
        planMatches[0] ||
        (billingCycle === "monthly" ? offerings.monthly : offerings.annual) ||
        (billingCycle === "monthly" ? getMonthlyPackage() : getAnnualPackage())
      );
    };
  }, [offerings, billingCycle, getMonthlyPackage, getAnnualPackage]);

  const handleSubscribe = async (plan: Plan) => {
    const planRank = (p: Plan) => (p === "FREE" ? 0 : p === "PLUS" ? 1 : 2);
    if (currentPlan && planRank(plan) <= planRank(currentPlan)) {
      if (plan === currentPlan) return;
      Alert.alert("Not available", "Downgrades are managed in your device subscription settings.");
      return;
    }
    if (plan === "FREE") {
      router.back();
      return;
    }

    if (purchasing) return;

    try {
      // Update selected plan to show loading indicator on the correct card
      setSelectedPlan(plan);
      setPurchasing(true);
      const selectedPackage = getPackageForPlan(plan);

      if (!selectedPackage) {
        Alert.alert("Error", "Package not available. Please try again later.");
        return;
      }

      const customerInfo = await purchase(selectedPackage);

      if (Object.keys(customerInfo.entitlements.active).length > 0) {
        // Explicitly sync subscription from RevenueCat to ensure backend is updated
        try {
          // Refresh authentication token before syncing to ensure it's valid
          const template = process.env.EXPO_PUBLIC_CLERK_JWT_TEMPLATE;
          let token: string | null | undefined;
          
          try {
            token = template 
              ? await getToken?.({ template })
              : await getToken?.();
          } catch (tokenError) {
            console.warn("[Subscription] Failed to get token with template, falling back:", tokenError);
            token = await getToken?.();
          }
          
          // Update token provider with fresh token
          if (token) {
            tokenProvider.setToken(token);
          }
          
          await syncSubscription();
          
          // Invalidate subscription queries to update UI with synced data
          await queryClient.invalidateQueries({ 
            predicate: (query) => 
              query.queryKey[0] === "subscription"
          });
          
          Alert.alert("Success", `Vett ${plan} subscription activated!`, [
            { text: "OK", onPress: () => router.back() },
          ]);
        } catch (syncError: any) {
          console.error("Subscription sync failed:", syncError);
          
          // Fallback: invalidate with delays like before
          const invalidateSubscriptionQueries = async () => {
            await queryClient.invalidateQueries({ 
              predicate: (query) => 
                query.queryKey[0] === "subscription"
            });
          };
          
          await invalidateSubscriptionQueries();
          setTimeout(async () => {
            await invalidateSubscriptionQueries();
          }, 1000);
          setTimeout(async () => {
            await invalidateSubscriptionQueries();
          }, 2500);
          
          Alert.alert(
            "Success",
            `Vett ${plan} subscription activated! It may take a moment to reflect in your account.`,
            [{ text: "OK", onPress: () => router.back() }]
          );
        }
      } else {
        Alert.alert(
          "Error",
          "Purchase completed but subscription not activated. Please contact support."
        );
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

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeButton}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Value Statement */}
          <View style={styles.valueStatement}>
            <Text style={styles.valueText}>Go beyond basic verification.</Text>
            {!!currentPlan && (
              <Text style={styles.currentPlanText}>Current plan: {currentPlan}</Text>
            )}
          </View>

          {/* Billing Toggle */}
          <View style={styles.billingToggleContainer}>
            <View style={styles.billingToggle}>
              <TouchableOpacity
                onPress={() => setBillingCycle("monthly")}
                style={[
                  styles.billingOption,
                  billingCycle === "monthly" && styles.billingOptionActive,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.billingOptionText,
                    billingCycle === "monthly" && styles.billingOptionTextActive,
                  ]}
                >
                  Monthly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setBillingCycle("annual")}
                style={[
                  styles.billingOption,
                  billingCycle === "annual" && styles.billingOptionActive,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.billingOptionText,
                    billingCycle === "annual" && styles.billingOptionTextActive,
                  ]}
                >
                  Annual
                </Text>
                {billingCycle === "annual" && (
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveBadgeText}>Save ~40%</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Plan Cards */}
          <View style={styles.plansContainer}>
            <PlanCard
              plan="PRO"
              billingCycle={billingCycle}
              isSelected={selectedPlan === "PRO"}
              currentPlan={currentPlan}
              onSelect={() => setSelectedPlan("PRO")}
              onSubscribe={() => handleSubscribe("PRO")}
              purchasing={purchasing}
              loading={loading}
              subscriptionLoading={subscriptionLoading}
            />
            <PlanCard
              plan="PLUS"
              billingCycle={billingCycle}
              isSelected={selectedPlan === "PLUS"}
              currentPlan={currentPlan}
              onSelect={() => setSelectedPlan("PLUS")}
              onSubscribe={() => handleSubscribe("PLUS")}
              purchasing={purchasing}
              loading={loading}
              subscriptionLoading={subscriptionLoading}
            />
            <PlanCard
              plan="FREE"
              billingCycle={billingCycle}
              isSelected={selectedPlan === "FREE"}
              currentPlan={currentPlan}
              onSelect={() => setSelectedPlan("FREE")}
              onSubscribe={() => handleSubscribe("FREE")}
              purchasing={purchasing}
              loading={loading}
              subscriptionLoading={subscriptionLoading}
            />
          </View>

          {/* Terms */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              Subscriptions auto-renew unless cancelled at least 24 hours before
              the current period ends. Manage subscriptions in Settings.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 8 : 16,
    paddingBottom: 8,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accentMuted,
    borderRadius: 18,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  valueStatement: {
    marginTop: 24,
    marginBottom: 32,
    alignItems: "center",
  },
  valueText: {
    fontSize: 24,
    fontFamily: "Inter_500Medium",
    color: COLORS.text,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  currentPlanText: {
    marginTop: 10,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSecondary,
  },
  billingToggleContainer: {
    alignItems: "center",
    marginBottom: 28,
  },
  billingToggle: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 4,
  },
  billingOption: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  billingOptionActive: {
    backgroundColor: COLORS.surfaceElevated,
  },
  billingOptionText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: COLORS.textMuted,
  },
  billingOptionTextActive: {
    color: COLORS.text,
    fontFamily: "Inter_500Medium",
  },
  saveBadge: {
    backgroundColor: COLORS.accentMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  saveBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: COLORS.textSecondary,
    letterSpacing: 0.2,
  },
  plansContainer: {
    gap: 16,
  },
  gradientBorder: {
    borderRadius: 16,
    padding: 1.5,
  },
  currentBadge: {
    position: "absolute",
    top: -10,
    right: 24,
    backgroundColor: COLORS.accentMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currentBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },
  planCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  planCardSelected: {
    borderColor: COLORS.border,
  },
  planCardPro: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 0,
  },
  popularBadge: {
    position: "absolute",
    top: -10,
    left: 24,
    backgroundColor: COLORS.popular,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  popularBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.accent,
    letterSpacing: 0.8,
  },
  planHeader: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
  },
  planNamePro: {
    color: COLORS.text,
  },
  priceContainer: {
    marginBottom: 20,
  },
  priceMain: {
    fontSize: 28,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  pricePeriod: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSecondary,
  },
  priceSecondary: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: COLORS.textMuted,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderSubtle,
    marginBottom: 20,
  },
  featuresContainer: {
    gap: 10,
    marginBottom: 24,
  },
  featureText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  ctaButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  ctaButtonText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.1,
  },
  termsContainer: {
    marginTop: 32,
    paddingHorizontal: 8,
  },
  termsText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
});
