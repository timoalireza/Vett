import { useMemo } from "react";
import { useRouter } from "expo-router";

import { getStrings } from "../../src/i18n/strings";
import { useAppState } from "../../src/state/app-state";
import { SettingsShell, Section, TouchableRow } from "./_shared";

export default function SettingsScreen() {
  const router = useRouter();
  const { language } = useAppState();

  const strings = useMemo(() => getStrings(language), [language]);
  return (
    <SettingsShell title={strings.settingsTitle}>
      <Section title="Preferences">
        <TouchableRow label={strings.membershipTab} value="" onPress={() => router.push("/settings/membership")} />
        <TouchableRow label={strings.accountTab} value="" onPress={() => router.push("/settings/account")} />
        <TouchableRow label={strings.languageTab} value="" onPress={() => router.push("/settings/language")} />
      </Section>

      <Section title="Legal">
        <TouchableRow label="Terms" value="" onPress={() => router.push("/settings/terms")} />
        <TouchableRow label="Privacy" value="" onPress={() => router.push("/settings/privacy")} />
        <TouchableRow label="About" value="" onPress={() => router.push("/settings/about")} />
      </Section>
    </SettingsShell>
  );
}

