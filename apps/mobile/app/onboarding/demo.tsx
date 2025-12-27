import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";

import { ClaimInput, ClaimInputRef } from "../../src/components/Input/ClaimInput";
import { useLensState } from "../../src/hooks/useLensState";
import { VideoAnimation } from "../../src/components/Video/VideoAnimation";
import { useVideoAnimationState } from "../../src/components/Video/VideoAnimationProvider";
import { OnboardingBackButton } from "../../src/components/Onboarding/OnboardingBackButton";

// Match homescreen videos
const VIDEO_IDLE = require("../../assets/animations/home-idle.mp4");
const VIDEO_TYPING = require("../../assets/animations/home-typing.mp4");
const VIDEO_LOADING = require("../../assets/animations/loading.mp4");
const HOME_IDLE_STILL = require("../../assets/animations/home-idle-still.png");

const DEMO_CLAIM = "Scientists have discovered that drinking coffee can extend your lifespan by up to 10 years.";

export default function DemoScreen() {
  const router = useRouter();
  const inputRef = useRef<ClaimInputRef>(null);
  const { registerVideo } = useVideoAnimationState();

  const { state: lensState, toInput, toLoading, reset } = useLensState();
  const [input, setInput] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Background video state - keep all mounted and crossfade
  const [activeVideoSource, setActiveVideoSource] = useState(VIDEO_IDLE);
  const idleOpacity = useSharedValue(1);
  const typingOpacity = useSharedValue(0);
  const loadingOpacity = useSharedValue(0);
  const isAnimatingRef = useRef(false);
  const animationTargetRef = useRef<typeof VIDEO_IDLE | null>(null);

  // Input animation
  const inputOpacity = useSharedValue(0);
  const inputScale = useSharedValue(1);
  const actionRowOpacity = useSharedValue(0);
  const actionRowTranslateY = useSharedValue(20);

  const screenDimensions = Dimensions.get("window");
  const screenWidth = screenDimensions.width;
  const screenHeight = screenDimensions.height;

  const resetAnimationFlags = useCallback(() => {
    isAnimatingRef.current = false;
    animationTargetRef.current = null;
  }, []);

  useEffect(() => {
    let newSource = VIDEO_IDLE;
    if (lensState === "loading") {
      newSource = VIDEO_LOADING;
      registerVideo("loading");
    } else if (lensState === "input" || isInputFocused || input) {
      newSource = VIDEO_TYPING;
      registerVideo("home-typing");
    } else {
      newSource = VIDEO_IDLE;
      registerVideo("home-idle");
    }

    if (isAnimatingRef.current && animationTargetRef.current === newSource && activeVideoSource === newSource) {
      return;
    }

    if (newSource !== activeVideoSource) {
      const previousSource = activeVideoSource;

      if (isAnimatingRef.current && animationTargetRef.current !== newSource) {
        cancelAnimation(idleOpacity);
        cancelAnimation(typingOpacity);
        isAnimatingRef.current = false;
        animationTargetRef.current = null;
      }

      setActiveVideoSource(newSource);

      if (previousSource === VIDEO_IDLE && newSource === VIDEO_TYPING) {
        isAnimatingRef.current = true;
        animationTargetRef.current = newSource;
        idleOpacity.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) });
        typingOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }, (finished) => {
          if (finished) runOnJS(resetAnimationFlags)();
        });
        loadingOpacity.value = 0;
      } else if (previousSource === VIDEO_TYPING && newSource === VIDEO_IDLE) {
        isAnimatingRef.current = true;
        animationTargetRef.current = newSource;
        typingOpacity.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) });
        idleOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }, (finished) => {
          if (finished) runOnJS(resetAnimationFlags)();
        });
        loadingOpacity.value = 0;
      } else {
        if (newSource === VIDEO_IDLE) {
          idleOpacity.value = 1;
          typingOpacity.value = 0;
          loadingOpacity.value = 0;
        } else if (newSource === VIDEO_TYPING) {
          idleOpacity.value = 0;
          typingOpacity.value = 1;
          loadingOpacity.value = 0;
        } else if (newSource === VIDEO_LOADING) {
          idleOpacity.value = 0;
          typingOpacity.value = 0;
          loadingOpacity.value = 1;
        }
      }
    }
  }, [lensState, isInputFocused, input, registerVideo, activeVideoSource, idleOpacity, typingOpacity, loadingOpacity, resetAnimationFlags]);

  useEffect(() => {
    const isInputVisible = (isInputFocused || !!input) && lensState !== "loading";
    if (isInputVisible) {
      inputOpacity.value = withDelay(750, withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }));
      actionRowOpacity.value = withDelay(750, withTiming(1, { duration: 500, easing: Easing.out(Easing.exp) }));
      actionRowTranslateY.value = withDelay(750, withTiming(0, { duration: 500, easing: Easing.out(Easing.exp) }));
    } else {
      inputOpacity.value = 0;
      inputScale.value = 1;
      actionRowOpacity.value = 0;
      actionRowTranslateY.value = 20;
    }
  }, [isInputFocused, input, lensState, inputOpacity, inputScale, actionRowOpacity, actionRowTranslateY]);

  const idleVideoStyle = useAnimatedStyle(() => ({ opacity: idleOpacity.value }));
  const typingVideoStyle = useAnimatedStyle(() => ({ opacity: typingOpacity.value }));
  const loadingVideoStyle = useAnimatedStyle(() => ({ opacity: loadingOpacity.value }));

  const inputStyle = useAnimatedStyle(() => ({
    opacity: inputOpacity.value,
    transform: [{ translateY: -50 }, { scale: inputScale.value }],
  }));

  const actionRowStyle = useAnimatedStyle(() => ({
    opacity: actionRowOpacity.value,
    transform: [{ translateY: actionRowTranslateY.value }],
  }));

  const handleLensPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toInput();
    setInput(DEMO_CLAIM);
    setIsInputFocused(true);
    setTimeout(() => inputRef.current?.focus(), 750);
  };

  const handleAnalyze = () => {
    if (!input.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    setIsInputFocused(false);

    inputOpacity.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) });
    inputScale.value = withTiming(0.3, { duration: 400, easing: Easing.out(Easing.ease) });

    setTimeout(() => {
      toLoading();
      router.push({
        pathname: "/result/demo",
        params: { demo: "1", claimText: input.trim() },
      });
    }, 400);
  };

  return (
    <View style={styles.container}>
      {/* Background videos */}
      <View style={[StyleSheet.absoluteFill, { zIndex: 0, width: screenWidth, height: screenHeight, overflow: "hidden" }]}>
        <Image source={HOME_IDLE_STILL} style={[StyleSheet.absoluteFill, { width: screenWidth, height: screenHeight }]} resizeMode="cover" />

        <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 1, width: screenWidth, height: screenHeight }, idleVideoStyle]} pointerEvents="none">
          <VideoAnimation
            source={VIDEO_IDLE}
            shouldPlay={activeVideoSource === VIDEO_IDLE}
            style={[StyleSheet.absoluteFill, { width: screenWidth, height: screenHeight }]}
            resizeMode={ResizeMode.COVER}
            loopFromSeconds={4}
            isLooping={false}
          />
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 2, width: screenWidth, height: screenHeight }, typingVideoStyle]} pointerEvents="none">
          <VideoAnimation
            source={VIDEO_TYPING}
            shouldPlay={activeVideoSource === VIDEO_TYPING}
            style={[StyleSheet.absoluteFill, { width: screenWidth, height: screenHeight }]}
            resizeMode={ResizeMode.COVER}
            loopFromSeconds={4}
            isLooping={false}
          />
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 3, width: screenWidth, height: screenHeight }, loadingVideoStyle]} pointerEvents="none">
          <VideoAnimation
            source={VIDEO_LOADING}
            shouldPlay={activeVideoSource === VIDEO_LOADING}
            style={[StyleSheet.absoluteFill, { width: screenWidth, height: screenHeight }]}
            resizeMode={ResizeMode.COVER}
            isLooping={true}
          />
        </Animated.View>
      </View>

      {/* Onboarding back */}
      <View style={styles.topBar}>
        <OnboardingBackButton goTo="/onboarding/stats" />
      </View>

      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss();
          setIsInputFocused(false);
          if (!input) reset();
        }}
      >
        <View style={[styles.content, { zIndex: 10 }]}>
          <View style={styles.lensContainer}>
            <View style={{ width: 420, height: 420, position: "relative", alignItems: "center", justifyContent: "center" }}>
              {/* Lens mask/press target */}
              <View style={{ width: 420, height: 420, borderRadius: 210, overflow: "hidden", position: "absolute" }}>
                <Pressable onPress={activeVideoSource === VIDEO_IDLE ? handleLensPress : undefined} style={StyleSheet.absoluteFill}>
                  <View style={StyleSheet.absoluteFill} />
                </Pressable>
              </View>

              {/* Input overlay */}
              {(isInputFocused || input) && lensState !== "loading" && (
                <Animated.View style={[styles.inputOverlay, inputStyle]} pointerEvents="box-none">
                  <ClaimInput
                    ref={inputRef}
                    value={input}
                    onChangeText={setInput}
                    onSubmitEditing={handleAnalyze}
                    returnKeyType="go"
                    isFocused={isInputFocused}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    placeholder="Paste a claim..."
                    editable={true}
                    style={styles.claimInput}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                  />
                </Animated.View>
              )}
            </View>

            {/* Actions */}
            <View style={styles.belowLens}>
              {(isInputFocused || input) && lensState !== "loading" && (
                <Animated.View style={[styles.actionRow, actionRowStyle]}>
                  <TouchableOpacity onPress={() => setInput(DEMO_CLAIM)} style={styles.circleButton} activeOpacity={0.8}>
                    <Ionicons name="refresh" size={22} color="#FFF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleAnalyze}
                    style={[styles.pillButton, !input.trim() && { opacity: 0.5 }]}
                    disabled={!input.trim()}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View />
                    </View>
                    {/* Keep content exactly like homescreen */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View />
                    </View>
                    <Text style={styles.pillButtonText}>Analyze</Text>
                    <Ionicons name="arrow-forward" size={20} color="#000" />
                  </TouchableOpacity>
                </Animated.View>
              )}
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    zIndex: 20,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  lensContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  inputOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  claimInput: {
    marginTop: 0,
    color: "#FFFFFF",
    textAlign: "center",
    width: 240,
    maxWidth: 240,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlignVertical: "center",
  },
  belowLens: {
    marginTop: -40,
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  circleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  pillButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
  },
  pillButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#000000",
  },
});


