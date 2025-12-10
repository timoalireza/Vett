import { useEffect, useState, useRef } from "react";
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, BackHandler, Dimensions, Image } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
  useAnimatedScrollHandler,
  interpolate,
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
import { ResizeMode } from "expo-av";

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
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [contextExpanded, setContextExpanded] = useState(false);
  const sourcesChevronRotation = useSharedValue(0);
  const insets = useSafeAreaInsets();

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
  
  // Claim text animation: fade in at 3.5 seconds
  const claimTextOpacity = useSharedValue(0);
  
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

      // Claim text fades in at 2.5 seconds
      claimTextOpacity.value = withDelay(2500, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));

      // Cards fade in with stagger: delay 2.5 seconds (2500ms), stagger 100ms
      card1Opacity.value = withDelay(2500, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
      card1TranslateY.value = withDelay(2500, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));
      
      card2Opacity.value = withDelay(2600, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
      card2TranslateY.value = withDelay(2600, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));
      
      card3Opacity.value = withDelay(2700, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
      card3TranslateY.value = withDelay(2700, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));
    } else {
      // Keep lens in place during loading (no animation)
      lensTranslateY.value = 0;
      lensScale.value = 1;
      claimTextOpacity.value = 0;
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

  const claimTextAnimatedStyle = useAnimatedStyle(() => ({
    opacity: claimTextOpacity.value,
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

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sourcesChevronRotation.value}deg` }],
  }));

  const getVerdictLabel = (s: number) => {
    if (s >= 90) return 'True';
    if (s >= 70) return 'Mostly True';
    if (s >= 55) return 'Mixed';
    if (s >= 45) return 'Mostly False';
    if (s >= 25) return 'False';
    return 'Completely False';
  };

  // Truncate claim text if over 65 characters
  const truncateClaimText = (text: string): string => {
    if (text.length <= 65) return text;
    return text.slice(0, 62) + '...';
  };

  // Calculate dynamic font size based on text length
  const getClaimFontSize = (text: string): number => {
    const length = text.length;
    if (length <= 20) return 58;
    if (length <= 35) return 48;
    if (length <= 50) return 40;
    return 34;
  };

  // Get claim text for display
  const displayClaimText = isCompleted 
    ? (analysis?.rawInput || analysis?.claims?.[0]?.text || claimText || "No claim text detected")
    : "";
  
  const truncatedClaimText = truncateClaimText(displayClaimText);
  const claimFontSize = getClaimFontSize(truncatedClaimText);
  const claimLineHeight = claimFontSize * 1.2;

  // Video selection matches color mapping: ≥70=green, 45-69=amber, <45=red
  const getResultVideo = (s: number) => {
    if (s >= 70) return VIDEO_ASSETS.resultGreen;
    if (s >= 45) return VIDEO_ASSETS.resultAmber;
    return VIDEO_ASSETS.resultRed;
  };

  // Get screen dimensions for proper video sizing
  const screenDimensions = Dimensions.get('window');
  const screenWidth = screenDimensions.width;
  const screenHeight = screenDimensions.height;

  // Scroll handler - lock at top, consistent scroll speed
  const scrollY = useSharedValue(0);
  const scrollViewRef = useRef<any>(null);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      // Clamp scroll to prevent negative values (scrolling up past top)
      const offsetY = Math.max(0, event.contentOffset.y);
      scrollY.value = offsetY;
    },
  });

  // Animated style for background - moves at same speed as scroll (1:1 ratio)
  const backgroundScrollStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: -scrollY.value }],
    };
  });

  return (
    <View style={styles.container}>
      {/* Full-screen video background - fixed position, moves with scroll at 1:1 ratio */}
      {!videoError && (
        <Animated.View style={[
          StyleSheet.absoluteFill,
          { 
            zIndex: 0,
            width: screenWidth, 
            height: screenHeight,
            overflow: 'hidden',
            backgroundColor: '#000000',
          },
          backgroundScrollStyle
        ]}>
              {isCompleted ? (
                <VideoAnimation
                  source={getResultVideo(score)}
                  shouldPlay={true}
                  loopFromSeconds={4}
                  isLooping={false}
                  freezeAtSeconds={6}
                  style={[StyleSheet.absoluteFill, { width: screenWidth, height: screenHeight }]}
                  resizeMode={ResizeMode.COVER}
                  onError={() => setVideoError(true)}
                />
              ) : (
                <VideoAnimation
                  source={VIDEO_ASSETS.loading}
                  shouldPlay={true}
                  loopFromSeconds={4}
                  isLooping={false}
                  style={[StyleSheet.absoluteFill, { width: screenWidth, height: screenHeight }]}
                  resizeMode={ResizeMode.COVER}
                  onError={() => setVideoError(true)}
                />
              )}
            </Animated.View>
          )}

      {/* Fallback to animated lens if video fails */}
      {videoError && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 0, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }]}>
          {isCompleted ? (
            <>
              <LensMotif size={420} />
              <ScoreRing score={score} size={420} />
              <ColorTintOverlay score={score} size={420} />
            </>
          ) : (
            <AnimatedLens size={420} claimText={claimText || "Analyzing..."} />
          )}
        </View>
      )}

      <SafeAreaView style={{ flex: 1, zIndex: 10 }}>
        <Animated.ScrollView 
          ref={scrollViewRef}
          style={{ flex: 1 }} 
          contentContainerStyle={{ paddingBottom: 40 }}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          bounces={false}
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          contentOffset={{ x: 0, y: 0 }}
        >
          {/* Header with lens and score */}
          <View style={[styles.header, { minHeight: screenHeight }]}>
            <Animated.View style={[
              { position: 'relative', alignItems: 'center', justifyContent: 'center', width: 420, height: 420 },
              isCompleted ? lensAnimatedStyle : { transform: [{ translateY: 0 }, { scale: 1 }] }
            ]}>
              {/* Claim text overlay inside orb - properly centered - only show when completed */}
              {isCompleted && (
                <Animated.View style={[
                  {
                    width: '100%',
                    height: '100%',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 40,
                    transform: [{ translateY: 80 }], // Move text down so center aligns with cursor
                  },
                  claimTextAnimatedStyle
                ]}>
                  <Text 
                    style={{
                      fontFamily: 'Inter_600SemiBold',
                      fontSize: claimFontSize,
                      color: '#FFFFFF',
                      textAlign: 'center',
                      maxWidth: 420 * 0.85,
                      textShadowColor: 'rgba(0, 0, 0, 0.8)',
                      textShadowOffset: { width: 0, height: 2 },
                      textShadowRadius: 6,
                      lineHeight: claimLineHeight,
                    }}
                    numberOfLines={3}
                  >
                    "{truncatedClaimText}"
                  </Text>
                </Animated.View>
              )}
            </Animated.View>
          
          {isCompleted ? (
            <>
              {/* Verdict and Score side-by-side boxes */}
              <View style={[styles.verdictScoreRow, { marginTop: -140 }]}>
                <Animated.View style={[card1AnimatedStyle, styles.verdictBox]}>
                  <Text style={styles.verdictScoreLabel}>Verdict:</Text>
                  <Text style={[styles.verdictScoreValue, { color: scoreColor, textAlign: 'center' }]}>
                    {getVerdictLabel(score)}
                  </Text>
                </Animated.View>
                <Animated.View style={[card1AnimatedStyle, styles.scoreBox]}>
                  <Text style={styles.verdictScoreLabel}>Score:</Text>
                  <Text style={[styles.verdictScoreValue, { color: scoreColor, fontSize: 36, textAlign: 'center' }]}>
                    {score}
                  </Text>
                </Animated.View>
              </View>

              {/* Summary Card */}
              <Animated.View style={[card2AnimatedStyle, { marginTop: 16 }]}>
                <Card label="Summary">
                  <Text style={styles.cardText}>
                    {analysis?.summary || "No summary available."}
                  </Text>
                </Card>
              </Animated.View>

              {/* Context Card */}
              <Animated.View style={[card3AnimatedStyle, { marginTop: 16 }]}>
                <Card label="Context">
                  <Text style={styles.cardText}>
                    {(() => {
                      const fullText = analysis?.recommendation || analysis?.reasoning || "No additional context available.";
                      if (!contextExpanded) {
                        // Limit to 150 words
                        const words = fullText.split(' ');
                        if (words.length > 150) {
                          const truncated = words.slice(0, 150).join(' ');
                          // Find the last complete word boundary to avoid cutting mid-word
                          const lastSpaceIndex = truncated.lastIndexOf(' ');
                          return lastSpaceIndex > 0 ? truncated.substring(0, lastSpaceIndex) : truncated;
                        }
                        return fullText;
                      }
                      return fullText;
                    })()}
                  </Text>
                  {(() => {
                    const fullText = analysis?.recommendation || analysis?.reasoning || "No additional context available.";
                    const words = fullText.split(' ');
                    if (words.length > 150) {
                      return (
                        <TouchableOpacity
                          onPress={() => setContextExpanded(!contextExpanded)}
                          style={styles.readMoreButton}
                        >
                          <Text style={styles.readMoreText}>
                            {contextExpanded ? 'Read less' : 'Read more'}
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                    return null;
                  })()}
                </Card>
              </Animated.View>

              {/* Sources Card */}
              {analysis?.sources && analysis.sources.length > 0 && (
                <Animated.View style={[card3AnimatedStyle, { marginTop: 16 }]}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={{ width: '100%' }}
                    onPress={() => {
                      const newExpanded = !sourcesExpanded;
                      setSourcesExpanded(newExpanded);
                      sourcesChevronRotation.value = withTiming(newExpanded ? 90 : 0, {
                        duration: 200,
                        easing: Easing.out(Easing.ease),
                      });
                    }}
                  >
                    <View style={styles.card}>
                      <View style={styles.sourcesHeader}>
                        <Text style={styles.cardLabel}>Sources</Text>
                        <View style={styles.sourcesHeaderRight}>
                          <View style={styles.sourcesBadge}>
                            <Text style={styles.sourcesBadgeText}>{analysis.sources.length}</Text>
                          </View>
                          <Animated.View style={chevronAnimatedStyle}>
                            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                          </Animated.View>
                        </View>
                      </View>
                      {sourcesExpanded && (
                        <View style={styles.sourcesList}>
                          {analysis.sources.map((source: any, index: number) => (
                            <View key={index} style={styles.sourceItem}>
                              <Text style={styles.sourceText}>
                                {source.url || source.title || `Source ${index + 1}`}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              )}
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
        </Animated.ScrollView>
      </SafeAreaView>

      {/* Back Button - positioned outside SafeAreaView to ensure proper placement */}
      <TouchableOpacity 
        style={[styles.backButton, { top: insets.top + 50 }]} 
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/(tabs)/analyze");
          }
        }}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  verdictScoreRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 20,
  },
  verdictBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  scoreBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  verdictScoreLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#6B6B6B',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  verdictScoreValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  sourcesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourcesHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourcesBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sourcesBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  sourcesList: {
    marginTop: 16,
    gap: 12,
  },
  sourceItem: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sourceText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#E5E5E5',
    lineHeight: 20,
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
  readMoreButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  readMoreText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#FFFFFF',
    textDecorationLine: 'underline',
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
