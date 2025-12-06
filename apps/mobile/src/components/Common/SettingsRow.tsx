import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  value?: string;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({ icon, label, onPress, value }) => (
  <Pressable
    onPress={onPress}
    style={{
      backgroundColor: "#0A0A0A",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#1A1A1A",
      paddingVertical: 16,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
    }}
  >
    <Ionicons name={icon} size={20} color="#8A8A8A" />
    <Text
      style={{
        flex: 1,
        marginLeft: 12,
        fontFamily: "Inter_400Regular",
        fontSize: 15,
        color: "#E5E5E5",
      }}
    >
      {label}
    </Text>
    {value && (
      <Text
        style={{
          fontFamily: "Inter_400Regular",
          fontSize: 14,
          color: "#6B6B6B",
          marginRight: 8,
        }}
      >
        {value}
      </Text>
    )}
    <Ionicons name="chevron-forward" size={20} color="#4A4A4A" />
  </Pressable>
);

