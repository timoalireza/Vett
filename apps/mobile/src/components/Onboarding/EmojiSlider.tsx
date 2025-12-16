import React from "react";
import { View, Text, StyleSheet, PanResponder, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../hooks/use-theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SLIDER_WIDTH = SCREEN_WIDTH - 80; // Account for padding
const SLIDER_HEIGHT = 80;

interface EmojiOption {
  emoji: string;
  label: string;
  value: number;
}

interface EmojiSliderProps {
  options: EmojiOption[];
  value: number;
  onChange: (value: number) => void;
}

export function EmojiSlider({ options, value, onChange }: EmojiSliderProps) {
  const theme = useTheme();
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);
  const [isDragging, setIsDragging] = React.useState(false);

  // Calculate positions for each option
  const optionPositions = options.map((_, index) => {
    return (index / (options.length - 1)) * SLIDER_WIDTH;
  });

  // Find closest option to current value
  const getClosestOption = (val: number) => {
    return options.reduce((prev, curr) =>
      Math.abs(curr.value - val) < Math.abs(prev.value - val) ? curr : prev
    );
  };

  // Initialize position based on value
  React.useEffect(() => {
    const closest = getClosestOption(value);
    const index = options.findIndex((opt) => opt.value === closest.value);
    if (index !== -1) {
      translateX.value = optionPositions[index];
    }
  }, [value]);

  const snapToNearest = (x: number) => {
    "worklet";
    let minDist = Infinity;
    let nearestIndex = 0;

    optionPositions.forEach((pos, index) => {
      const dist = Math.abs(x - pos);
      if (dist < minDist) {
        minDist = dist;
        nearestIndex = index;
      }
    });

    return nearestIndex;
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      startX.value = translateX.value;
      setIsDragging(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    onPanResponderMove: (_, gestureState) => {
      const newX = Math.max(
        0,
        Math.min(SLIDER_WIDTH, startX.value + gestureState.dx)
      );
      translateX.value = newX;
    },
    onPanResponderRelease: () => {
      const nearestIndex = snapToNearest(translateX.value);
      translateX.value = withSpring(optionPositions[nearestIndex], {
        damping: 15,
        stiffness: 150,
      });
      const selectedOption = options[nearestIndex];
      runOnJS(onChange)(selectedOption.value);
      runOnJS(setIsDragging)(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
  });

  const sliderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const currentIndex = options.findIndex((opt) => opt.value === value);

  return (
    <View style={styles.container}>
      <View style={styles.sliderTrack}>
        {/* Option markers */}
        {options.map((option, index) => {
          const position = optionPositions[index];
          const isSelected = index === currentIndex;

          return (
            <View
              key={option.value}
              style={[
                styles.markerContainer,
                {
                  left: position,
                },
              ]}
            >
              <View
                style={[
                  styles.marker,
                  {
                    backgroundColor: isSelected
                      ? theme.colors.primary
                      : theme.colors.border,
                    width: isSelected ? 60 : 50,
                    height: isSelected ? 60 : 50,
                    borderRadius: isSelected ? 30 : 25,
                  },
                ]}
              >
                <Text style={styles.emoji}>{option.emoji}</Text>
              </View>
              <Text
                style={[
                  styles.label,
                  {
                    color: isSelected
                      ? theme.colors.text
                      : theme.colors.textSecondary,
                    fontFamily: isSelected
                      ? "Inter_500Medium"
                      : "Inter_400Regular",
                    fontSize: theme.typography.caption,
                    marginTop: 8,
                  },
                ]}
              >
                {option.label}
              </Text>
            </View>
          );
        })}

        {/* Draggable handle */}
        <Animated.View
          style={[
            sliderStyle,
            styles.handle,
            {
              backgroundColor: theme.colors.primary,
              width: 24,
              height: 24,
              borderRadius: 12,
            },
          ]}
          {...panResponder.panHandlers}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SLIDER_WIDTH,
    height: SLIDER_HEIGHT + 60,
    alignItems: "center",
    justifyContent: "center",
  },
  sliderTrack: {
    width: SLIDER_WIDTH,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 2,
    position: "relative",
    marginTop: 40,
  },
  markerContainer: {
    position: "absolute",
    alignItems: "center",
    transform: [{ translateX: -25 }],
    top: -30,
  },
  marker: {
    justifyContent: "center",
    alignItems: "center",
  },
  emoji: {
    fontSize: 28,
  },
  label: {
    textAlign: "center",
    maxWidth: 80,
  },
  handle: {
    position: "absolute",
    top: -10,
    transform: [{ translateX: -12 }],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

