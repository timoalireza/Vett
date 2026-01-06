export type SupportedLanguage = "en" | "es" | "fr";

type Strings = {
  settingsTitle: string;
  membershipTab: string;
  accountTab: string;
  languageTab: string;

  membershipCurrentTier: string;
  membershipUpgrade: string;
  membershipManage: string;
  membershipRestore: string;

  accountProfile: string;
  accountContact: string;
  accountLinkedAccounts: string;
  accountPrivacy: string;
  accountSecurity: string;
  accountLegal: string;
};

const STRINGS: Record<SupportedLanguage, Strings> = {
  en: {
    settingsTitle: "Settings",
    membershipTab: "Membership",
    accountTab: "Account",
    languageTab: "Language",

    membershipCurrentTier: "Current tier",
    membershipUpgrade: "Upgrade",
    membershipManage: "Manage subscription",
    membershipRestore: "Restore purchases",

    accountProfile: "Profile",
    accountContact: "Contact",
    accountLinkedAccounts: "Linked accounts",
    accountPrivacy: "Data & privacy",
    accountSecurity: "Security",
    accountLegal: "Legal"
  },
  es: {
    settingsTitle: "Ajustes",
    membershipTab: "Membresía",
    accountTab: "Cuenta",
    languageTab: "Idioma",

    membershipCurrentTier: "Plan actual",
    membershipUpgrade: "Mejorar plan",
    membershipManage: "Administrar suscripción",
    membershipRestore: "Restaurar compras",

    accountProfile: "Perfil",
    accountContact: "Contacto",
    accountLinkedAccounts: "Cuentas vinculadas",
    accountPrivacy: "Datos y privacidad",
    accountSecurity: "Seguridad",
    accountLegal: "Legal"
  },
  fr: {
    settingsTitle: "Paramètres",
    membershipTab: "Abonnement",
    accountTab: "Compte",
    languageTab: "Langue",

    membershipCurrentTier: "Forfait actuel",
    membershipUpgrade: "Mettre à niveau",
    membershipManage: "Gérer l’abonnement",
    membershipRestore: "Restaurer les achats",

    accountProfile: "Profil",
    accountContact: "Contact",
    accountLinkedAccounts: "Comptes liés",
    accountPrivacy: "Données et confidentialité",
    accountSecurity: "Sécurité",
    accountLegal: "Légal"
  }
};

export function getStrings(language: string): Strings {
  const lang = (language as SupportedLanguage) in STRINGS ? (language as SupportedLanguage) : "en";
  return STRINGS[lang];
}

export const SUPPORTED_LANGUAGES: Array<{ code: SupportedLanguage; label: string }> = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" }
];





