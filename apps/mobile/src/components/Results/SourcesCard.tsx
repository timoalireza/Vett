import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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

interface Source {
  id: string;
  provider: string;
  title: string;
  url: string;
  reliability: number | null;
  summary?: string | null;
}

interface SourcesCardProps {
  sources: Source[];
}

export const SourcesCard: React.FC<SourcesCardProps> = ({ sources }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <Card label={`SOURCES                    ${sources.length} ▼`}>
      <View style={styles.list}>
        {sources.map((source, index) => (
          <TouchableOpacity
            key={index}
            style={styles.sourceItem}
            onPress={() => Linking.openURL(source.url)}
            activeOpacity={0.7}
          >
            <Ionicons name="globe-outline" size={16} color="#8A8A8A" />
            <View style={styles.sourceContent}>
              <Text style={styles.sourceTitle} numberOfLines={1}>
                {source.title}
              </Text>
              <Text style={styles.sourceUrl} numberOfLines={1}>
                {source.summary || new URL(source.url).hostname}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
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
  list: {
    gap: 8,
  },
  sourceItem: {
    backgroundColor: "#000000", // Inner card background? Doc implies inner card border
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  favicon: {
    width: 16,
    height: 16,
    borderRadius: 2,
    marginRight: 12,
  },
  sourceContent: {
    flex: 1,
    marginLeft: 8,
  },
  sourceTitle: {
    fontSize: 14,
    color: "#E5E5E5",
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  sourceUrl: {
    fontSize: 12,
    color: "#6B6B6B",
    fontFamily: "Inter_400Regular",
  },
});
