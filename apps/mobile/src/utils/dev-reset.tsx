import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { clearAllStorage } from "./clear-storage";
import { useAppState } from "../state/app-state";
import { useTheme } from "../hooks/use-theme";

/**
 * Dev-only component to reset all app data
 * Add this to a dev settings screen or use in development builds only
 */
export function DevResetButton() {
  const theme = useTheme();
  const { resetState } = useAppState();

  const handleReset = async () => {
    Alert.alert(
      "Reset App Data",
      "This will clear all stored data including onboarding, auth state, and preferences. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await clearAllStorage();
              await resetState();
              Alert.alert("Success", "All app data has been cleared. Restart the app.");
            } catch (error) {
              Alert.alert("Error", "Failed to clear storage: " + (error as Error).message);
            }
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      onPress={handleReset}
      style={[
        styles.button,
        {
          backgroundColor: theme.colors.danger + "20",
          borderColor: theme.colors.danger,
          borderRadius: theme.radii.md,
          borderWidth: 1,
          padding: theme.spacing(2),
        },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          {
            color: theme.colors.danger,
            fontFamily: "Inter_500Medium",
            fontSize: theme.typography.body,
          },
        ]}
      >
        🗑️ Reset All App Data (Dev Only)
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    textAlign: "center",
  },
});

