import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { VideoAnimation } from "../../src/components/Video/VideoAnimation";
import { useVideoAnimationState } from "../../src/components/Video/VideoAnimationProvider";
import { OnboardingBackButton } from "../../src/components/Onboarding/OnboardingBackButton";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Match homescreen videos
const VIDEO_TYPING = require("../../assets/animations/home-typing.mp4");
const VIDEO_LOADING = require("../../assets/animations/loading.mp4");
const VIDEO_RESULT_AMBER = require("../../assets/animations/result-amber.mp4");
const HOME_IDLE_STILL = require("../../assets/animations/home-idle-still.png");

const DEMO_CLAIM = "Scientists have discovered that drinking coffee can extend your lifespan by up to 10 years.";
const DEMO_CLAIM_DISPLAY =
  "“Scientists have\n" +
  "discovered that\n" +
  "drinking coffee\n" +
  "can extend your\n" +
  "lifespan by up to\n" +
  "10 years.”";

const LOADING_STEPS = ["Extracting claim…", "Gathering evidence…", "Cross-checking sources…", "Generating verdict…"] as const;
const LOADING_DURATION_MS = 3500;
const RESULTS_UI_REVEAL_DELAY_MS = 3000;

// Pre-loaded demo result
const DEMO_RESULT = {
  verdict: "Disputed",
  score: 42,
  summary:
    "Some research links moderate coffee intake to improved health outcomes, but the claim of adding 10 years to lifespan is exaggerated and not supported by strong evidence.",
  sources: [
    { title: "Coffee and health: What does the evidence actually show?", provider: "NIH", url: "https://www.nih.gov/" },
    { title: "Coffee and longevity: Benefits and limitations", provider: "Harvard", url: "https://www.hsph.harvard.edu/" },
  ],
};

type DemoStep = "input" | "loading" | "result";

