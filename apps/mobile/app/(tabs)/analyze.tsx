import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  Pressable,
  Dimensions,
  Image
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
  cancelAnimation,
  runOnJS,
} from "react-native-reanimated";

import { tokenProvider } from "../../src/api/token-provider";
import { submitAnalysis } from "../../src/api/analysis";
import { useTheme } from "../../src/hooks/use-theme";
import { LensMotif } from "../../src/components/Lens/LensMotif";
import { AnimatedLens } from "../../src/components/Lens/AnimatedLens";
import { ClaimInput, ClaimInputRef } from "../../src/components/Input/ClaimInput";
import { useLensState } from "../../src/hooks/useLensState";
import { UnicornStudioScene } from "../../src/components/UnicornStudio/UnicornStudioScene";
import { VideoAnimation } from "../../src/components/Video/VideoAnimation";
import { useVideoAnimationState } from "../../src/components/Video/VideoAnimationProvider";
import { ResizeMode } from "expo-av";

// Video Assets
const VIDEO_IDLE = require("../../assets/animations/home-idle.mp4");
const VIDEO_TYPING = require("../../assets/animations/home-typing.mp4");
const VIDEO_LOADING = require("../../assets/animations/loading.mp4");

// Still image for home-idle (frame hold to prevent flicker)
const HOME_IDLE_STILL = require("../../assets/animations/home-idle-still.png");

