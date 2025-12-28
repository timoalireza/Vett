import { useEffect, useMemo, useState } from "react";
import { Alert, Linking, ScrollView, Text, TextInput, TouchableOpacity, View, StyleSheet, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useTheme } from "../../src/hooks/use-theme";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";
import { DevResetButton } from "../../src/utils/dev-reset";
import { fetchSubscription } from "../../src/api/subscription";
import { getLinkedSocialAccounts } from "../../src/api/social";
import { deleteAccount, requestDataDeletion, requestDataExport } from "../../src/api/account";
import { useRevenueCat } from "../../src/hooks/use-revenuecat";
import { getStrings, SUPPORTED_LANGUAGES, type SupportedLanguage } from "../../src/i18n/strings";
import { useAppState } from "../../src/state/app-state";

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const { user } = useUser();
  const { language, setLanguage } = useAppState();

  const strings = useMemo(() => getStrings(language), [language]);

  type TabKey = "membership" | "account" | "language";
  const [activeTab, setActiveTab] = useState<TabKey>("membership");

  // Existing settings preserved
  const [credibilityMode, setCredibilityMode] = useState<"standard" | "strict" | "max">("strict");

  // Account UI state
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");

  // Add contact flows (Clerk verification)
  const [emailToAdd, setEmailToAdd] = useState("");
  const [phoneToAdd, setPhoneToAdd] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [contactFlow, setContactFlow] = useState<null | { type: "email" | "phone"; step: "enter" | "verify"; resource: any }>(
    null
  );

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
  }, [user]);

  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: fetchSubscription,
    enabled: !!user
  });

  const { data: linkedAccounts } = useQuery({
    queryKey: ["linkedSocialAccounts"],
    queryFn: getLinkedSocialAccounts,
    enabled: !!user
  });

  const { restore } = useRevenueCat();

  const updateNameMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      return await user.update({ firstName: firstName.trim() || null, lastName: lastName.trim() || null } as any);
    },
    onSuccess: async () => {
      await user?.reload();
      Alert.alert("Saved", "Your name was updated.");
    },
    onError: (error: any) => {
      Alert.alert("Error", error?.message || "Failed to update name");
    }
  });

  const requestExportMutation = useMutation({
    mutationFn: async () => requestDataExport(),
    onSuccess: (result) => {
      if (result.success) {
        Alert.alert("Request submitted", "We’ve received your data export request.");
      } else {
        Alert.alert("Error", result.error || "Failed to submit request");
      }
    },
    onError: (error: any) => Alert.alert("Error", error?.message || "Failed to submit request")
  });

  const requestDeletionMutation = useMutation({
    mutationFn: async () => requestDataDeletion(),
    onSuccess: (result) => {
      if (result.success) {
        Alert.alert("Request submitted", "We’ve received your data deletion request.");
      } else {
        Alert.alert("Error", result.error || "Failed to submit request");
      }
    },
    onError: (error: any) => Alert.alert("Error", error?.message || "Failed to submit request")
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => deleteAccount(),
    onSuccess: async (result) => {
      if (!result.success) {
        Alert.alert("Error", result.error || "Failed to delete account");
        return;
      }
      // Best-effort sign out + reset app state
      try {
        await signOut();
      } catch {
        // ignore
      }
      // After deleting the account, restart onboarding from the beginning.
      router.replace("/onboarding/welcome");
    },
    onError: (error: any) => Alert.alert("Error", error?.message || "Failed to delete account")
  });

  const instagramAccount = linkedAccounts?.find((acc) => acc.platform === "INSTAGRAM");

  const currentPlan = subscription?.plan ?? "FREE";
  const nextPlan: "PLUS" | "PRO" | null = currentPlan === "FREE" ? "PLUS" : currentPlan === "PLUS" ? "PRO" : null;

  const openManageSubscriptions = async () => {
    const url =
      Platform.OS === "ios"
        ? "https://apps.apple.com/account/subscriptions"
        : "https://play.google.com/store/account/subscriptions";
    const can = await Linking.canOpenURL(url);
    if (can) await Linking.openURL(url);
    else Alert.alert("Unable to open", "Please manage your subscription from your device settings.");
  };

  const onRestorePurchases = async () => {
    try {
      await restore();
      // Refresh subscription data (server will opportunistically sync from RevenueCat)
      await queryClient.invalidateQueries({ queryKey: ["subscription"] });
      Alert.alert("Restored", "Purchases restored. If you still don’t see your plan, try again in a moment.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to restore purchases");
    }
  };

  const startAddEmail = async () => {
    if (!user) return;
    const email = emailToAdd.trim();
    if (!email) {
      Alert.alert("Missing email", "Enter an email address to continue.");
      return;
    }
    try {
      const res = await (user as any).createEmailAddress({ emailAddress: email });
      await res.prepareVerification({ strategy: "email_code" });
      setContactFlow({ type: "email", step: "verify", resource: res });
      setVerificationCode("");
      Alert.alert("Check your email", "We sent you a verification code.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to start email verification");
    }
  };

  const startAddPhone = async () => {
    if (!user) return;
    const phone = phoneToAdd.trim();
    if (!phone) {
      Alert.alert("Missing phone", "Enter a phone number in international format (e.g. +14155552671).");
      return;
    }
    try {
      const res = await (user as any).createPhoneNumber({ phoneNumber: phone });
      await res.prepareVerification({ strategy: "phone_code" });
      setContactFlow({ type: "phone", step: "verify", resource: res });
      setVerificationCode("");
      Alert.alert("Check your phone", "We sent you a verification code.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to start phone verification");
    }
  };

  const verifyContact = async () => {
    if (!user || !contactFlow?.resource) return;
    const code = verificationCode.trim();
    if (!code) {
      Alert.alert("Missing code", "Enter the verification code.");
      return;
    }
    try {
      await contactFlow.resource.attemptVerification({ code });
      await user.reload();
      setContactFlow(null);
      setEmailToAdd("");
      setPhoneToAdd("");
      setVerificationCode("");
      Alert.alert("Verified", "Your contact method was added.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to verify code");
    }
  };

  const onSignOut = async () => {
    try {
      await signOut();
      // Always restart onboarding from the beginning after an explicit sign out.
      // NOTE: We must route directly to /onboarding/welcome (not /onboarding) because
      // /onboarding/index redirects onboarded users into the main app.
      router.replace("/onboarding/welcome");
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to sign out");
    }
  };

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
            {strings.settingsTitle}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Tabs */}
        <GlassCard
          style={{
            marginHorizontal: 20,
            marginTop: theme.spacing(1),
            padding: 4,
            borderRadius: theme.radii.lg,
            flexDirection: "row",
            gap: 4
          }}
        >
          <TabButton label={strings.membershipTab} active={activeTab === "membership"} onPress={() => setActiveTab("membership")} />
          <TabButton label={strings.accountTab} active={activeTab === "account"} onPress={() => setActiveTab("account")} />
          <TabButton label={strings.languageTab} active={activeTab === "language"} onPress={() => setActiveTab("language")} />
        </GlassCard>

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
          {activeTab === "membership" && (
            <>
              <Section title={strings.membershipCurrentTier}>
                {subscriptionLoading ? (
                  <ActivityIndicator color={theme.colors.text} />
                ) : (
                  <>
                    <Row
                      label="Plan"
                      value={<Text style={{ color: theme.colors.text, fontFamily: "Inter_700Bold" }}>{currentPlan}</Text>}
                    />
                    {subscription?.status && (
                      <Row label="Status" value={<Text style={{ color: theme.colors.text }}>{subscription.status}</Text>} />
                    )}
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
                  <Text style={{ color: theme.colors.subtitle }}>
                    Upgrade to {nextPlan} to unlock more features.
                  </Text>
                  <PrimaryButton
                    label={`${strings.membershipUpgrade} → ${nextPlan}`}
                    onPress={() => router.push(`/modals/subscription?plan=${nextPlan}`)}
                  />
                </Section>
              ) : (
                <Section title="You’re on Pro">
                  <Text style={{ color: theme.colors.subtitle }}>
                    Manage your subscription or restore purchases if you changed devices.
                  </Text>
                </Section>
              )}

              <Section title="Subscription">
                <PrimaryButton label={strings.membershipManage} onPress={openManageSubscriptions} />
                <PrimaryButton label={strings.membershipRestore} onPress={onRestorePurchases} variant="secondary" />
              </Section>
            </>
          )}

          {activeTab === "account" && (
            <>
              <Section title={strings.accountProfile}>
                <Field label="First name" value={firstName} onChange={setFirstName} placeholder="First name" />
                <Field label="Last name" value={lastName} onChange={setLastName} placeholder="Last name" />
                <PrimaryButton
                  label={updateNameMutation.isPending ? "Saving..." : "Save name"}
                  onPress={() => updateNameMutation.mutate()}
                  disabled={updateNameMutation.isPending}
                />
              </Section>

              <Section title={strings.accountContact}>
                <Row
                  label="Email"
                  value={<Text style={{ color: theme.colors.text }}>{user?.primaryEmailAddress?.emailAddress || "None"}</Text>}
                />
                <Row
                  label="Phone"
                  value={<Text style={{ color: theme.colors.text }}>{user?.primaryPhoneNumber?.phoneNumber || "None"}</Text>}
                />

                {!contactFlow && !user?.primaryEmailAddress && (
                  <>
                    <Field label="Add email" value={emailToAdd} onChange={setEmailToAdd} placeholder="name@example.com" keyboardType="email-address" />
                    <PrimaryButton label="Send email code" onPress={startAddEmail} />
                  </>
                )}

                {!contactFlow && !!user?.primaryEmailAddress && !user?.primaryPhoneNumber && (
                  <>
                    <Field label="Add phone" value={phoneToAdd} onChange={setPhoneToAdd} placeholder="+14155552671" keyboardType="phone-pad" />
                    <PrimaryButton label="Send SMS code" onPress={startAddPhone} />
                  </>
                )}

                {!!contactFlow && (
                  <>
                    <Field
                      label="Verification code"
                      value={verificationCode}
                      onChange={setVerificationCode}
                      placeholder="123456"
                      keyboardType="number-pad"
                    />
                    <View style={{ flexDirection: "row", gap: theme.spacing(1) }}>
                      <PrimaryButton
                        label="Cancel"
                        variant="secondary"
                        onPress={() => {
                          setContactFlow(null);
                          setVerificationCode("");
                        }}
                        style={{ flex: 1 }}
                      />
                      <PrimaryButton label="Verify" onPress={verifyContact} style={{ flex: 1 }} />
                    </View>
                  </>
                )}

                {!!user?.primaryEmailAddress && !!user?.primaryPhoneNumber && (
                  <Text style={{ color: theme.colors.subtitle }}>
                    Both email and phone are already on your account.
                  </Text>
                )}
              </Section>

              <Section title={strings.accountLinkedAccounts}>
                <TouchableRow
                  label="Instagram"
                  value={instagramAccount ? "Linked" : "Not linked"}
                  onPress={() => router.push("/settings/linked-accounts")}
                />
              </Section>

              <Section title={strings.accountPrivacy}>
                <TouchableRow
                  label="Request my data"
                  value="Export"
                  onPress={() =>
                    Alert.alert("Request data export", "We’ll prepare a copy of your data.", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Submit", onPress: () => requestExportMutation.mutate() }
                    ])
                  }
                />
                <TouchableRow
                  label="Request data deletion"
                  value="Delete"
                  onPress={() =>
                    Alert.alert(
                      "Request data deletion",
                      "This starts a deletion request. If you want to immediately delete your account, use “Delete account” below.",
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Submit", style: "destructive", onPress: () => requestDeletionMutation.mutate() }
                      ]
                    )
                  }
                />
              </Section>

              <Section title={strings.accountLegal}>
                <TouchableRow label="Terms" value="" onPress={() => router.push("/settings/terms")} />
                <TouchableRow label="Privacy" value="" onPress={() => router.push("/settings/privacy")} />
                <TouchableRow label="About" value="" onPress={() => router.push("/settings/about")} />
              </Section>

              <Section title="Preferences">
                <Text style={{ color: theme.colors.subtitle }}>Theme: Following system appearance for now.</Text>
                <Text style={{ color: theme.colors.subtitle, marginTop: theme.spacing(1) }}>Credibility mode</Text>
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

              <Section title={strings.accountSecurity}>
                <PrimaryButton label="Log out" onPress={onSignOut} variant="secondary" />
                <PrimaryButton
                  label={deleteAccountMutation.isPending ? "Deleting..." : "Delete account"}
                  onPress={() =>
                    Alert.alert(
                      "Delete account",
                      "This permanently deletes your Vett account and data. Subscriptions must be managed in the App Store / Play Store.",
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Delete", style: "destructive", onPress: () => deleteAccountMutation.mutate() }
                      ]
                    )
                  }
                  variant="destructive"
                  disabled={deleteAccountMutation.isPending}
                />
              </Section>

              {/* Dev Reset Button - Only in development */}
              {__DEV__ && (
                <Section title="Development">
                  <DevResetButton />
                </Section>
              )}
            </>
          )}

          {activeTab === "language" && (
            <Section title="Language">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <TouchableRow
                  key={lang.code}
                  label={lang.label}
                  value={(language as SupportedLanguage) === lang.code ? "Selected" : ""}
                  onPress={() => setLanguage(lang.code)}
                />
              ))}
              <Text style={{ color: theme.colors.subtitle }}>
                Language is applied to Settings now; more screens will be translated next.
              </Text>
            </Section>
          )}
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
          fontFamily: "Inter_700Bold",
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

function TouchableRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: theme.spacing(1),
      }}
    >
      <Text style={{ color: theme.colors.text, fontSize: theme.typography.body, flex: 1, marginRight: theme.spacing(2) }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(0.5) }}>
        {!!value && <Text style={{ color: theme.colors.subtitle, fontSize: theme.typography.caption }}>{value}</Text>}
        <Ionicons name="chevron-forward" size={18} color={theme.colors.subtitle} />
      </View>
    </TouchableOpacity>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad";
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing(0.75) }}>
      <Text style={{ color: theme.colors.subtitle, fontSize: theme.typography.caption }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.subtitle}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderRadius: theme.radii.md,
          padding: theme.spacing(1.5),
          color: theme.colors.text,
          fontSize: theme.typography.body
        }}
      />
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  variant = "primary",
  disabled,
  style
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "destructive";
  disabled?: boolean;
  style?: any;
}) {
  const theme = useTheme();
  const backgroundColor =
    variant === "primary"
      ? "rgba(59, 130, 246, 0.25)"
      : variant === "destructive"
        ? "rgba(255, 59, 48, 0.2)"
        : "rgba(255, 255, 255, 0.1)";
  const textColor = variant === "destructive" ? "#FF3B30" : theme.colors.text;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[
        {
          backgroundColor,
          borderRadius: theme.radii.md,
          paddingVertical: theme.spacing(1.5),
          alignItems: "center",
          opacity: disabled ? 0.6 : 1
        },
        style
      ]}
    >
      <Text style={{ color: textColor, fontFamily: "Inter_500Medium", fontSize: theme.typography.body }}>{label}</Text>
    </TouchableOpacity>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        flex: 1,
        paddingVertical: theme.spacing(1.25),
        borderRadius: theme.radii.md,
        backgroundColor: active ? "rgba(59, 130, 246, 0.35)" : "transparent",
        alignItems: "center"
      }}
    >
      <Text style={{ color: theme.colors.text, fontFamily: active ? "Inter_500Medium" : "Inter_400Regular" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

