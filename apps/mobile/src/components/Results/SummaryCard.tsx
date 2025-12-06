import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface CardProps {
  label: string;
  children: React.ReactNode;
}

const Card = ({ label, children }: CardProps) => (
  <View style={styles.card}>
    <Text style={styles.label}>{label}</Text>
    {children}
  </View>
);

interface SummaryCardProps {
  summary: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ summary }) => {
  return (
    <Card label="SUMMARY">
      <Text style={styles.text}>{summary}</Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0A0A0A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1A1A1A",
    padding: 16,
    marginBottom: 12,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "#6B6B6B",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  text: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#E5E5E5",
    lineHeight: 22,
  },
});