export default function AnalyzeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSignedIn, getToken } = useAuth();
  
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<ClaimInputRef>(null);
  
  const { state: lensState, toInput, toLoading, reset } = useLensState();
  
  // Animation for input text fade-in
  const inputOpacity = useSharedValue(0);
  const inputScale = useSharedValue(1);
  const inputWasVisibleRef = useRef(false); // Track if input was previously visible to detect transitions
  const actionRowWasVisibleRef = useRef(false); // Track if action row was previously visible to detect transitions
  const isTransitioningToInputRef = useRef(false); // Track if we're in the middle of transitioning to input mode
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const [permissionStatus, requestPermission] = ImagePicker.useMediaLibraryPermissions();
  const { registerVideo } = useVideoAnimationState();

  // Action row animation
  const actionRowOpacity = useSharedValue(0);
  const actionRowTranslateY = useSharedValue(20);

  // Video source state - track which video should be active
  const [activeVideoSource, setActiveVideoSource] = useState(VIDEO_IDLE);
  // Track loaded state for each video to know when they're ready
  const [loadedVideos, setLoadedVideos] = useState<Set<typeof VIDEO_IDLE>>(new Set());
  // Opacity values for each video (all videos stay mounted)
  const idleOpacity = useSharedValue(1);
  const typingOpacity = useSharedValue(0);
  const loadingOpacity = useSharedValue(0);
  // Track if we're currently animating to prevent interruption
  const isAnimatingRef = useRef(false);
  const animationTargetRef = useRef<typeof VIDEO_IDLE | null>(null);

  // Create stable callback function for animation completion (must be outside worklet)
  const resetAnimationFlags = useCallback(() => {
    isAnimatingRef.current = false;
    animationTargetRef.current = null;
  }, []);

  useEffect(() => {
    let newSource = VIDEO_IDLE;
    if (lensState === 'loading') {
      newSource = VIDEO_LOADING;
      registerVideo('loading');
    } else if (lensState === 'input' || isInputFocused || input || selectedImage) {
      // Switch to typing video immediately when lensState is 'input' (not waiting for isInputFocused)
      newSource = VIDEO_TYPING;
      registerVideo('home-typing');
    } else {
      newSource = VIDEO_IDLE;
      registerVideo('home-idle');
    }

    // Skip if we're already animating to the same target AND the source has already changed
    // Only skip if activeVideoSource has actually reached the target to prevent blocking transitions
    if (isAnimatingRef.current && animationTargetRef.current === newSource && activeVideoSource === newSource) {
      return;
    }

    if (newSource !== activeVideoSource) {
      const previousSource = activeVideoSource;
      
      // Cancel any ongoing animations if transitioning to a different state
      if (isAnimatingRef.current && animationTargetRef.current !== newSource) {
        cancelAnimation(idleOpacity);
        cancelAnimation(typingOpacity);
        isAnimatingRef.current = false;
        animationTargetRef.current = null;
      }
      
      setActiveVideoSource(newSource);
      
      // Subtle crossfade when transitioning from idle to typing
      if (previousSource === VIDEO_IDLE && newSource === VIDEO_TYPING) {
        // Mark that we're animating
        isAnimatingRef.current = true;
        animationTargetRef.current = newSource;
        
        // Crossfade: fade out idle, fade in typing
        idleOpacity.value = withTiming(0, {
          duration: 400,
          easing: Easing.out(Easing.ease),
        });
        typingOpacity.value = withTiming(1, {
          duration: 400,
          easing: Easing.out(Easing.ease),
        }, (finished) => {
          // Reset animation flag when animation completes
          if (finished) {
            runOnJS(resetAnimationFlags)();
          }
        });
        loadingOpacity.value = 0;
      } else {
        // Instant opacity switch for other transitions to prevent flicker
        // Ensure videos reset to position 0 when they become active
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
  }, [lensState, isInputFocused, input, selectedImage, registerVideo, activeVideoSource, idleOpacity, typingOpacity, loadingOpacity, resetAnimationFlags]);

  const handleVideoLoad = useCallback((loadedSource: typeof VIDEO_IDLE) => {
    setLoadedVideos((prev) => new Set(prev).add(loadedSource));
  }, []);

  useEffect(() => {
    const isInputVisible = isInputFocused || input || selectedImage;
    
    if (isInputVisible) {
      // Clear transition flag once input becomes visible
      isTransitioningToInputRef.current = false;
      
      // Action buttons fade-in with 750ms delay to match input text - only when transitioning from hidden to visible
      if (!actionRowWasVisibleRef.current) {
        actionRowOpacity.value = withDelay(750, withTiming(1, { duration: 500, easing: Easing.out(Easing.exp) }));
        actionRowTranslateY.value = withDelay(750, withTiming(0, { duration: 500, easing: Easing.out(Easing.exp) }));
        actionRowWasVisibleRef.current = true;
      }
      // Start input fade-in with delay only when transitioning from hidden to visible
      if (!inputWasVisibleRef.current) {
        inputOpacity.value = withDelay(750, withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }));
        inputWasVisibleRef.current = true;
      }
    } else {
      // Don't reset animations if we're in the middle of transitioning to input mode
      if (!isTransitioningToInputRef.current) {
        actionRowOpacity.value = 0;
        actionRowTranslateY.value = 20;
        inputOpacity.value = 0;
        inputWasVisibleRef.current = false;
        actionRowWasVisibleRef.current = false;
      }
    }
  }, [isInputFocused, input, selectedImage, actionRowOpacity, actionRowTranslateY, inputOpacity]);

  const actionRowStyle = useAnimatedStyle(() => ({
    opacity: actionRowOpacity.value,
    transform: [{ translateY: actionRowTranslateY.value }],
  }));

  const inputStyle = useAnimatedStyle(() => ({
    opacity: inputOpacity.value,
    transform: [
      { translateY: -50 }, // Preserve the vertical offset
      { scale: inputScale.value },
    ],
  }));

  // Animated styles for video layers
  const idleVideoStyle = useAnimatedStyle(() => ({
    opacity: idleOpacity.value,
  }));

  const typingVideoStyle = useAnimatedStyle(() => ({
    opacity: typingOpacity.value,
  }));

  const loadingVideoStyle = useAnimatedStyle(() => ({
    opacity: loadingOpacity.value,
  }));

  useFocusEffect(
    useCallback(() => {
      reset();
      setInput("");
      setSelectedImage(null);
      setIsInputFocused(false);
      // Reset input opacity animated value to match UI state
      inputOpacity.value = 0;
      inputScale.value = 1;
      actionRowOpacity.value = 0;
      actionRowTranslateY.value = 20;
      inputWasVisibleRef.current = false; // Reset visibility tracking
      actionRowWasVisibleRef.current = false; // Reset action row visibility tracking
      isTransitioningToInputRef.current = false; // Reset transition flag
    }, [reset, inputOpacity, inputScale, actionRowOpacity, actionRowTranslateY])
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
          // Mark that we're transitioning to input mode to prevent useEffect from resetting animations
          isTransitioningToInputRef.current = true;
          // Set focused state immediately so useEffect can handle animation (prevents double animation)
          setIsInputFocused(true);
          // Set focused state and focus input after delay to trigger keyboard consistently
          setTimeout(() => {
            inputRef.current?.focus();
          }, 750);
          handled = true;
        }
      } else if (shareIntent.files && shareIntent.files.length > 0) {
        const file = shareIntent.files[0];
        const uri = file.path || (file as any).contentUri || (file as any).uri;
        if (uri && typeof uri === "string") {
          setSelectedImage(uri);
          toInput();
          // Mark that we're transitioning to input mode to prevent useEffect from resetting animations
          isTransitioningToInputRef.current = true;
          // Set focused state immediately so useEffect can handle animation (prevents double animation)
          setIsInputFocused(true);
          // Focus input after delay to trigger keyboard consistently
          setTimeout(() => {
            inputRef.current?.focus();
          }, 750);
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
    // Set transition flag to prevent useEffect from resetting animations during fade-out
    isTransitioningToInputRef.current = true;
    setIsInputFocused(false);
    
    // Animate claim text to fade and shrink into orb before submitting
    inputOpacity.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) });
    inputScale.value = withTiming(0.3, { duration: 400, easing: Easing.out(Easing.ease) });
    
    // Wait for animation to complete before submitting
    setTimeout(() => {
      mutation.mutate({
        text: trimmedInput || undefined,
        imageUri: selectedImage || undefined,
      });
      // Clear transition flag after submission completes
      isTransitioningToInputRef.current = false;
    }, 400);
  };

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setInput(text);
        toInput();
        // Mark that we're transitioning to input mode to prevent useEffect from resetting animations
        isTransitioningToInputRef.current = true;
        // Set focused state immediately so useEffect can handle animation (prevents double animation)
        setIsInputFocused(true);
        // Set focused state and focus input after delay to trigger keyboard consistently
        setTimeout(() => {
          inputRef.current?.focus();
        }, 750);
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
      // Mark that we're transitioning to input mode to prevent useEffect from resetting animations
      isTransitioningToInputRef.current = true;
      // Set focused state immediately so useEffect can handle animation (prevents double animation)
      setIsInputFocused(true);
      // Focus input after delay to trigger keyboard consistently
      setTimeout(() => {
        inputRef.current?.focus();
      }, 750);
    }
  };

  const handleLensPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (lensState === "idle" || lensState === "input") {
      toInput();
      // Mark that we're transitioning to input mode to prevent useEffect from resetting animations
      isTransitioningToInputRef.current = true;
      // Set focused state immediately so useEffect can handle animation (prevents double animation)
      setIsInputFocused(true);
      // Focus input after delay to trigger keyboard consistently
      setTimeout(() => {
        inputRef.current?.focus();
      }, 750);
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
    <View style={styles.container}>
      {/* Video Background - Full Screen */}
      {!videoError && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 0, top: 0, left: 0, right: 0, bottom: 0, width: screenWidth, height: screenHeight, overflow: 'hidden' }]}>
          {/* Still image layer for home-idle (always visible underneath to prevent flicker) */}
          <Image 
            source={HOME_IDLE_STILL}
            style={[StyleSheet.absoluteFill, { zIndex: 0, top: 0, left: 0, right: 0, bottom: 0, width: screenWidth, height: screenHeight }]}
            resizeMode="cover"
          />
          
          {/* All videos mounted simultaneously - visibility controlled by opacity */}
          {/* Home Idle Video */}
          <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 1, top: 0, left: 0, right: 0, bottom: 0, width: screenWidth, height: screenHeight }, idleVideoStyle]} pointerEvents="none">
            <VideoAnimation 
              source={VIDEO_IDLE}
              shouldPlay={activeVideoSource === VIDEO_IDLE}
              style={[StyleSheet.absoluteFill, { width: screenWidth, height: screenHeight }]}
              resizeMode={ResizeMode.COVER}
              loopFromSeconds={4}
              isLooping={false}
              onError={() => setVideoError(true)}
              onLoad={handleVideoLoad}
            />
          </Animated.View>

          {/* Typing Video */}
          <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 2, top: 0, left: 0, right: 0, bottom: 0, width: screenWidth, height: screenHeight }, typingVideoStyle]} pointerEvents="none">
            <VideoAnimation 
              source={VIDEO_TYPING}
              shouldPlay={activeVideoSource === VIDEO_TYPING}
              style={[StyleSheet.absoluteFill, { width: screenWidth, height: screenHeight }]}
              resizeMode={ResizeMode.COVER}
              loopFromSeconds={4}
              isLooping={false}
              onError={() => setVideoError(true)}
              onLoad={handleVideoLoad}
            />
          </Animated.View>

          {/* Loading Video */}
          <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 3, top: 0, left: 0, right: 0, bottom: 0, width: screenWidth, height: screenHeight }, loadingVideoStyle]} pointerEvents="none">
            <VideoAnimation 
              source={VIDEO_LOADING}
              shouldPlay={activeVideoSource === VIDEO_LOADING}
              style={[StyleSheet.absoluteFill, { width: screenWidth, height: screenHeight }]}
              resizeMode={ResizeMode.COVER}
              loopFromSeconds={0}
              isLooping={false}
              onError={() => setVideoError(true)}
              onLoad={handleVideoLoad}
            />
          </Animated.View>
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
        <View
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
                            onPress={activeVideoSource === VIDEO_IDLE ? handleLensPress : undefined}
                            style={StyleSheet.absoluteFill}
                          >
                            <View style={StyleSheet.absoluteFill} />
                          </Pressable>
                        </View>
                    )}

                    {/* Input Overlay inside Lens - only show when user is typing (not loading) */}
                    {(isInputFocused || input || selectedImage) && lensState !== 'loading' && (
                      <Animated.View style={[{ position: 'absolute', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }, inputStyle]} pointerEvents="box-none">
                        <ClaimInput
                          ref={inputRef}
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
                            width: 240, // Narrower width aligned with action buttons
                            maxWidth: 240,
                            fontSize: 13,
                            fontFamily: "Inter_400Regular",
                            textAlignVertical: "center",
                          }}
                          placeholderTextColor="rgba(255,255,255,0.5)"
                        />
                      </Animated.View>
                    )}
                  </View>
                </View>
            </Animated.View>
              
            {/* Content Below Lens */}
            <View style={{ marginTop: isInputFocused ? -80 : -40, width: '100%', alignItems: 'center', paddingHorizontal: 20 }}>
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
