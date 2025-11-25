import { Text, TouchableOpacity } from "react-native";

import { useTheme } from "../hooks/use-theme";

interface TopicChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
}

export function TopicChip({ label, active = false, onPress }: TopicChipProps) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: theme.spacing(2),
        paddingVertical: theme.spacing(1),
        borderRadius: theme.radii.pill,
        backgroundColor: active ? theme.colors.primary : "rgba(255,255,255,0.08)",
        marginRight: theme.spacing(1)
      }}
      accessibilityLabel={`${label} topic`}
    >
      <Text
        style={{
          color: active ? theme.colors.background : theme.colors.subtitle,
          fontFamily: "Inter_500Medium"
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