export default function DemoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { registerVideo } = useVideoAnimationState();

  const screenDimensions = Dimensions.get("window");
  const screenWidth = screenDimensions.width;
  const screenHeight = screenDimensions.height;
  const availableHeight = screenHeight - insets.top - insets.bottom;
  const isShortScreen = availableHeight < 720;

  // Layout tuning constants (used to line up overlay text with the background video)
  // Cap to screen width so we don't clip on smaller devices.
  const LENS_SIZE = Math.min(420, Math.round(screenWidth));
  const INSTRUCTION_BOTTOM_SPACING = 18;
  const ANALYZE_BUTTON_TOP_SPACING = 22;
  // Negative moves the Analyze button upward without affecting the title or claim positioning.
  // Preserve original (non-short) positioning to avoid layout drift on standard devices.
  const ANALYZE_BUTTON_TRANSLATE_Y = isShortScreen ? -90 : -120;
  // Negative moves the whole demo stack upward so the lens lives in the upper-mid area (button lands around mid-screen).
  // Preserve original (non-short) positioning to avoid layout drift on standard devices.
  const STACK_TRANSLATE_Y = isShortScreen ? -50 : -80;
  // Negative nudges just the lens (to match the background video's lens highlight).
  const LENS_STACK_OFFSET_Y = -20;
  // Inner text area of the ring. Keep it safely within the bright ring highlight.
  const CLAIM_RING_SIZE = Math.round(Math.min(screenWidth, LENS_SIZE) * 0.64);
  const CLAIM_RING_PADDING_H = 18;
  // Negative moves the claim upward relative to the lens center.
  // Make it responsive so it doesn't collide with the header / safe area on smaller screens.
  // Extra -10px per design tweak request.
  const CLAIM_BASE_TRANSLATE_Y = -(clamp(Math.round(CLAIM_RING_SIZE * 0.18), 28, isShortScreen ? 44 : 58) + 10);

  // Start directly in input state with claim pre-filled
  const [demoStep, setDemoStep] = useState<DemoStep>("input");
  const [showResultsUI, setShowResultsUI] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Background video state - keep all mounted and crossfade
  const [activeVideoSource, setActiveVideoSource] = useState(VIDEO_TYPING);
  const typingOpacity = useSharedValue(1);
  const loadingOpacity = useSharedValue(0);
  const resultOpacity = useSharedValue(0);
  const isAnimatingRef = useRef(false);
  const animationTargetRef = useRef<typeof VIDEO_TYPING | null>(null);

  // Claim text animation
  const claimOpacity = useSharedValue(0);
  const claimTranslateY = useSharedValue(20);
  const actionRowOpacity = useSharedValue(0);
  const actionRowTranslateY = useSharedValue(20);

  // Scroll handler for results - makes background scroll with content
  const scrollY = useSharedValue(0);
  const scrollViewRef = useRef<any>(null);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const offsetY = Math.max(0, event.contentOffset.y);
      scrollY.value = offsetY;
    },
  });

  // Animated style for background - moves at same speed as scroll (1:1 ratio)
  const backgroundScrollStyle = useAnimatedStyle(() => {
    if (!showResultsUI) return {};
    return {
      transform: [{ translateY: -scrollY.value }],
    };
  });

  const resetAnimationFlags = useCallback(() => {
    isAnimatingRef.current = false;
    animationTargetRef.current = null;
  }, []);

  // Initial animation - fade in the claim text
  useEffect(() => {
    // Animate claim text in after a short delay
    claimOpacity.value = withDelay(400, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
    claimTranslateY.value = withDelay(400, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));
    // Action row appears shortly after
    actionRowOpacity.value = withDelay(700, withTiming(1, { duration: 500, easing: Easing.out(Easing.exp) }));
    actionRowTranslateY.value = withDelay(700, withTiming(0, { duration: 500, easing: Easing.out(Easing.exp) }));
    
    // Register typing video
    registerVideo("home-typing");
  }, []);

  // Cleanup pending timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, []);

  // Loading step ticker
  useEffect(() => {
    if (demoStep !== "loading") return;
    setLoadingStepIndex(0);
    const interval = setInterval(() => {
      setLoadingStepIndex((i) => (i + 1) % LOADING_STEPS.length);
    }, 850);
    return () => clearInterval(interval);
  }, [demoStep]);

  // Video crossfade logic
  useEffect(() => {
    let newSource = VIDEO_TYPING;
    if (demoStep === "result") {
      newSource = VIDEO_RESULT_AMBER;
      registerVideo("result-amber");
    } else if (demoStep === "loading") {
      newSource = VIDEO_LOADING;
      registerVideo("loading");
    } else {
      newSource = VIDEO_TYPING;
      registerVideo("home-typing");
    }

    if (isAnimatingRef.current && animationTargetRef.current === newSource && activeVideoSource === newSource) {
      return;
    }

    if (newSource !== activeVideoSource) {
      if (isAnimatingRef.current && animationTargetRef.current !== newSource) {
        cancelAnimation(typingOpacity);
        cancelAnimation(loadingOpacity);
        cancelAnimation(resultOpacity);
        isAnimatingRef.current = false;
        animationTargetRef.current = null;
      }

      setActiveVideoSource(newSource);

      // Crossfade animations
      const duration = 400;
      const easing = Easing.out(Easing.ease);

      isAnimatingRef.current = true;
      animationTargetRef.current = newSource;

      typingOpacity.value = withTiming(newSource === VIDEO_TYPING ? 1 : 0, { duration, easing });
      loadingOpacity.value = withTiming(newSource === VIDEO_LOADING ? 1 : 0, { duration, easing });
      resultOpacity.value = withTiming(newSource === VIDEO_RESULT_AMBER ? 1 : 0, { duration, easing }, (finished) => {
        if (finished) runOnJS(resetAnimationFlags)();
      });
    }
  }, [demoStep, registerVideo, activeVideoSource, typingOpacity, loadingOpacity, resultOpacity, resetAnimationFlags]);

  const typingVideoStyle = useAnimatedStyle(() => ({ opacity: typingOpacity.value }));
  const loadingVideoStyle = useAnimatedStyle(() => ({ opacity: loadingOpacity.value }));
  const resultVideoStyle = useAnimatedStyle(() => ({ opacity: resultOpacity.value }));

  const claimStyle = useAnimatedStyle(() => ({
    opacity: claimOpacity.value,
    // IMPORTANT: include a base offset so we can precisely align the claim with the lens in the background video.
    transform: [{ translateY: claimTranslateY.value + CLAIM_BASE_TRANSLATE_Y }],
  }));

  const actionRowStyle = useAnimatedStyle(() => ({
    opacity: actionRowOpacity.value,
    transform: [{ translateY: actionRowTranslateY.value }],
  }));

  const handleAnalyze = () => {
    if (demoStep !== "input") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Clear any previous timers in case of weird double-taps
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    // Ensure results UI is hidden until we explicitly reveal it
    setShowResultsUI(false);

    // Fade out claim text
    claimOpacity.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.ease) });
    actionRowOpacity.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.ease) });

    // Enter loading after the outgoing UI has cleared
    timeoutsRef.current.push(setTimeout(() => setDemoStep("loading"), 240));

    // After loading completes, switch to results video immediately
    timeoutsRef.current.push(setTimeout(() => setDemoStep("result"), 240 + LOADING_DURATION_MS));

    // Reveal the rest of the UI after the results video has had time to play its intro animation
    timeoutsRef.current.push(
      setTimeout(() => setShowResultsUI(true), 240 + LOADING_DURATION_MS + RESULTS_UI_REVEAL_DELAY_MS)
    );
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/onboarding/instagram");
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "#22C55E";
    if (score >= 40) return "#F59E0B";
    return "#EF4444";
  };

  const instructionTitle = "Try it out";
  const instructionSubtitle = 'Tap "Analyze" to verify this claim';

  return (
    <View style={styles.container}>
      {/* Background videos */}
      <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 0, width: screenWidth, height: screenHeight, overflow: "hidden" }, showResultsUI && backgroundScrollStyle]}>
        <Image source={HOME_IDLE_STILL} style={[StyleSheet.absoluteFill, { width: screenWidth, height: screenHeight }]} resizeMode="cover" />

        <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 1, width: screenWidth, height: screenHeight }, typingVideoStyle]} pointerEvents="none">
          <VideoAnimation
            source={VIDEO_TYPING}
            shouldPlay={activeVideoSource === VIDEO_TYPING}
            style={[StyleSheet.absoluteFill, { width: screenWidth, height: screenHeight }]}
            resizeMode={ResizeMode.COVER}
            startAtSeconds={3}
            loopFromSeconds={3}
            loopToSeconds={30}
            isLooping={false}
          />
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 2, width: screenWidth, height: screenHeight }, loadingVideoStyle]} pointerEvents="none">
          <VideoAnimation
            source={VIDEO_LOADING}
            shouldPlay={activeVideoSource === VIDEO_LOADING}
            style={[StyleSheet.absoluteFill, { width: screenWidth, height: screenHeight }]}
            resizeMode={ResizeMode.COVER}
            isLooping={true}
          />
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 3, width: screenWidth, height: screenHeight }, resultVideoStyle]} pointerEvents="none">
          <VideoAnimation
            source={VIDEO_RESULT_AMBER}
            shouldPlay={activeVideoSource === VIDEO_RESULT_AMBER}
            style={[StyleSheet.absoluteFill, { width: screenWidth, height: screenHeight }]}
            resizeMode={ResizeMode.COVER}
            isLooping={false}
            freezeAtSeconds={5}
          />
        </Animated.View>
      </Animated.View>

      {/* Onboarding back */}
      <View style={styles.topBar}>
        <OnboardingBackButton goTo="/onboarding/stats" />
      </View>

      <View style={[styles.content, { zIndex: 10 }]}>
        {/* Input + loading overlay area */}
        {(demoStep === "input" || demoStep === "loading") && (
          <View
            style={[
              styles.lensContainer,
              { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, transform: [{ translateY: STACK_TRANSLATE_Y }] },
            ]}
          >
            {demoStep === "input" ? (
              <Animated.View
                entering={FadeInDown.duration(400).delay(200)}
                exiting={FadeOut.duration(200)}
                style={[styles.instructionContainerInline, { marginBottom: INSTRUCTION_BOTTOM_SPACING }]}
              >
                <Text style={styles.instructionTitle} maxFontSizeMultiplier={1.15}>
                  {instructionTitle}
                </Text>
                <Text style={styles.instructionSubtitle} maxFontSizeMultiplier={1.2}>
                  {instructionSubtitle}
                </Text>
              </Animated.View>
            ) : null}

            <View
              style={{
                width: LENS_SIZE,
                height: LENS_SIZE,
                position: "relative",
                alignItems: "center",
                justifyContent: "center",
                marginTop: LENS_STACK_OFFSET_Y,
              }}
            >
              {/* Claim text overlay - read-only, positioned in the lens */}
              {demoStep === "input" && (
                <Animated.View
                  style={[
                    styles.claimOverlay,
                    {
                      width: CLAIM_RING_SIZE,
                      height: CLAIM_RING_SIZE,
                      paddingHorizontal: CLAIM_RING_PADDING_H,
                    },
                    claimStyle,
                  ]}
                  pointerEvents="none"
                >
                  <Text
                    style={styles.claimText}
                    adjustsFontSizeToFit
                    minimumFontScale={0.35}
                    maxFontSizeMultiplier={1.15}
                  >
                    {DEMO_CLAIM_DISPLAY}
                  </Text>
                </Animated.View>
              )}

              {/* Loading step overlay - in the exact same position as the claim */}
              {demoStep === "loading" && (
                <Animated.View
                  entering={FadeIn.duration(160)}
                  exiting={FadeOut.duration(160)}
                  style={[
                    styles.claimOverlay,
                    {
                      width: CLAIM_RING_SIZE,
                      height: CLAIM_RING_SIZE,
                      paddingHorizontal: CLAIM_RING_PADDING_H,
                      transform: [{ translateY: CLAIM_BASE_TRANSLATE_Y }],
                    },
                  ]}
                  pointerEvents="none"
                >
                  <Text style={styles.loadingStepText}>{LOADING_STEPS[loadingStepIndex]}</Text>
                </Animated.View>
              )}
            </View>

            {/* Actions - positioned just below the lens (roughly mid-screen) */}
            {demoStep === "input" && (
              <Animated.View 
                style={[
                  styles.analyzeButtonContainer,
                  { marginTop: ANALYZE_BUTTON_TOP_SPACING, transform: [{ translateY: ANALYZE_BUTTON_TRANSLATE_Y }] },
                  actionRowStyle
                ]}
              >
                <TouchableOpacity
                  onPress={handleAnalyze}
                  style={styles.pillButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.pillButtonText}>Analyze</Text>
                  <Ionicons name="arrow-forward" size={20} color="#000" />
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        )}

        {/* Results display */}
        {showResultsUI && (
          <Animated.ScrollView 
            ref={scrollViewRef}
            style={styles.resultsScrollView}
            contentContainerStyle={[
              styles.resultsContainer,
              { paddingBottom: insets.bottom + 100 }
            ]}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            {/* Lens area with claim text inside */}
            <View style={styles.resultsHeader}>
              <Animated.View 
                entering={FadeInUp.duration(600).delay(200)}
                style={[styles.resultsLensContainer, { width: LENS_SIZE, height: LENS_SIZE }]}
              >
                <View
                  style={[
                    styles.lensArea,
                    {
                      width: CLAIM_RING_SIZE,
                      height: CLAIM_RING_SIZE,
                      paddingHorizontal: CLAIM_RING_PADDING_H,
                    },
                  ]}
                >
                  <Text 
                    style={styles.resultsClaimText}
                    adjustsFontSizeToFit
                    minimumFontScale={0.3}
                    maxFontSizeMultiplier={1.1}
                  >
                    {DEMO_CLAIM_DISPLAY}
                  </Text>
                </View>
              </Animated.View>

              {/* Verdict and Score boxes below the lens */}
              <Animated.View 
                entering={FadeInUp.duration(600).delay(400)}
                style={styles.verdictScoreRow}
              >
                <View style={styles.verdictBox}>
                  <Text style={styles.verdictBoxLabel}>Verdict:</Text>
                  <View style={styles.verdictValueContainer}>
                    <Text style={[styles.verdictBoxValue, { color: getScoreColor(DEMO_RESULT.score) }]}>
                      {DEMO_RESULT.verdict}
                    </Text>
                  </View>
                </View>
                <View style={styles.scoreBox}>
                  <Text style={styles.verdictBoxLabel}>Score:</Text>
                  <Text style={[styles.scoreBoxValue, { color: getScoreColor(DEMO_RESULT.score) }]}>
                    {DEMO_RESULT.score}
                  </Text>
                </View>
              </Animated.View>

              {/* Summary card */}
              <Animated.View 
                entering={FadeInUp.duration(400).delay(600)}
                style={styles.summaryCard}
              >
                <Text style={styles.cardLabel}>SUMMARY</Text>
                <Text style={styles.summaryText}>{DEMO_RESULT.summary}</Text>
              </Animated.View>

              {/* Sources card */}
              <Animated.View 
                entering={FadeInUp.duration(400).delay(700)}
                style={styles.sourcesCard}
              >
                <View style={styles.sourcesHeader}>
                  <Text style={styles.cardLabel}>SOURCES</Text>
                  <View style={styles.sourcesBadge}>
                    <Text style={styles.sourcesBadgeText}>{DEMO_RESULT.sources.length}</Text>
                  </View>
                </View>
                <View style={styles.sourcesList}>
                  {DEMO_RESULT.sources.map((source, index) => (
                    <View key={index} style={styles.sourceItem}>
                      <View style={styles.sourceContent}>
                        <Text style={styles.sourceTitle} numberOfLines={2}>{source.title}</Text>
                        <Text style={styles.sourceProvider}>{source.provider}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.sourceButton}
                        onPress={() => Linking.openURL(source.url)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="open-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.sourceButtonText}>Open</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </Animated.View>

              {/* How it works explanation */}
              <Animated.View 
                entering={FadeInUp.duration(400).delay(800)}
                style={styles.howItWorksCard}
              >
                <Text style={styles.howItWorksTitle}>How Vett works</Text>
                <View style={styles.howItWorksStep}>
                  <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
                  <Text style={styles.stepText}>Paste any claim, URL, or screenshot</Text>
                </View>
                <View style={styles.howItWorksStep}>
                  <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
                  <Text style={styles.stepText}>AI searches credible sources</Text>
                </View>
                <View style={styles.howItWorksStep}>
                  <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
                  <Text style={styles.stepText}>Get an instant fact-check verdict</Text>
                </View>
              </Animated.View>
            </View>
          </Animated.ScrollView>
        )}
      </View>

      {/* Continue button - shows after results */}
      {showResultsUI && (
        <Animated.View 
          entering={FadeInUp.duration(400).delay(1000)}
          style={[styles.continueContainer, { paddingBottom: insets.bottom + 20 }]}
        >
          <TouchableOpacity
            onPress={handleContinue}
            style={styles.continueButton}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#000" />
          </TouchableOpacity>
        </Animated.View>
      )}
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
  instructionContainerInline: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  instructionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  instructionSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
  claimOverlay: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  claimText: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 21,
    color: "#FFFFFF",
    textAlign: "center",
    includeFontPadding: false,
    // Enhanced drop shadow for better readability against bright video frames
    textShadowColor: "rgba(0, 0, 0, 0.9)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  loadingStepText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    includeFontPadding: false,
    textShadowColor: "rgba(0, 0, 0, 0.9)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  analyzeButtonContainer: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  pillButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    // Extend CTA width so it's visually longer.
    minWidth: 260,
    paddingHorizontal: 36,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
  },
  pillButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#000000",
  },
  resultsScrollView: {
    flex: 1,
  },
  resultsContainer: {
    paddingBottom: 40,
  },
  resultsHeader: {
    alignItems: 'center',
    paddingTop: 40,
    marginBottom: 20,
    paddingHorizontal: 20,
    minHeight: Dimensions.get('window').height,
  },
  resultsLensContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lensArea: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    // Slightly lift the claim within the ring for better balance against the verdict/score row.
    transform: [{ translateY: -60 }],
  },
  resultsClaimText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    lineHeight: 25,
    color: '#FFFFFF',
    textAlign: 'center',
    includeFontPadding: false,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  verdictScoreRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: -100,
    marginBottom: 0,
    width: '100%',
  },
  verdictBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  verdictValueContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  verdictBoxLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#6B6B6B',
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  verdictBoxValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    textAlign: 'center',
  },
  scoreBoxValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 36,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    width: '100%',
  },
  cardLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "#6B6B6B",
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  summaryText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#E5E5E5",
    lineHeight: 22,
  },
  sourcesCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    width: '100%',
  },
  sourcesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sourcesBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sourcesBadgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "#FFFFFF",
  },
  sourcesList: {
    marginTop: 16,
    gap: 12,
  },
  sourceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    gap: 12,
  },
  sourceContent: {
    flex: 1,
    marginRight: 8,
  },
  sourceTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 20,
    marginBottom: 4,
  },
  sourceProvider: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#8A8A8A",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sourceButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  sourceButtonText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "#FFFFFF",
  },
  howItWorksCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    width: '100%',
  },
  howItWorksTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 16,
  },
  howItWorksStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#FFFFFF",
  },
  stepText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    flex: 1,
  },
  continueContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    zIndex: 30,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 16,
  },
  continueButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#000000",
  },
});
