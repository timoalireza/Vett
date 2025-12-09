import { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, BackHandler } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

import { fetchAnalysis } from "../../src/api/analysis";
import { LensMotif } from "../../src/components/Lens/LensMotif";
import { AnimatedLens } from "../../src/components/Lens/AnimatedLens";
import { ScoreRing } from "../../src/components/Lens/ScoreRing";
import { ColorTintOverlay } from "../../src/components/Lens/ColorTintOverlay";
import { SummaryCard } from "../../src/components/Results/SummaryCard";
import { SourcesCard } from "../../src/components/Results/SourcesCard";
import { tokenProvider } from "../../src/api/token-provider";
import { getScoreColor } from "../../src/utils/scoreColors";
import { VideoAnimation } from "../../src/components/Video/VideoAnimation";
import { useVideoAnimationState } from "../../src/components/Video/VideoAnimationProvider";

// Define video assets
const VIDEO_ASSETS = {
  loading: require("../../assets/animations/loading.mp4"),
  resultRed: require("../../assets/animations/result-red.mp4"),
  resultAmber: require("../../assets/animations/result-amber.mp4"),
  resultGreen: require("../../assets/animations/result-green.mp4"),
};

// Generic Card Component matching the doc
const Card = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <View style={styles.card}>
    <Text style={styles.cardLabel}>{label}</Text>
    {children}
  </View>
);

