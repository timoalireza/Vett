import { useEffect, useState, useRef } from "react";
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, BackHandler, Dimensions, Image, Linking } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
  useAnimatedScrollHandler,
  interpolate,
} from "react-native-reanimated";

import { AnalysisResponse, fetchAnalysis } from "../../src/api/analysis";
import { LensMotif } from "../../src/components/Lens/LensMotif";
import { AnimatedLens } from "../../src/components/Lens/AnimatedLens";
import { ScoreRing } from "../../src/components/Lens/ScoreRing";
import { ColorTintOverlay } from "../../src/components/Lens/ColorTintOverlay";
import { SummaryCard } from "../../src/components/Results/SummaryCard";
import { SourcesCard } from "../../src/components/Results/SourcesCard";
import { getScoreColor } from "../../src/utils/scoreColors";
import { VideoAnimation } from "../../src/components/Video/VideoAnimation";
import { useVideoAnimationState } from "../../src/components/Video/VideoAnimationProvider";
import { ResizeMode } from "expo-av";
import { VettAIChat } from "../../src/components/VettAIChat";
import { chatWithVettAI, getChatUsage, type ChatUsageInfo } from "../../src/api/vettai";
import { fetchSubscription } from "../../src/api/subscription";

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
  const { jobId, claimText, demo } = useLocalSearchParams<{ jobId: string; claimText?: string; demo?: string }>();
  const router = useRouter();
  const { registerVideo } = useVideoAnimationState();
  const [videoError, setVideoError] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [contextExpanded, setContextExpanded] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [chatUsage, setChatUsage] = useState<ChatUsageInfo | null>(null);
  const sourcesChevronRotation = useSharedValue(0);
  const insets = useSafeAreaInsets();

  const isDemo = jobId === "demo" || demo === "1";
  const [demoAnalysis, setDemoAnalysis] = useState<AnalysisResponse | null>(() => {
    if (!isDemo) return null;
    const now = new Date().toISOString();
    const claim = claimText || "Scientists have discovered that drinking coffee can extend your lifespan by up to 10 years.";
    return {
      id: "demo",
      status: "QUEUED",
      createdAt: now,
      score: null,
      verdict: null,
      confidence: null,
      bias: null,
      title: null,
      summary: null,
      recommendation: null,
      rawInput: claim,
      claims: [
        {
          id: "demo-claim-1",
          text: claim,
          verdict: null,
          confidence: null,
          extractionConfidence: null,
        },
      ],
      sources: [],
    };
  });

  // Demo flow: simulate job progress and completion locally (no API/auth required)
  useEffect(() => {
    if (!isDemo) return;

    const claim = claimText || "Scientists have discovered that drinking coffee can extend your lifespan by up to 10 years.";
    const now = new Date().toISOString();
    const timers: Array<ReturnType<typeof setTimeout>> = [];

    // Ensure we start from a clean queued state when entering demo
    setDemoAnalysis({
      id: "demo",
      status: "QUEUED",
      createdAt: now,
      score: null,
      verdict: null,
      confidence: null,
      bias: null,
      title: "Coffee extends lifespan by 10 years",
      summary: null,
      recommendation: null,
      rawInput: claim,
      claims: [
        {
          id: "demo-claim-1",
          text: claim,
          verdict: null,
          confidence: null,
          extractionConfidence: null,
        },
      ],
      sources: [],
    });

    timers.push(
      setTimeout(() => {
        setDemoAnalysis((prev) =>
          prev
            ? {
                ...prev,
                status: "PROCESSING",
              }
            : prev
        );
      }, 900)
    );

    timers.push(
      setTimeout(() => {
        setDemoAnalysis((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: "COMPLETED",
            // Use server-style verdicts so the existing label/color mapping matches homescreen/results.
            verdict: "Partially Accurate",
            score: 42,
            confidence: 0.78,
            summary:
              "Some research links moderate coffee intake to improved health outcomes, but the claim of adding 10 years to lifespan is exaggerated and not supported by strong evidence.",
            recommendation:
              "If you see a claim like this, look for the exact study being cited (sample size, duration, and outcomes). Most coffee research is observational and can’t prove causation. Treat large, specific lifespan numbers as a red flag unless multiple high-quality studies agree.",
            sources: [
              {
                id: "demo-source-1",
                provider: "web",
                title: "Coffee and health: What does the evidence actually show?",
                url: "https://www.nih.gov/",
                reliability: 0.9,
                summary: "Overview of what health research can and can't conclude from observational studies.",
              },
              {
                id: "demo-source-2",
                provider: "web",
                title: "Coffee and longevity: Benefits and limitations",
                url: "https://www.hsph.harvard.edu/",
                reliability: 0.85,
                summary: "Summary of findings plus common over-interpretations in headlines.",
              },
            ],
            claims: [
              {
                id: "demo-claim-1",
                text: claim,
                verdict: "Partially Accurate",
                confidence: 0.78,
                extractionConfidence: 0.95,
              },
            ],
          };
        });
      }, 3200)
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [isDemo, claimText]);

  const { data: apiAnalysis, isLoading, error } = useQuery({
    queryKey: ["analysis", jobId],
    queryFn: () => fetchAnalysis(jobId!),
    enabled: !!jobId && !isDemo,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "COMPLETED" || status === "FAILED" ? false : 2000;
    },
  });

  // Fetch subscription to check if user has access to Vett Chat
  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: fetchSubscription,
    enabled: !isDemo, // Skip for demo mode
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const analysis = isDemo ? demoAnalysis : apiAnalysis;
  
  // Check if user has Vett Chat access (Plus or Pro plan)
  // Note: Both PLUS and PRO plans have chat access (PLUS has limited, PRO has unlimited)
  const hasVettChatAccess = subscription?.plan === "PLUS" || subscription?.plan === "PRO";

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

  // Fetch chat usage when analysis is completed (skip for demo)
  useEffect(() => {
    if (isDemo) return;
    
    const fetchUsage = async () => {
      try {
        const usage = await getChatUsage();
        setChatUsage(usage);
      } catch (error) {
        // Silently fail - chat will still work, just won't show remaining count
        console.debug("[VettChat] Could not fetch chat usage:", error);
      }
    };
    
    if (analysis?.status === "COMPLETED") {
      fetchUsage();
    }
  }, [analysis?.status, isDemo]);

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
    // Map server verdicts to mobile display labels
    // Server can return: "Verified", "Mostly Accurate", "Partially Accurate", "False", "Opinion", "Unverified"
    
    // Direct mappings
    if (v === "Unverified") return 'Unverified';
    if (v === "Verified") return 'Verified';
    if (v === "False") return 'False';
    
    // Map "Mostly Accurate" and "Partially Accurate" to "Disputed"
    // These indicate mixed or partial truth, which aligns with the "Disputed" concept
    if (v === "Mostly Accurate" || v === "Partially Accurate") return 'Disputed';
    
    // Map "Opinion" to "Disputed" (opinions are subjective, can't be verified/false)
    if (v === "Opinion") return 'Disputed';
    
    // Fallback to score-based logic only if verdict is null/undefined
    if (s >= 85) return 'Verified';
    if (s >= 40) return 'Disputed';
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

  // Claim title shown inside the orb (never truncate; auto-scale to fit).
  // Get claim text for display inside the ring
  // Prefer the short title generated by the worker, fall back to raw input/claim
  const displayClaimText = isCompleted 
    ? (analysis?.title || analysis?.rawInput || analysis?.claims?.[0]?.text || claimText || "No claim text detected")
    : "";
  
  // IMPORTANT: Never truncate UI text. We auto-scale the font so the full title always fits.
  const claimMaxFontSize = 52;

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
                  freezeAtSeconds={5}
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
                      fontFamily: 'Inter_700Bold',
                      fontSize: claimMaxFontSize,
                      color: '#FFFFFF',
                      textAlign: 'center',
                      maxWidth: 420 * 0.85,
                      textShadowColor: 'rgba(0, 0, 0, 0.8)',
                      textShadowOffset: { width: 0, height: 2 },
                      textShadowRadius: 6,
                    }}
                    // Auto-scale to ensure the claim title is never cut off inside the orb.
                    adjustsFontSizeToFit
                    minimumFontScale={0.05}
                    numberOfLines={10}
                    allowFontScaling={false}
                    ellipsizeMode="clip"
                  >
                    "{displayClaimText}"
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

      {/* Floating Chat Button - only show when analysis is completed, not in demo mode, and user has Vett Chat access */}
      {isCompleted && !isDemo && hasVettChatAccess && (
        <TouchableOpacity
          style={[styles.chatButton, { bottom: insets.bottom + 20 }]}
          onPress={() => setChatVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color="#000000" />
          <Text style={styles.chatButtonText}>Ask Vett</Text>
        </TouchableOpacity>
      )}

      {/* Vett Chat Modal */}
      <VettAIChat
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        analysisId={jobId}
        analysisData={{
          claim: analysis?.rawInput || analysis?.claims?.[0]?.text,
          verdict: analysis?.verdict || undefined,
          score: analysis?.score ?? undefined,
          summary: analysis?.summary || undefined,
          sources: analysis?.sources?.map(s => ({ title: s.title, url: s.url }))
        }}
        onSendMessage={chatWithVettAI}
        initialChatUsage={chatUsage}
      />
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
    fontFamily: 'Inter_700Bold',
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
    fontFamily: 'Inter_500Medium',
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
    fontFamily: 'Inter_700Bold',
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
  chatButton: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2EFAC0',
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
    shadowColor: '#2EFAC0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
  },
  chatButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#000000',
  },
});
