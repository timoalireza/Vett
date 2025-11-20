import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAppState } from "../src/state/app-state";
import { useTheme } from "../src/hooks/use-theme";
import { GradientBackground } from "../src/components/GradientBackground";
import { GlassCard } from "../src/components/GlassCard";

export default function SignInScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { setAuthMode } = useAppState();

  const handleContinue = async (mode: "guest" | "signedIn") => {
    await setAuthMode(mode === "guest" ? "guest" : "signedIn");
    router.replace("/(tabs)/analyze");
  };

  return (
    <GradientBackground>
      <View
        style={{
          flex: 1,
          padding: theme.spacing(4),
          justifyContent: "center"
        }}
      >
        <GlassCard
          style={{
            padding: theme.spacing(3),
            gap: theme.spacing(2)
          }}
        >
          <Text
            style={{
              color: theme.colors.text,
              fontSize: 34,
              fontFamily: "SpaceGrotesk_600SemiBold"
            }}
          >
            Vett
          </Text>
          <Text
            style={{
              color: theme.colors.subtitle,
              fontSize: 18,
              fontFamily: "SpaceGrotesk_400Regular"
            }}
          >
            Verify anything in seconds. Choose how you want to continue.
          </Text>
          <Button icon="logo-apple" label="Continue with Apple" onPress={() => handleContinue("signedIn")} />
          <Button icon="logo-google" label="Continue with Google" onPress={() => handleContinue("signedIn")} />
          <TouchableOpacity onPress={() => handleContinue("guest")} accessibilityLabel="Continue as Guest">
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 16,
                textAlign: "center",
                fontFamily: "SpaceGrotesk_500Medium"
              }}
            >
              Continue as Guest
            </Text>
          </TouchableOpacity>
        </GlassCard>
      </View>
    </GradientBackground>
  );
}

function Button({
  label,
  icon,
  onPress
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing(1),
        paddingVertical: theme.spacing(1.5),
        borderRadius: theme.radii.pill,
        backgroundColor: theme.colors.surface
      }}
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={20} color={theme.colors.text} />
      <Text
        style={{
          color: theme.colors.text,
          fontSize: 16,
          fontFamily: "SpaceGrotesk_500Medium"
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

