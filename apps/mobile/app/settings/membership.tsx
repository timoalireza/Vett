import { useMemo } from "react";
import { ActivityIndicator, Alert, Text } from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchSubscription } from "../../src/api/subscription";
import { useRevenueCat } from "../../src/hooks/use-revenuecat";
import { useAppState } from "../../src/state/app-state";
import { getStrings } from "../../src/i18n/strings";
import { useTheme } from "../../src/hooks/use-theme";
import { PrimaryButton, Row, Section, SettingsShell } from "./_shared";

export default function MembershipSettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const userId = user?.id;
  const { language } = useAppState();
  const strings = useMemo(() => getStrings(language), [language]);

  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["subscription", userId],
    queryFn: fetchSubscription,
    enabled: !!userId
  });

  const { restore } = useRevenueCat();

  const currentPlan = subscription?.plan ?? "FREE";
  // We only sell/market PRO from settings for now.
  const nextPlan: "PRO" | null = currentPlan === "PRO" ? null : "PRO";

  const onRestorePurchases = async () => {
    try {
      await restore();
      if (userId) await queryClient.invalidateQueries({ queryKey: ["subscription", userId] });
      Alert.alert("Restored", "Purchases restored. If you still don’t see your plan, try again in a moment.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to restore purchases");
    }
  };

  return (
    <SettingsShell title={strings.membershipTab}>
      <Section title={strings.membershipCurrentTier}>
        {subscriptionLoading ? (
          <ActivityIndicator color={theme.colors.text} />
        ) : (
          <>
            <Row label="Plan" value={<Text style={{ color: theme.colors.text, fontFamily: "Inter_700Bold" }}>{currentPlan}</Text>} />
            {subscription?.status && <Row label="Status" value={<Text style={{ color: theme.colors.text }}>{subscription.status}</Text>} />}
            {subscription?.currentPeriodEnd && (
              <Row
                label="Renews"
                value={<Text style={{ color: theme.colors.text }}>{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</Text>}
              />
            )}
          </>
        )}
      </Section>

      {nextPlan ? (
        <Section title="Upgrade">
          <Text style={{ color: theme.colors.subtitle }}>Upgrade to {nextPlan} to unlock more features.</Text>
          <PrimaryButton label={`${strings.membershipUpgrade} → ${nextPlan}`} onPress={() => router.push(`/modals/subscription?plan=${nextPlan}`)} />
        </Section>
      ) : (
        <Section title="You’re on Pro">
          <Text style={{ color: theme.colors.subtitle }}>
            Restore purchases if you changed devices.
          </Text>
        </Section>
      )}

      <Section title="Restore">
        <PrimaryButton label={strings.membershipRestore} onPress={onRestorePurchases} variant="secondary" />
      </Section>
    </SettingsShell>
  );
}


