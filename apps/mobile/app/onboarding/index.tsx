import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from "react-native";
import PagerView from "react-native-pager-view";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { LensMotif } from "../../src/components/Lens/LensMotif";
import { AnimatedLens } from "../../src/components/Lens/AnimatedLens";
import { ScoreRing } from "../../src/components/Lens/ScoreRing";
import { useAppState } from "../../src/state/app-state";

interface OnboardingPageProps {
  title: string;
  subtitle: string;
  showLargeLens?: boolean;
  animation?: "paste" | "score";
}

const OnboardingPage: React.FC<OnboardingPageProps> = ({
  title,
  subtitle,
  showLargeLens,
  animation,
}) => {
  return (
    <View style={styles.pageContainer}>
      <View style={styles.visualContainer}>
        {showLargeLens && <LensMotif size={240} />}
        {animation === "paste" && (
          // Simulating Paste Animation (Pulsing Lens + Paste Action visual?)
          // For now, just pulsing lens as per spec "pulsing"
          <AnimatedLens size={200} />
        )}
        {animation === "score" && (
          <View style={{ position: "relative", alignItems: "center", justifyContent: "center" }}>
            <LensMotif size={160} />
            <ScoreRing score={78} size={160} />
          </View>
        )}
      </View>
      
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { markOnboarded } = useAppState();
  const [currentPage, setCurrentPage] = useState(0);
  const pagerRef = useRef<PagerView>(null);

  const pages: OnboardingPageProps[] = [
    {
      title: "Vett",
      subtitle: "Truth, verified.",
      showLargeLens: true,
    },
    {
      title: "Paste any claim",
      subtitle: "Copy text from social media, news, or messages. Vett will analyze it instantly.",
      animation: "paste",
    },
    {
      title: "Instant clarity",
      subtitle: "See verification scores with detailed sources. Green means verified, red means false.",
      animation: "score",
    },
  ];

  const handleNext = () => {
    if (pagerRef.current) {
      pagerRef.current.setPage(currentPage + 1);
    }
  };

  const handleGetStarted = async () => {
    await markOnboarded();
    router.replace("/(tabs)/analyze");
  };

  const handleSignIn = () => {
    router.push("/signin");
  };

  return (
    <View style={styles.container}>
      <PagerView
        style={styles.pagerView}
        initialPage={0}
        ref={pagerRef}
        onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
      >
        {pages.map((page, index) => (
          <View key={index} style={styles.pageWrapper}>
            <OnboardingPage {...page} />
          </View>
        ))}
      </PagerView>

      {/* Page dots */}
      <View style={styles.dotsContainer}>
        {pages.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              { backgroundColor: index === currentPage ? "#FFFFFF" : "#4A4A4A" },
            ]}
          />
        ))}
      </View>

      {/* CTA Button */}
      <View style={styles.footer}>
        <Pressable
          onPress={currentPage === pages.length - 1 ? handleGetStarted : handleNext}
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            {currentPage === pages.length - 1 ? "Get Started" : "Next"}
          </Text>
        </Pressable>

        {currentPage === 0 && (
          <Pressable onPress={handleSignIn} style={styles.signInLink}>
            <Text style={styles.signInText}>
              Already have an account? <Text style={styles.signInHighlight}>Sign in</Text>
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  pagerView: {
    flex: 1,
  },
  pageWrapper: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 100,
  },
  visualContainer: {
    height: 300,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontFamily: "Inter_200ExtraLight", // Display font
    fontSize: 32,
    color: "#FFFFFF",
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#8A8A8A",
    textAlign: "center",
    lineHeight: 24,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 48,
  },
  button: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: "#000000",
  },
  signInLink: {
    marginTop: 16,
    alignItems: "center",
  },
  signInText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#6B6B6B",
  },
  signInHighlight: {
    color: "#FFFFFF",
  },
});
