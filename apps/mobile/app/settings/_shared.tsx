import React from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useTheme } from "../../src/hooks/use-theme";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";

export function SettingsShell({
  title,
  children,
  contentContainerStyle
}: {
  title: string;
  children: React.ReactNode;
  contentContainerStyle?: any;
}) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
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
            {title}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: theme.spacing(2),
              paddingBottom: theme.spacing(6),
              gap: theme.spacing(2.5)
            },
            contentContainerStyle
          ]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
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

export function Row({ label, value }: { label: string; value: React.ReactNode }) {
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

export function TouchableRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: theme.spacing(1)
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

export function Field({
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

export function PrimaryButton({
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


