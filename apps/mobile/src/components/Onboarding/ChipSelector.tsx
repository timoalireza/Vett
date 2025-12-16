import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../hooks/use-theme";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface ChipOption {
  id: string;
  label: string;
}

interface ChipSelectorProps {
  options: ChipOption[];
  selected: string | string[];
  onSelect: (id: string | string[]) => void;
  multiSelect?: boolean;
}

export function ChipSelector({
  options,
  selected,
  onSelect,
  multiSelect = false,
}: ChipSelectorProps) {
  const theme = useTheme();

  const isSelected = (id: string) => {
    if (multiSelect) {
      return Array.isArray(selected) && selected.includes(id);
    }
    return selected === id;
  };

  const handlePress = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (multiSelect) {
      const current = Array.isArray(selected) ? selected : [];
      if (current.includes(id)) {
        onSelect(current.filter((item) => item !== id));
      } else {
        onSelect([...current, id]);
      }
    } else {
      onSelect(id);
    }
  };

  return (
    <View style={styles.container}>
      {options.map((option) => (
        <Chip
          key={option.id}
          label={option.label}
          selected={isSelected(option.id)}
          onPress={() => handlePress(option.id)}
          theme={theme}
        />
      ))}
    </View>
  );
}

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: any;
}

function Chip({ label, selected, onPress, theme }: ChipProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        animatedStyle,
        styles.chip,
        {
          backgroundColor: selected
            ? theme.colors.primary
            : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          borderWidth: 1,
          borderRadius: theme.radii.pill,
        },
      ]}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.chipText,
          {
            color: selected ? "#000000" : theme.colors.text,
            fontFamily: selected ? "Inter_500Medium" : "Inter_400Regular",
            fontSize: theme.typography.body,
          },
        ]}
      >
        {label}
      </Text>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 12,
  },
  chip: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: 44,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  chipText: {
    textAlign: "center",
  },
});

