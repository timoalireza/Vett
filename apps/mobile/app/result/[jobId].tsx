import { useEffect, useState, useRef } from "react";
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, BackHandler, Dimensions, Image, Linking } from "react-native";
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
  const isQueued = analysis?.status === "QUEUED";
  const isProcessing = analysis?.status === "PROCESSING";
  const score = analysis?.score || 0;
  const verdict = analysis?.verdict;
  const isUnverified = verdict === "Unverified";
  const scoreColor = getScoreColor(score, verdict);

  // Get loading text based on analysis status
  const getLoadingText = (): string => {
    if (isQueued) {
      // Show initial extraction message
      if (claimText) {
        if (claimText.includes("http") || claimText.startsWith("www.")) {
          return "Extracting claim...";
        }
        return claimText.length > 50 ? claimText.substring(0, 50) + "..." : claimText;
      }
      return "Extracting claim...";
    }
    if (isProcessing) {
      return "Verifying facts...";
    }
    return "Analyzing...";
  };

  // Update current video state
  useEffect(() => {
    if (isCompleted) {
      if (isUnverified) {
        registerVideo('result-amber');
      } else if (score >= 85) {
        registerVideo('result-green');
      } else if (score >= 40) {
        registerVideo('result-amber');
      } else {
        registerVideo('result-red');
      }
    } else {
      registerVideo('loading');
    }
  }, [isCompleted, score, isUnverified, registerVideo]);

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

  const getVerdictLabel = (s: number, v: string | null | undefined) => {
    // Unverified: Not enough evidence to make a decision (separate category, no score)
    if (v === "Unverified") return 'Unverified';
    // Verified: Evidence overwhelmingly supports the claim (85-100)
    if (s >= 85) return 'Verified';
    // Disputed: Credible evidence exists on both sides (40-84)
    if (s >= 40) return 'Disputed';
    // False: Evidence contradicts the claim (0-39)
    return 'False';
  };

  // Extract publication name from URL (e.g., wsj.com -> WSJ, cnn.com -> CNN)
  const getPublicationName = (url: string | null | undefined): string => {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      let hostname = urlObj.hostname.replace('www.', '').toLowerCase();
      
      // Remove common TLDs and get the main domain part
      const parts = hostname.split('.');
      let domain = parts[0];
      
      // Handle common publication domains
      const publicationMap: Record<string, string> = {
        'wsj': 'WSJ',
        'forbes': 'Forbes',
        'cnn': 'CNN',
        'bbc': 'BBC',
        'reuters': 'Reuters',
        'nytimes': 'NY Times',
        'theguardian': 'The Guardian',
        'washingtonpost': 'Washington Post',
        'theatlantic': 'The Atlantic',
        'economist': 'The Economist',
        'bloomberg': 'Bloomberg',
        'ft': 'Financial Times',
        'ap': 'AP News',
        'npr': 'NPR',
        'scientificamerican': 'Scientific American',
        'nature': 'Nature',
        'science': 'Science',
        'wikipedia': 'Wikipedia',
        'groundnews': 'Ground News',
        'bravesearch': 'Brave Search',
        'serper': 'Serper',
      };
      
      // Check if we have a mapping
      if (publicationMap[domain]) {
        return publicationMap[domain];
      }
      
      // If no mapping, capitalize first letter and return
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    } catch {
      // If parsing fails, try to extract from string
      try {
        const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/]+)/);
        if (match && match[1]) {
          const domain = match[1].split('.')[0];
          return domain.charAt(0).toUpperCase() + domain.slice(1);
        }
      } catch {}
      return '';
    }
  };

  // Truncate claim text if over 50 characters (tighter limit for ring display)
  const truncateClaimText = (text: string): string => {
    if (text.length <= 50) return text;
    // Try to cut at a word boundary
    const truncated = text.slice(0, 47);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 30) {
      return truncated.slice(0, lastSpace) + '...';
    }
    return truncated + '...';
  };

  // Calculate dynamic font size based on text length
  const getClaimFontSize = (text: string): number => {
    const length = text.length;
    if (length <= 20) return 52;
    if (length <= 35) return 44;
    if (length <= 50) return 36;
    return 30;
  };

  // Get claim text for display inside the ring
  // Prefer the short title generated by the worker, fall back to raw input/claim
  const displayClaimText = isCompleted 
    ? (analysis?.title || analysis?.rawInput || analysis?.claims?.[0]?.text || claimText || "No claim text detected")
    : "";
  
  const truncatedClaimText = truncateClaimText(displayClaimText);
  const claimFontSize = getClaimFontSize(truncatedClaimText);
  const claimLineHeight = claimFontSize * 1.2;

  // Video selection matches color mapping: Unverified=amber, ≥85=green, 40-84=amber, <40=red
  const getResultVideo = (s: number, v: string | null | undefined) => {
    if (v === "Unverified") return VIDEO_ASSETS.resultAmber;
    if (s >= 85) return VIDEO_ASSETS.resultGreen;
    if (s >= 40) return VIDEO_ASSETS.resultAmber;
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
                  source={getResultVideo(score, verdict)}
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
                  isLooping={true}
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
            <AnimatedLens size={420} claimText={claimText || analysis?.rawInput || analysis?.claims?.[0]?.text || "Analyzing..."} />
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
                <Animated.View style={[card1AnimatedStyle, styles.verdictBox, isUnverified && { width: '100%' }]}>
                  <Text style={styles.verdictScoreLabel}>Verdict:</Text>
                  <View style={styles.verdictValueContainer}>
                    <Text style={[styles.verdictScoreValue, { color: scoreColor }]}>
                      {getVerdictLabel(score, verdict)}
                    </Text>
                  </View>
                </Animated.View>
                {!isUnverified && (
                  <Animated.View style={[card1AnimatedStyle, styles.scoreBox]}>
                    <Text style={styles.verdictScoreLabel}>Score:</Text>
                    <Text style={[styles.verdictScoreValue, { color: scoreColor, fontSize: 36, textAlign: 'center' }]}>
                      {score}
                    </Text>
                  </Animated.View>
                )}
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
                      const fullText = analysis?.recommendation || "No additional context available.";
                      if (!contextExpanded) {
                        // Limit to 500 characters, but ensure we don't cut mid-sentence
                        const MAX_CHARS = 500;
                        if (fullText.length > MAX_CHARS) {
                          // Find the last sentence boundary (., !, or ?) before the character limit
                          let truncated = fullText.substring(0, MAX_CHARS);
                          const sentenceEnders = /[.!?]\s+/g;
                          let lastMatch;
                          let match;
                          
                          // Find all sentence endings before the truncation point
                          while ((match = sentenceEnders.exec(fullText.substring(0, MAX_CHARS))) !== null) {
                            lastMatch = match;
                          }
                          
                          if (lastMatch) {
                            // Cut at the last complete sentence
                            truncated = fullText.substring(0, lastMatch.index + 1);
                          } else {
                            // If no sentence ending found, find the last space to avoid cutting mid-word
                            const lastSpaceIndex = truncated.lastIndexOf(' ');
                            if (lastSpaceIndex > MAX_CHARS * 0.8) { // Only use if we're not cutting too much
                              truncated = truncated.substring(0, lastSpaceIndex);
                            }
                          }
                          return truncated.trim();
                        }
                        return fullText;
                      }
                      return fullText;
                    })()}
                  </Text>
                  {(() => {
                    const fullText = analysis?.recommendation || "No additional context available.";
                    const MAX_CHARS = 500;
                    if (fullText.length > MAX_CHARS) {
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
                <Animated.View style={[card3AnimatedStyle, { marginTop: 16, width: '100%' }]}>
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
                    <View style={[styles.card, { width: '100%' }]}>
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
                            <View key={source.id || index} style={styles.sourceItem}>
                              <View style={styles.sourceContent}>
                                <Text style={styles.sourceTitle} numberOfLines={2}>
                                  {source.title || `Source ${index + 1}`}
                                </Text>
                                {source.url && (
                                  <Text style={styles.sourceProvider}>
                                    {getPublicationName(source.url)}
                                  </Text>
                                )}
                              </View>
                              {source.url && (
                                <TouchableOpacity
                                  style={styles.sourceButton}
                                  onPress={() => Linking.openURL(source.url)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="open-outline" size={18} color="#FFFFFF" />
                                  <Text style={styles.sourceButtonText}>Open</Text>
                                </TouchableOpacity>
                              )}
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
              <Text style={styles.loadingText}>{getLoadingText()}</Text>
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
  verdictScoreLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#6B6B6B',
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  verdictScoreValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 28,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  sourcesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24, // Ensure consistent height for vertical alignment
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  sourceContent: {
    flex: 1,
    marginRight: 8,
  },
  sourceTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 4,
  },
  sourceProvider: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#8A8A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  sourceButtonText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#FFFFFF',
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
