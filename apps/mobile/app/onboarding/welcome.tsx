import React, { useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ImageBackground, ImageSourcePropType } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import PagerView from "react-native-pager-view";
import Animated, { 
  FadeInUp,
  FadeInDown,
  FadeIn,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Background images for each slide
// Upload your images to: apps/mobile/assets/onboarding/
// 
// FILE NAMES TO USE:
//   Slide 1: slide-1-info-moves-fast.png    → "Information moves fast. Truth doesn't."
//   Slide 2: slide-2-verification.png       → "Verification doesn't scale..."
//   Slide 3: slide-3-frictionless.png       → "Fact-checking shouldn't interrupt..."
//   Slide 4: slide-4-truth-layer.png        → "Vett is the truth layer."
//   Slide 5: slide-5-vett-it.png            → "Don't guess. Vett it."
//
// Recommended dimensions: 1170 x 2532 pixels (iPhone 14 Pro Max)
// Format: PNG or JPG
// 
const SLIDE_BACKGROUNDS: { [key: number]: ImageSourcePropType | null } = {
  // NOTE: Expo requires static `require(...)` to bundle images.
  // Only the images that exist in `apps/mobile/assets/onboarding/` are wired here.
  0: require("../../assets/onboarding/slide-1-info-moves-fast.png"),
  1: require("../../assets/onboarding/slide-2-verification.png"),
  // TODO: add `slide-3-frictionless.png`
  2: null,
  3: require("../../assets/onboarding/slide-4-truth-layer.png"),
  // TODO: add `slide-5-vett-it.png`
  4: null,
};

// Value propositions for the carousel - 5 cards
const CAROUSEL_SLIDES = [
  {
    headline: "Information moves fast.\nTruth doesn't.",
    subtext: "Social feeds carry millions of claims every day.\nMost are never checked.",
  },
  {
    headline: "Verification doesn't scale\nat the speed of feeds.",
    subtext: "Checking claims takes time, context, and effort\nmost people don't have while scrolling.",
  },
  {
    headline: "Fact-checking shouldn't\ninterrupt your flow.",
    subtext: "Vett makes verification frictionless—\nno searching, no tab switching, no guesswork.",
  },
  {
    headline: "Vett is the\ntruth layer.",
    subtext: "It sits between content and belief,\nverifying factual claims before they spread.",
  },
  {
    headline: "Don't guess.\nVett it.",
    subtext: "See clearly.\nDecide for yourself.",
  },
];

// Auto-advance interval in ms
const AUTO_ADVANCE_INTERVAL = 4000;

export default function WelcomeScreen() {
  const router = useRouter();
  const headlinePagerRef = useRef<PagerView>(null);
  const subtextPagerRef = useRef<PagerView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const currentPageRef = useRef(0);

  // Auto-advance carousel
  useEffect(() => {
    // Keep the ref in sync so the interval callback always has the latest page,
    // without needing `currentPage` in the dependency array (which would reset the timer).
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // Auto-advance carousel (stable interval; no stale closure on `currentPage`)
  useEffect(() => {
    const interval = setInterval(() => {
      const nextPage = (currentPageRef.current + 1) % CAROUSEL_SLIDES.length;
      currentPageRef.current = nextPage;
      headlinePagerRef.current?.setPage(nextPage);
      subtextPagerRef.current?.setPage(nextPage);
      // Update immediately for the progress bar; `onPageSelected` will keep it in sync too.
      setCurrentPage(nextPage);
    }, AUTO_ADVANCE_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const handlePageSelected = (e: any) => {
    const position = e.nativeEvent.position;
    currentPageRef.current = position;
    setCurrentPage(position);
    // Sync both pagers
    headlinePagerRef.current?.setPage(position);
    subtextPagerRef.current?.setPage(position);
  };

  const handleSignUp = () => {
    router.push("/onboarding/name");
  };

  const handleLogin = () => {
    router.push("/signin");
  };

  const currentBackground = SLIDE_BACKGROUNDS[currentPage];

  // Helper to split text into words and render with animation
  const renderAnimatedWords = (text: string, pageIndex: number, baseDelay: number = 0) => {
    const lines = text.split('\n');
    let wordIndex = 0;
    
    return lines.map((line, lineIndex) => {
      const words = line.split(' ');
      const lineWords = words.map((word, idx) => {
        const currentWordIndex = wordIndex++;
        return (
          <Animated.Text
            key={`page-${pageIndex}-line-${lineIndex}-word-${idx}`}
            entering={FadeInUp.delay(baseDelay + currentWordIndex * 80).duration(500)}
            style={[styles.headline, { fontFamily: "Inter_800ExtraBold" }]}
          >
            {word}
            {idx < words.length - 1 ? ' ' : ''}
          </Animated.Text>
        );
      });
      
      return (
        <View key={`page-${pageIndex}-line-${lineIndex}`} style={styles.wordLine}>
          {lineWords}
          {lineIndex < lines.length - 1 ? <Text style={styles.lineBreak}>{'\n'}</Text> : null}
        </View>
      );
    });
  };

  // Render content (shared between with/without background)
  const renderContent = () => (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {/* Progress Bar at Top - Full Width */}
      <View style={styles.progressBarContainer}>
        {CAROUSEL_SLIDES.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressSegment,
              {
                backgroundColor: index <= currentPage 
                  ? "#FFFFFF" 
                  : "rgba(255, 255, 255, 0.2)",
              },
            ]}
          />
        ))}
      </View>

      {/* Header */}
      <Animated.View 
        entering={FadeInDown.delay(200).duration(600)}
        style={styles.header}
      >
        <Text style={styles.logoPrefix}>Welcome to</Text>
        <Text style={[styles.logo, { fontFamily: "Inter_700Bold" }]}>Vett</Text>
      </Animated.View>

      {/* Headline at Top */}
      <View style={styles.headlineSection}>
        <PagerView
          ref={headlinePagerRef}
          style={styles.headlinePager}
          initialPage={0}
          onPageSelected={handlePageSelected}
        >
          {CAROUSEL_SLIDES.map((slide, index) => (
            <View key={`headline-${index}`} style={styles.headlineContainer}>
              {currentPage === index && (
                <View style={styles.wordContainer}>
                  {renderAnimatedWords(slide.headline, index, 300)}
                </View>
              )}
            </View>
          ))}
        </PagerView>
      </View>

      {/* Spacer to push content to edges */}
      <View style={styles.spacer} />

      {/* Subtext Above Buttons */}
      <View style={styles.subtextSection}>
        <PagerView
          ref={subtextPagerRef}
          style={styles.subtextPager}
          initialPage={0}
          scrollEnabled={false}
        >
          {CAROUSEL_SLIDES.map((slide, index) => (
            <View key={`subtext-${index}`} style={styles.subtextContainer}>
              {currentPage === index && (
                <Animated.Text 
                  key={`subtext-animated-${index}`}
                  entering={FadeIn.delay(700).duration(600)}
                  style={[styles.subtext, { fontFamily: "Inter_400Regular" }]}
                >
                  {slide.subtext}
                </Animated.Text>
              )}
            </View>
          ))}
        </PagerView>
      </View>

      {/* Bottom Buttons */}
      <Animated.View 
        entering={FadeInUp.delay(400).duration(600)}
        style={styles.bottomSection}
      >
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            onPress={handleLogin}
            style={styles.loginButton}
            activeOpacity={0.8}
          >
            <Text style={[styles.loginButtonText, { fontFamily: "Inter_500Medium" }]}>
              Log in
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleSignUp}
            style={styles.signUpButton}
            activeOpacity={0.9}
          >
            <Text style={[styles.signUpButtonText, { fontFamily: "Inter_500Medium" }]}>
              Sign up
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );

  return (
    <View style={styles.container}>
      {/* Keep the carousel content mounted in a stable position to avoid PagerView jitter/resets. */}
      {currentBackground ? (
        <>
          <ImageBackground
            source={currentBackground}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          {/* Dark overlay for text readability */}
          <View style={styles.overlay} pointerEvents="none" />
        </>
      ) : null}

      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)", // Adjust opacity as needed for text readability
  },
  safeArea: {
    flex: 1,
  },
  progressBarContainer: {
    flexDirection: "row",
    width: SCREEN_WIDTH,
    paddingHorizontal: 0,
    gap: 4,
  },
  progressSegment: {
    flex: 1,
    height: 3,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  logoPrefix: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  logo: {
    color: "#FFFFFF",
    fontSize: 28,
    letterSpacing: -0.5,
  },
  headlineSection: {
    paddingTop: 32,
    paddingHorizontal: 24,
  },
  headlinePager: {
    height: 180,
  },
  headlineContainer: {
    flex: 1,
    justifyContent: "flex-start",
  },
  wordContainer: {
    flexDirection: "column",
  },
  wordLine: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  lineBreak: {
    height: 0,
    width: 0,
  },
  headline: {
    color: "#FFFFFF",
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  spacer: {
    flex: 1,
  },
  subtextSection: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  subtextPager: {
    height: 80,
  },
  subtextContainer: {
    flex: 1,
    justifyContent: "flex-start",
  },
  subtext: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  loginButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
  },
  signUpButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  signUpButtonText: {
    color: "#000000",
    fontSize: 17,
  },
});
