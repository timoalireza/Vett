import { useEffect, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteAccount, requestDataDeletion, requestDataExport } from "../../src/api/account";
import { getLinkedSocialAccounts } from "../../src/api/social";
import { getStrings } from "../../src/i18n/strings";
import { useAppState } from "../../src/state/app-state";
import { useTheme } from "../../src/hooks/use-theme";
import { DevResetButton } from "../../src/utils/dev-reset";
import { Field, PrimaryButton, Row, Section, SettingsShell, TouchableRow } from "./_shared";

export default function AccountSettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const { user } = useUser();
  const userId = user?.id;
  const { language } = useAppState();

  const strings = useMemo(() => getStrings(language), [language]);

  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");

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

  const { data: linkedAccounts } = useQuery({
    queryKey: ["linkedSocialAccounts", userId],
    queryFn: getLinkedSocialAccounts,
    enabled: !!userId
  });

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
      if (result.success) Alert.alert("Request submitted", "We’ve received your data export request.");
      else Alert.alert("Error", result.error || "Failed to submit request");
    },
    onError: (error: any) => Alert.alert("Error", error?.message || "Failed to submit request")
  });

  const requestDeletionMutation = useMutation({
    mutationFn: async () => requestDataDeletion(),
    onSuccess: (result) => {
      if (result.success) Alert.alert("Request submitted", "We’ve received your data deletion request.");
      else Alert.alert("Error", result.error || "Failed to submit request");
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
      try {
        await signOut();
      } catch {
        // ignore
      }
      router.replace("/onboarding/welcome");
    },
    onError: (error: any) => Alert.alert("Error", error?.message || "Failed to delete account")
  });

  const instagramAccount = linkedAccounts?.find((acc) => acc.platform === "INSTAGRAM");

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
      router.replace("/onboarding/welcome");
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to sign out");
    }
  };

  // If future flows need to refresh user-linked resources (best-effort)
  const refreshAccountData = async () => {
    if (!userId) return;
    await queryClient.invalidateQueries({ queryKey: ["linkedSocialAccounts", userId] });
    await queryClient.invalidateQueries({ queryKey: ["subscription", userId] });
  };

  return (
    <SettingsShell title={strings.accountTab}>
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
        <Row label="Email" value={<Text style={{ color: theme.colors.text }}>{user?.primaryEmailAddress?.emailAddress || "None"}</Text>} />
        <Row label="Phone" value={<Text style={{ color: theme.colors.text }}>{user?.primaryPhoneNumber?.phoneNumber || "None"}</Text>} />

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
          <Text style={{ color: theme.colors.subtitle }}>Both email and phone are already on your account.</Text>
        )}
      </Section>

      <Section title={strings.accountLinkedAccounts}>
        <TouchableRow label="Instagram" value={instagramAccount ? "Linked" : "Not linked"} onPress={() => router.push("/settings/linked-accounts")} />
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

      {__DEV__ && (
        <Section title="Development">
          <DevResetButton />
        </Section>
      )}

      <Section title={strings.accountSecurity}>
        <PrimaryButton label="Log out" onPress={onSignOut} variant="secondary" />
        <PrimaryButton
          label="Refresh account data"
          onPress={refreshAccountData}
          variant="secondary"
        />
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
    </SettingsShell>
  );
}


