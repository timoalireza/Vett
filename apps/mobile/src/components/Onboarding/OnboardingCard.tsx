import React, { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../hooks/use-theme";

interface OnboardingCardProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function OnboardingCard({ title, subtitle, children }: OnboardingCardProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {children && <View style={styles.visualContainer}>{children}</View>}
      <Text
        style={[
          styles.title,
          {
            color: theme.colors.text,
            fontFamily: "Inter_200ExtraLight",
            fontSize: theme.typography.heading,
          },
        ]}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={[
            styles.subtitle,
            {
              color: theme.colors.textSecondary,
              fontFamily: "Inter_400Regular",
              fontSize: theme.typography.body,
            },
          ]}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 100,
  },
  visualContainer: {
    height: 300,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 16,
  },
});

