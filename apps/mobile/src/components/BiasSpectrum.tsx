import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";

import { useTheme } from "../hooks/use-theme";

interface BiasSpectrumProps {
  position: number; // 0 left, 1 right
}

const labels = ["Left", "Center", "Right"];

export function BiasSpectrum({ position }: BiasSpectrumProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        padding: theme.spacing(2),
        borderRadius: theme.radii.lg,
        backgroundColor: theme.colors.card
      }}
      accessibilityLabel={`Bias Spectrum ${Math.round(position * 100)} percent toward right`}
    >
      <Text
        style={{
          color: theme.colors.subtitle,
          marginBottom: theme.spacing(1),
          fontFamily: "Inter_500Medium"
        }}
      >
        Bias Spectrum
      </Text>
      <LinearGradient
        colors={["#4C7DFF", theme.colors.accent, theme.colors.warning]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          height: 14,
          borderRadius: theme.radii.pill,
          overflow: "hidden",
          justifyContent: "center"
        }}
      >
        <MotiView
          from={{ translateX: -20, opacity: 0 }}
          animate={{ translateX: position * 250 - 10, opacity: 1 }}
          transition={{ type: "timing", duration: 500 }}
          style={{
            position: "absolute",
            width: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: theme.colors.white,
            backgroundColor: theme.colors.background
          }}
        />
      </LinearGradient>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: theme.spacing(1)
        }}
      >
        {labels.map((label) => (
          <Text
            key={label}
            style={{
              color: theme.colors.subtitle,
              fontSize: 12,
              fontFamily: "Inter_400Regular"
            }}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