export default function ResultScreen() {
  const { jobId, claimText } = useLocalSearchParams<{ jobId: string; claimText?: string }>();
  const router = useRouter();
  const { getToken } = useAuth();
  const { registerVideo } = useVideoAnimationState();
  const [videoError, setVideoError] = useState(false);

  // Ensure token is set
  useEffect(() => {
    const setToken = async () => {
      try {
        const token = await getToken();
        tokenProvider.setToken(token);
      } catch (e) {
        console.error("Failed to set token", e);
        tokenProvider.setToken(null);
      }
    };
    setToken();
  }, [getToken]);

  const { data: analysis, isLoading, error } = useQuery({
    queryKey: ["analysis", jobId],
    queryFn: () => fetchAnalysis(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "COMPLETED" || status === "FAILED" ? false : 2000;
    },
  });

  // Back handler
  useEffect(() => {
    const backAction = () => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/analyze");
      }
      return true;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [router]);

  const isCompleted = analysis?.status === "COMPLETED";
  const isFailed = analysis?.status === "FAILED";
  const score = analysis?.score || 0;
  const scoreColor = getScoreColor(score);

  // Update current video state
  useEffect(() => {
    if (isCompleted) {
      if (score >= 70) registerVideo('result-green');
      else if (score >= 45) registerVideo('result-amber');
      else registerVideo('result-red');
    } else {
      registerVideo('loading');
    }
  }, [isCompleted, score, registerVideo]);

  // Lens animation: move up and scale down when results arrive
  const lensTranslateY = useSharedValue(0);
  const lensScale = useSharedValue(1);
  
  // Card animations: fade in with stagger
  const card1Opacity = useSharedValue(0);
  const card1TranslateY = useSharedValue(30);
  const card2Opacity = useSharedValue(0);
  const card2TranslateY = useSharedValue(30);
  const card3Opacity = useSharedValue(0);
  const card3TranslateY = useSharedValue(30);

  useEffect(() => {
    if (isCompleted) {
      // Lens transition: move up -180px and scale to 0.5 (420px → 210px)
      // Delay slightly to ensure smooth transition from AnimatedLens
      lensTranslateY.value = withDelay(100, withTiming(-180, {
        duration: 600,
        easing: Easing.out(Easing.ease),
      }));
      lensScale.value = withDelay(100, withTiming(0.5, {
        duration: 600,
        easing: Easing.out(Easing.ease),
      }));

      // Cards fade in with stagger: delay 400ms, stagger 100ms
      card1Opacity.value = withDelay(500, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
      card1TranslateY.value = withDelay(500, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));
      
      card2Opacity.value = withDelay(600, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
      card2TranslateY.value = withDelay(600, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));
      
      card3Opacity.value = withDelay(700, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
      card3TranslateY.value = withDelay(700, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));
    } else {
      // Keep lens in place during loading (no animation)
      lensTranslateY.value = 0;
      lensScale.value = 1;
      card1Opacity.value = 0;
      card1TranslateY.value = 30;
      card2Opacity.value = 0;
      card2TranslateY.value = 30;
      card3Opacity.value = 0;
      card3TranslateY.value = 30;
    }
  }, [isCompleted]);

  const lensAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: lensTranslateY.value },
      { scale: lensScale.value },
    ],
  }));

  const card1AnimatedStyle = useAnimatedStyle(() => ({
    opacity: card1Opacity.value,
    transform: [{ translateY: card1TranslateY.value }],
  }));

  const card2AnimatedStyle = useAnimatedStyle(() => ({
    opacity: card2Opacity.value,
    transform: [{ translateY: card2TranslateY.value }],
  }));

  const card3AnimatedStyle = useAnimatedStyle(() => ({
    opacity: card3Opacity.value,
    transform: [{ translateY: card3TranslateY.value }],
  }));

  const getVerdictLabel = (s: number) => {
    if (s >= 90) return 'True';
    if (s >= 70) return 'Mostly True';
    if (s >= 55) return 'Mixed';
    if (s >= 45) return 'Mostly False';
    if (s >= 25) return 'False';
    return 'Completely False';
  };

  // Video selection matches color mapping: ≥70=green, 45-69=amber, <45=red
  const getResultVideo = (s: number) => {
    if (s >= 70) return VIDEO_ASSETS.resultGreen;
    if (s >= 45) return VIDEO_ASSETS.resultAmber;
    return VIDEO_ASSETS.resultRed;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header with lens and score */}
        <View style={styles.header}>
          <Animated.View style={[
            { position: 'relative', alignItems: 'center', justifyContent: 'center' },
            isCompleted ? lensAnimatedStyle : { transform: [{ translateY: 0 }, { scale: 1 }] }
          ]}>
            {isCompleted ? (
              videoError ? (
                <>
                  <LensMotif size={420} />
                  <ScoreRing score={score} size={420} />
                  <ColorTintOverlay score={score} size={420} />
                </>
              ) : (
                <VideoAnimation
                  source={getResultVideo(score)}
                  shouldPlay={true}
                  loopFromSeconds={5}
                  style={{ width: 420, height: 420 }}
                  onError={() => setVideoError(true)}
                />
              )
            ) : (
              videoError ? (
                <AnimatedLens size={420} claimText={claimText || "Analyzing..."} />
              ) : (
                <View style={{ width: 420, height: 420 }}>
                  <VideoAnimation
                    source={VIDEO_ASSETS.loading}
                    shouldPlay={true}
                    loopFromSeconds={5}
                    style={{ width: '100%', height: '100%' }}
                    onError={() => setVideoError(true)}
                  />
                  <View style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 420,
                    height: 420,
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 100,
                  }}>
                    <Text 
                      style={{
                        fontFamily: 'Inter_400Regular',
                        fontSize: 14,
                        color: '#FFFFFF',
                        textAlign: 'center',
                        paddingHorizontal: 32,
                        maxWidth: 420 * 0.85,
                        textShadowColor: 'rgba(0, 0, 0, 0.5)',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 2,
                      }}
                      numberOfLines={4}
                    >
                      {claimText || "Analyzing..."}
                    </Text>
                  </View>
                </View>
              )
            )}
          </Animated.View>
          
          {isCompleted ? (
            <>
              <Text style={styles.scoreValue}>{score}</Text>
              <Text style={[styles.verdictLabel, { color: scoreColor }]}>
                {getVerdictLabel(score)}
              </Text>
            </>
          ) : (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Verifying facts...</Text>
              {isFailed && (
                <Text style={{ color: '#EF4444', marginTop: 8 }}>Analysis Failed</Text>
              )}
            </View>
          )}
        </View>

        {isCompleted && (
          <View style={styles.cardsContainer}>
            {/* CLAIM CARD */}
            <Animated.View style={card1AnimatedStyle}>
              <Card label="CLAIM">
                <Text style={styles.cardText}>
                  "{analysis?.rawInput || analysis?.claims?.[0]?.text || "No claim text detected"}"
                </Text>
              </Card>
            </Animated.View>

            {/* SUMMARY CARD */}
            <Animated.View style={card2AnimatedStyle}>
              <Card label="SUMMARY">
                <Text style={styles.cardText}>
                  {analysis?.summary || "No summary available."}
                </Text>
              </Card>
            </Animated.View>

            {/* SOURCES CARD */}
            {analysis?.sources && analysis.sources.length > 0 && (
              <Animated.View style={card3AnimatedStyle}>
                <SourcesCard sources={analysis.sources} />
              </Animated.View>
            )}

            {/* Verify Another Claim Button */}
            <Animated.View style={[card3AnimatedStyle, { marginTop: 8 }]}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  router.replace("/(tabs)/analyze");
                }}
              >
                <Text style={styles.resetButtonText}>Verify Another Claim</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </ScrollView>

      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/(tabs)/analyze");
          }
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    marginBottom: 20,
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#8A8A8A',
  },
  cardsContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#6B6B6B',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  cardText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#E5E5E5',
    lineHeight: 22,
  },
  scoreValue: {
    marginTop: 16,
    fontFamily: 'Inter_200ExtraLight',
    fontSize: 36,
    color: '#22C55E',
  },
  verdictLabel: {
    marginTop: 4,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  backButton: {
    position: "absolute",
    top: 20, // Adjusted for SafeAreaView
    left: 20,
    padding: 8,
    zIndex: 1000,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  resetButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  resetButtonText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: '#000000',
  },
});
