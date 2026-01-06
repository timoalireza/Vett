import { useMemo } from "react";
import { Text } from "react-native";

import { getStrings, SUPPORTED_LANGUAGES, type SupportedLanguage } from "../../src/i18n/strings";
import { useAppState } from "../../src/state/app-state";
import { useTheme } from "../../src/hooks/use-theme";
import { Section, SettingsShell, TouchableRow } from "./_shared";

export default function LanguageSettingsScreen() {
  const theme = useTheme();
  const { language, setLanguage } = useAppState();
  const strings = useMemo(() => getStrings(language), [language]);

  return (
    <SettingsShell title={strings.languageTab}>
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
    </SettingsShell>
  );
}





