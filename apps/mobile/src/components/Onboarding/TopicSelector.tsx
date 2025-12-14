import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { GlassChip } from "../GlassChip";
import { useTheme } from "../../hooks/use-theme";

export const TOPICS = [
  "News",
  "Fitness & Health",
  "Finance",
  "Politics",
  "Social media gossip",
  "Science & Tech",
] as const;

export type Topic = (typeof TOPICS)[number];

interface TopicSelectorProps {
  selectedTopics: Topic[];
  onSelectionChange: (topics: Topic[]) => void;
}

export function TopicSelector({ selectedTopics, onSelectionChange }: TopicSelectorProps) {
  const theme = useTheme();

  const toggleTopic = (topic: Topic) => {
    if (selectedTopics.includes(topic)) {
      onSelectionChange(selectedTopics.filter((t) => t !== topic));
    } else {
      onSelectionChange([...selectedTopics, topic]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {TOPICS.map((topic) => {
          const isSelected = selectedTopics.includes(topic);
          return (
            <TouchableOpacity
              key={topic}
              onPress={() => toggleTopic(topic)}
              activeOpacity={0.7}
            >
              <GlassChip
                label={topic}
                gradientColors={
                  isSelected
                    ? [theme.colors.primary, theme.colors.highlight]
                    : undefined
                }
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected
                      ? theme.colors.primary + "20"
                      : undefined,
                    borderColor: isSelected
                      ? theme.colors.primary
                      : theme.colors.borderLight,
                  },
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  chip: {
    minWidth: 100,
  },
});

