import React, { useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ImageBackground, ImageSourcePropType } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import PagerView from "react-native-pager-view";
import Animated, { 
  FadeInUp,
  FadeInDown,
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
// UNCOMMENT the lines below after uploading your images:

const SLIDE_BACKGROUNDS: { [key: number]: ImageSourcePropType | null } = {
  // 0: require("../../assets/onboarding/slide-1-info-moves-fast.png"),
  // 1: require("../../assets/onboarding/slide-2-verification.png"),
  // 2: require("../../assets/onboarding/slide-3-frictionless.png"),
  // 3: require("../../assets/onboarding/slide-4-truth-layer.png"),
  // 4: require("../../assets/onboarding/slide-5-vett-it.png"),
  0: null,
  1: null,
  2: null,
  3: null,
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
  const pagerRef = useRef<PagerView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Auto-advance carousel
  useEffect(() => {
    const interval = setInterval(() => {
      const nextPage = (currentPage + 1) % CAROUSEL_SLIDES.length;
      pagerRef.current?.setPage(nextPage);
    }, AUTO_ADVANCE_INTERVAL);

    return () => clearInterval(interval);
  }, [currentPage]);

  const handlePageSelected = (e: any) => {
    setCurrentPage(e.nativeEvent.position);
  };

  const handleSignUp = () => {
    router.push("/onboarding/name");
  };

  const handleLogin = () => {
    router.push("/signin");
  };

  const currentBackground = SLIDE_BACKGROUNDS[currentPage];

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

      {/* Carousel Section */}
      <View style={styles.carouselContainer}>
        <PagerView
          ref={pagerRef}
          style={styles.pager}
          initialPage={0}
          onPageSelected={handlePageSelected}
        >
          {CAROUSEL_SLIDES.map((slide, index) => (
            <View key={index} style={styles.slideContainer}>
              <Text style={[styles.headline, { fontFamily: "Inter_800ExtraBold" }]}>
                {slide.headline}
              </Text>
              <Text style={[styles.subtext, { fontFamily: "Inter_400Regular" }]}>
                {slide.subtext}
              </Text>
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

  // If no background image, render with solid color
  if (!currentBackground) {
    return (
      <View style={styles.container}>
        {renderContent()}
      </View>
    );
  }

  // With background image
  return (
    <View style={styles.container}>
      <ImageBackground
        source={currentBackground}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Dark overlay for text readability */}
        <View style={styles.overlay} />
        {renderContent()}
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  backgroundImage: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
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
  carouselContainer: {
    flex: 1,
    justifyContent: "center",
  },
  pager: {
    height: 280,
  },
  slideContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  headline: {
    color: "#FFFFFF",
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  subtext: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 20,
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
