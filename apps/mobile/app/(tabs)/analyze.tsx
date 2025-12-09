import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  SafeAreaView,
  Pressable,
  Dimensions
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useShareIntent } from "expo-share-intent";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

import { tokenProvider } from "../../src/api/token-provider";
import { submitAnalysis } from "../../src/api/analysis";
import { useTheme } from "../../src/hooks/use-theme";
import { LensMotif } from "../../src/components/Lens/LensMotif";
import { AnimatedLens } from "../../src/components/Lens/AnimatedLens";
import { ClaimInput } from "../../src/components/Input/ClaimInput";
import { useLensState } from "../../src/hooks/useLensState";
import { UnicornStudioScene } from "../../src/components/UnicornStudio/UnicornStudioScene";
import { VideoAnimation } from "../../src/components/Video/VideoAnimation";
import { useVideoAnimationState } from "../../src/components/Video/VideoAnimationProvider";
import { ResizeMode } from "expo-av";

// Video Assets
const VIDEO_IDLE = require("../../assets/animations/home-idle.mp4");
const VIDEO_TYPING = require("../../assets/animations/home-typing.mp4");
const VIDEO_LOADING = require("../../assets/animations/loading.mp4");

export default function AnalyzeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSignedIn, getToken } = useAuth();
  
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  
  const { state: lensState, toInput, toLoading, reset } = useLensState();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const [permissionStatus, requestPermission] = ImagePicker.useMediaLibraryPermissions();
  const { registerVideo } = useVideoAnimationState();

  // Action row animation
  const actionRowOpacity = useSharedValue(0);
  const actionRowTranslateY = useSharedValue(20);

  // Video source state
  const [videoSource, setVideoSource] = useState(VIDEO_IDLE);
  const [previousVideoSource, setPreviousVideoSource] = useState<typeof VIDEO_IDLE | null>(null);
  // Ref to track current video source for comparison in async callbacks
  const videoSourceRef = useRef(videoSource);
  // Ref to track which video is currently displayed as the previous frame hold
  // This ensures we only clear the correct previous video when it finishes loading
  const displayedPreviousVideoRef = useRef<typeof VIDEO_IDLE | null>(null);

  useEffect(() => {
    let newSource = VIDEO_IDLE;
    if (lensState === 'loading') {
      newSource = VIDEO_LOADING;
      registerVideo('loading');
    } else if (isInputFocused || input || selectedImage) {
      newSource = VIDEO_TYPING;
      registerVideo('home-typing');
    } else {
      newSource = VIDEO_IDLE;
      registerVideo('home-idle');
    }

    // If source is changing, keep previous video visible
    if (newSource !== videoSource) {
      setPreviousVideoSource(videoSource);
      displayedPreviousVideoRef.current = videoSource; // Track which video is now displayed as previous
      setVideoSource(newSource);
      videoSourceRef.current = newSource;
    }
  }, [lensState, isInputFocused, input, selectedImage, registerVideo, videoSource]);

  const handleNewVideoLoad = useCallback((loadedSource: typeof VIDEO_IDLE) => {
    // Clear previous video after a small delay to ensure smooth transition
    // The loadedSource is the current video that just finished loading (from VideoAnimation onLoad)
    setTimeout(() => {
      // Read current video source from ref to check if we're still on the same video
      const currentSource = videoSourceRef.current;
      
      setPreviousVideoSource((prev: typeof VIDEO_IDLE | null) => {
        // Only clear if:
        // 1. There is a previous video displayed
        // 2. The loaded source matches the current video source (we're still on the same video)
        // This ensures we only clear the previous video when the current video finishes loading,
        // and prevents clearing if the user rapidly switched to a different video
        if (prev && loadedSource === currentSource) {
          displayedPreviousVideoRef.current = null;
          return null;
        }
        return prev;
      });
    }, 100);
  }, []);

  useEffect(() => {
    if (isInputFocused || input || selectedImage) {
      actionRowOpacity.value = withDelay(50, withTiming(1, { duration: 500, easing: Easing.out(Easing.exp) }));
      actionRowTranslateY.value = withDelay(50, withTiming(0, { duration: 500, easing: Easing.out(Easing.exp) }));
    } else {
      actionRowOpacity.value = 0;
      actionRowTranslateY.value = 20;
    }
  }, [isInputFocused, input, selectedImage, actionRowOpacity, actionRowTranslateY]);

  const actionRowStyle = useAnimatedStyle(() => ({
    opacity: actionRowOpacity.value,
    transform: [{ translateY: actionRowTranslateY.value }],
  }));

  useFocusEffect(
    useCallback(() => {
      reset();
      setInput("");
      setSelectedImage(null);
      setIsInputFocused(false);
    }, [reset])
  );

  useEffect(() => {
    const updateToken = async () => {
      if (isSignedIn && getToken) {
        try {
          const token = await getToken();
          tokenProvider.setToken(token);
        } catch (error) {
          console.error("[Analyze] Error getting token:", error);
          tokenProvider.setToken(null);
        }
      } else {
        tokenProvider.setToken(null);
      }
    };
    updateToken();
  }, [isSignedIn, getToken]);

  useEffect(() => {
    if (hasShareIntent && shareIntent) {
      let handled = false;
      if (shareIntent.webUrl || shareIntent.text || (shareIntent as any).url) {
        const content = shareIntent.webUrl || shareIntent.text || (shareIntent as any).url;
        if (content && typeof content === "string") {
          setInput(content);
          toInput();
          setIsInputFocused(true);
          handled = true;
        }
      } else if (shareIntent.files && shareIntent.files.length > 0) {
        const file = shareIntent.files[0];
        const uri = file.path || (file as any).contentUri || (file as any).uri;
        if (uri && typeof uri === "string") {
          setSelectedImage(uri);
          toInput();
          handled = true;
        }
      }
      
      if (!handled) {
        Alert.alert("Unsupported Content", "The shared content could not be processed.");
      }
      resetShareIntent();
    }
  }, [hasShareIntent, shareIntent, toInput, resetShareIntent]);

  const mutation = useMutation({
    mutationFn: async (data: { text?: string; imageUri?: string }) => {
      const mediaType = data.imageUri ? "IMAGE" : "TEXT";
      return await submitAnalysis({
        text: data.text,
        contentUri: data.imageUri,
        mediaType,
      });
    },
    onMutate: () => {
      toLoading();
    },
    onSuccess: (data) => {
      console.log("[Analyze] Submission success, job ID:", data.analysisId);
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
      // Pass claim text to result screen for smooth transition
      const claimText = getClaimTextForLoading();
      router.push({
        pathname: `/result/${data.analysisId}`,
        params: { claimText: claimText || input || "" }
      });
    },
    onError: (error: any) => {
      console.error("[Analyze] Submission error:", error);
      Alert.alert("Error", "Failed to submit analysis. Please try again.");
      reset();
    },
  });

  const handleSubmit = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput && !selectedImage) return;
    
    Keyboard.dismiss();
    setIsInputFocused(false);
    mutation.mutate({
      text: trimmedInput || undefined,
      imageUri: selectedImage || undefined,
    });
  };

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setInput(text);
        toInput();
        setIsInputFocused(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Failed to paste from clipboard:", error);
      // Optional: show alert or just log, typically silent failure is better for paste unless user initiated
    }
  };

  const pickImage = async () => {
    if (permissionStatus?.status !== ImagePicker.PermissionStatus.GRANTED) {
      const permission = await requestPermission();
      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow access to your photos to upload images.");
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
      toInput();
    }
  };

  const handleLensPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (lensState === "idle" || lensState === "input") {
      toInput();
      setIsInputFocused(true);
    }
  };

  // Helper to detect if input is a URL
  const isUrl = (text: string): boolean => {
    try {
      const url = new URL(text);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      // Check for common URL patterns
      return /^(https?:\/\/|www\.)/i.test(text.trim());
    }
  };

  // Get claim text to display during loading
  const getClaimTextForLoading = (): string => {
    if (selectedImage) {
      return "Analyzing image...";
    }
    if (input && input.trim()) {
      if (isUrl(input.trim())) {
        return "Extracting claim...";
      }
      return input.trim();
    }
    return "Analyzing...";
  };

  // Fallback to old components if video fails
  const [videoError, setVideoError] = useState(false);
  
  // Get screen dimensions for proper video sizing
  const screenDimensions = Dimensions.get('window');
  const screenWidth = screenDimensions.width;
  const screenHeight = screenDimensions.height;

  return (
    <SafeAreaView style={styles.container}>
      {/* Video Background - Full Screen */}
      {!videoError && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 0, width: screenWidth, height: screenHeight }]}>
          {/* Previous video as frame hold layer */}
          {previousVideoSource && previousVideoSource !== videoSource && (
            <View style={[StyleSheet.absoluteFill, { zIndex: 1 }]}>
              <VideoAnimation 
                source={previousVideoSource}
                shouldPlay={false}
                style={StyleSheet.absoluteFill}
                resizeMode={ResizeMode.COVER}
                loopFromSeconds={5}
                onError={() => {}}
              />
            </View>
          )}
          
          {/* Current video on top */}
          <View style={[StyleSheet.absoluteFill, { zIndex: 2 }]}>
            <VideoAnimation 
              source={videoSource}
              shouldPlay={true}
              style={StyleSheet.absoluteFill}
              resizeMode={ResizeMode.COVER}
              loopFromSeconds={5}
              onError={() => setVideoError(true)}
              onLoad={handleNewVideoLoad}
            />
          </View>
        </View>
      )}
      
      {/* Unicorn Studio Scene as Fallback Background */}
      {videoError && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 0, backgroundColor: '#000000' }]}>
          <UnicornStudioScene
            projectId="uGUCLWyldMKQb0JBP7yQ"
            width="100%"
            height="100%"
            scale={1}
            fps={60}
            showLoading={false} 
            pointerEvents="none" 
          />
        </View>
      )}

      <TouchableWithoutFeedback onPress={() => {
        Keyboard.dismiss();
        setIsInputFocused(false);
        if (!input && !selectedImage) reset();
      }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.content, { zIndex: 10, backgroundColor: 'transparent' }]}
        >
          <View style={styles.lensContainer}>
            {/* Animated Lens Container */}
            <Animated.View>
                <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', position: 'relative' }}>
                  <View style={{ width: 420, height: 420, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                    {videoError ? (
                        // Fallback to original components
                        <>
                          {lensState === "loading" ? (
                              <AnimatedLens size={420} claimText={getClaimTextForLoading()} />
                          ) : (
                              <LensMotif 
                                  size={420} 
                                  showPrompt={!(isInputFocused || input || selectedImage)}
                              />
                          )}
                        </>
                    ) : (
                        // Circular mask overlay for video (creates lens effect)
                        <View style={{ width: 420, height: 420, borderRadius: 210, overflow: 'hidden', position: 'absolute' }}>
                          <Pressable 
                            onPress={videoSource === VIDEO_IDLE ? handleLensPress : undefined}
                            style={StyleSheet.absoluteFill}
                          >
                            <View style={StyleSheet.absoluteFill} />
                          </Pressable>
                        </View>
                    )}

                    {/* Input Overlay inside Lens - only show when user is typing (not loading) */}
                    {(isInputFocused || input || selectedImage) && lensState !== 'loading' && (
                      <View style={{ position: 'absolute', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }} pointerEvents="box-none">
                        <ClaimInput
                          value={input}
                          onChangeText={(text) => setInput(text)}
                          onSubmitEditing={handleSubmit}
                          returnKeyType="go"
                          isFocused={isInputFocused}
                          onFocus={() => setIsInputFocused(true)}
                          onBlur={() => setIsInputFocused(false)}
                          placeholder="Paste a claim..."
                          editable={true}
                          style={{ 
                            marginTop: 0, 
                            color: "#FFFFFF", 
                            textAlign: "center",
                            width: 315, // Constrain width inside lens (420px * 0.75)
                            fontSize: 13,
                            fontFamily: "Inter_400Regular",
                          }}
                          placeholderTextColor="rgba(255,255,255,0.5)"
                        />
                      </View>
                    )}
                  </View>
                  
                  {/* Claim Text Overlay during Loading (on top of video) */}
                  {lensState === "loading" && (
                    <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]} pointerEvents="none">
                         <Text 
                            style={{
                              fontFamily: 'Inter_400Regular',
                              fontSize: 14,
                              color: '#FFFFFF',
                              textAlign: 'center',
                              paddingHorizontal: 32,
                              maxWidth: 360,
                              textShadowColor: 'rgba(0, 0, 0, 0.5)',
                              textShadowOffset: { width: 0, height: 1 },
                              textShadowRadius: 2,
                            }}
                            numberOfLines={4}
                          >
                            {getClaimTextForLoading()}
                          </Text>
                    </View>
                  )}
                </View>
            </Animated.View>
              
            {/* Content Below Lens */}
            <View style={{ marginTop: isInputFocused ? -32 : 24, width: '100%', alignItems: 'center', paddingHorizontal: 20 }}>
              {lensState === "loading" ? (
                // Loading text is now inside the lens/video overlay, but we might want status text below too?
                // The original design had text below. But "Loading animation" video might cover it.
                // Keeping it simple for now.
                null
              ) : (
                <View style={{ alignItems: 'center', width: '100%' }}>
                  {(isInputFocused || input || selectedImage) && (
                    <View style={{ width: "100%", alignItems: "center" }}>
                      {/* Image Preview */}
                      {selectedImage && (
                        <View style={styles.imagePreview}>
                          <Text style={styles.imageText}>Image Selected</Text>
                          <TouchableOpacity onPress={() => setSelectedImage(null)}>
                            <Ionicons name="close-circle" size={20} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Action Row: Image, Paste, Submit */}
                      <Animated.View style={[styles.actionRow, actionRowStyle]}>
                        <TouchableOpacity onPress={pickImage} style={styles.circleButton}>
                          <Ionicons name="image-outline" size={24} color="#FFF" />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handlePaste} style={styles.circleButton}>
                          <Ionicons name="clipboard-outline" size={24} color="#FFF" />
                        </TouchableOpacity>

                        <TouchableOpacity 
                          onPress={handleSubmit} 
                          style={[styles.pillButton, ((!input.trim() && !selectedImage) || mutation.isPending) && { opacity: 0.5 }]}
                          disabled={(!input.trim() && !selectedImage) || mutation.isPending}
                        >
                          <Text style={styles.pillButtonText}>Analyze</Text>
                          <Ionicons name="arrow-forward" size={20} color="#000" />
                        </TouchableOpacity>
                      </Animated.View>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: Platform.OS === "ios" ? 120 : 100, // Space for tab bar
    width: "100%",
  },
  lensContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    position: "relative",
  },
  loadingContainer: {
    alignItems: "center",
  },
  loadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#E5E5E5",
    marginBottom: 8,
  },
  claimPreview: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#A0A0A0",
    maxWidth: 240,
    textAlign: "center",
  },
  imagePreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 8,
    borderRadius: 20,
    marginBottom: 16,
    gap: 8,
  },
  imageText: {
    color: "#E5E5E5",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 0,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillButton: {
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  pillButtonText: {
    color: '#000000',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
});
