import React, { useEffect } from "react";
import { View, useWindowDimensions, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  interpolate,
} from "react-native-reanimated";

import { LensMotif } from "./LensMotif";
import { ScoreRing } from "./ScoreRing";
import { ColorTintOverlay } from "./ColorTintOverlay";
import { LensState } from "../../hooks/useLensState";

interface LensContainerProps {
  state: LensState;
  score: number;
  verdict?: string;
}

export const LensContainer: React.FC<LensContainerProps> = ({
  state,
  score,
  verdict,
}) => {
  const { width, height } = useWindowDimensions();

  // Responsive Sizing
  // Mobile (<768): 200 -> 100
  // Tablet (768-1024): 280 -> 140
  // Desktop (>1024): 320 -> 160
  let initialSize = 200;
  let resultSize = 100;

  if (width >= 1024) {
    initialSize = 320;
    resultSize = 160;
  } else if (width >= 768) {
    initialSize = 280;
    resultSize = 140;
  }

  // Animations
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const pulse = useSharedValue(1);

  // Constants
  // Translate up amount: about 35-40% of screen height to sit at top
  // Or just enough to leave room for cards.
  // Prompt says: transform: translateY(-40vh)
  const translateUpAmount = -height * 0.35;

  useEffect(() => {
    if (state === "loading") {
      // Pulse Animation
      // 1.5s loop, ease-in-out
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 750, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      pulse.value = withTiming(1);
    }

    if (state === "result") {
      // Transition to Result
      // Translate Up: 600ms ease-out
      translateY.value = withTiming(translateUpAmount, {
        duration: 600,
        easing: Easing.out(Easing.ease),
      });
      
      // Scale Down: 600ms ease-out
      // Calculate scale factor
      const scaleFactor = resultSize / initialSize;
      scale.value = withTiming(scaleFactor, {
        duration: 600,
        easing: Easing.out(Easing.ease),
      });
    } else {
      // Reset
      translateY.value = withTiming(0);
      scale.value = withTiming(1);
    }
  }, [state, height, initialSize, resultSize]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { scale: scale.value * pulse.value },
      ],
    };
  });

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View style={[styles.lensWrapper, animatedStyle]}>
        <LensMotif size={initialSize} />
        
        {state === "result" && (
          <>
            <View style={StyleSheet.absoluteFill}>
               <ScoreRing score={score} size={initialSize} />
            </View>
            <View style={StyleSheet.absoluteFill}>
               <ColorTintOverlay score={score} size={initialSize} />
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    // Ensure it doesn't block touch events elsewhere if needed, 
    // but usually this sits in a full screen view.
    flex: 1,
  },
  lensWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
});

