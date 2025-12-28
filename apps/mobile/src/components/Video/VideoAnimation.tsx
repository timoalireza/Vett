import React, { useRef, useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Pressable, ViewStyle, StyleProp, Image } from 'react-native';

// Dynamically import expo-av to handle cases where native module isn't available
let Video: any;
let ResizeMode: any;
let AVPlaybackStatus: any;

try {
  const avModule = require('expo-av');
  Video = avModule.Video;
  ResizeMode = avModule.ResizeMode;
  AVPlaybackStatus = avModule.AVPlaybackStatus;
} catch (error) {
  console.warn('[VideoAnimation] expo-av not available:', error);
  // Video will be undefined, component will handle gracefully
}

interface VideoAnimationProps {
  source: any;
  onSkip?: () => void;
  shouldPlay: boolean;
  style?: StyleProp<ViewStyle>;
  resizeMode?: any; // ResizeMode type, but optional since module might not be available
  startAtSeconds?: number; // Initial playback position when starting (in seconds)
  loopFromSeconds?: number;
  loopToSeconds?: number; // If provided, loops back to loopFromSeconds when position reaches this time (in seconds)
  isLooping?: boolean; // If true, loops normally. If false, we handle custom loop logic.
  onError?: () => void;
  onLoad?: (loadedSource: any) => void; // Callback when video is loaded and ready, passes the source that loaded
  freezeAtSeconds?: number; // Freeze video at this time (in seconds) after playback starts
  stillFrameSource?: any; // Still image to show when frozen
  onFreeze?: () => void; // Callback when video freezes
  isMuted?: boolean; // Whether video should be muted (default: true for silent animations)
  volume?: number; // Volume level 0.0 to 1.0 (default: 0.0, only used if isMuted is false)
}

export const VideoAnimation: React.FC<VideoAnimationProps> = ({
  source,
  onSkip,
  shouldPlay,
  style,
  resizeMode,
  startAtSeconds = 0,
  loopFromSeconds = 5,
  loopToSeconds,
  isLooping = false,
  onError,
  onLoad,
  freezeAtSeconds,
  stillFrameSource,
  onFreeze,
  isMuted = true, // Default to muted for silent animations
  volume = 0.0 // Default to 0 volume (only used if isMuted is false)
}) => {
  const videoRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const previousSourceRef = useRef<any>(null);
  const hasStartedPlayingRef = useRef(false);
  const hasFiredFreezeRef = useRef(false);
  
  // Default resize mode if available
  const defaultResizeMode = ResizeMode ? ResizeMode.COVER : undefined;
  const finalResizeMode = resizeMode || defaultResizeMode;

  // Reset video state when source changes
  useEffect(() => {
    if (source !== previousSourceRef.current) {
      // Reset loaded state when source changes to ensure proper reload
      setIsLoaded(false);
      setIsFrozen(false);
      hasStartedPlayingRef.current = false;
      hasFiredFreezeRef.current = false;
      previousSourceRef.current = source;
    }
  }, [source]);

  // If Video component is not available, trigger error immediately
  useEffect(() => {
    if (!Video) {
      setHasError(true);
      if (onError) {
        onError();
      }
    }
  }, [onError]);

  const freezeNow = useCallback(() => {
    if (hasFiredFreezeRef.current) return;
    hasFiredFreezeRef.current = true;
    setIsFrozen(true);
    // Ensure we pause on the desired frame if possible.
    if (freezeAtSeconds != null) {
      const t = Math.max(0, freezeAtSeconds * 1000);
      videoRef.current?.setPositionAsync?.(t).catch(() => {});
    }
    videoRef.current?.pauseAsync?.().catch(() => {});
    onFreeze?.();
  }, [freezeAtSeconds, onFreeze]);

  // Handle custom looping logic, freezing, and errors
  const handlePlaybackStatusUpdate = useCallback((status: any) => {
    if (!status.isLoaded) {
      // Handle error state
      if (status.error) {
        setHasError(true);
        if (onError) {
          onError();
        }
      }
      return;
    }

    // Freeze based on actual playback position (deterministic; avoids wall-clock drift/buffering)
    if (
      freezeAtSeconds != null &&
      shouldPlay &&
      !isFrozen &&
      !hasFiredFreezeRef.current &&
      typeof status.positionMillis === "number" &&
      status.positionMillis >= freezeAtSeconds * 1000
    ) {
      freezeNow();
      return;
    }

    // Segment loop (3–30 etc.): loop when we reach loopToSeconds instead of waiting for didJustFinish.
    if (
      !isLooping &&
      !isFrozen &&
      shouldPlay &&
      loopToSeconds != null &&
      typeof status.positionMillis === "number" &&
      status.positionMillis >= loopToSeconds * 1000
    ) {
      videoRef.current?.setPositionAsync(loopFromSeconds * 1000).then(() => {
        videoRef.current?.playAsync().catch(() => {});
      }).catch(() => {
        videoRef.current?.playAsync().catch(() => {});
      });
      return;
    }

    // Handle custom looping (only when isLooping is false)
    // For native looping (isLooping=true), let the Video component handle it
    if (status.didJustFinish && !isLooping && !isFrozen && shouldPlay) {
      // Loop back to loopFromSeconds position
      videoRef.current?.setPositionAsync(loopFromSeconds * 1000).then(() => {
        videoRef.current?.playAsync().catch(() => {});
      }).catch(() => {
        videoRef.current?.playAsync().catch(() => {});
      });
    }
  }, [freezeAtSeconds, freezeNow, isLooping, isFrozen, loopFromSeconds, loopToSeconds, onError, shouldPlay]);

  // Handle play/pause
  useEffect(() => {
    if (!videoRef.current || !isLoaded) return;
    
    if (shouldPlay && !isFrozen) {
      // For native looping videos, just play - don't reset position
      if (isLooping) {
        videoRef.current.playAsync().catch(() => {});
      } else {
        // For custom looping videos, reset position only on first play
        if (!hasStartedPlayingRef.current) {
          const startMillis = Math.max(0, (startAtSeconds || 0) * 1000);
          videoRef.current.setPositionAsync(startMillis).then(() => {
            videoRef.current?.playAsync().catch(() => {});
          }).catch(() => {
            videoRef.current?.playAsync().catch(() => {});
          });
          hasStartedPlayingRef.current = true;
        } else {
          videoRef.current.playAsync().catch(() => {});
        }
      }
    } else {
      videoRef.current.pauseAsync().catch(() => {});
      
      // Reset state when stopping (but not when frozen)
      if (!shouldPlay && !isFrozen) {
        hasStartedPlayingRef.current = false;
        hasFiredFreezeRef.current = false;
      }
    }
  }, [shouldPlay, isLoaded, isFrozen, isLooping, startAtSeconds]);

  // If Video component is not available or error occurred, return empty view
  // Parent component should handle fallback
  if (!Video || hasError) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <Pressable 
        onPress={onSkip} 
        style={[StyleSheet.absoluteFill, { zIndex: 10 }]} 
        disabled={!onSkip}
      >
        <View style={StyleSheet.absoluteFill}>
          {/* Show still frame when frozen */}
          {isFrozen && stillFrameSource && (
            <Image
              source={stillFrameSource}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          )}
          {/* Video - hidden when frozen if still frame is provided */}
          <Video
            ref={videoRef}
            style={[StyleSheet.absoluteFill, isFrozen && stillFrameSource && { opacity: 0 }]}
            source={source}
            useNativeControls={false}
            resizeMode={finalResizeMode}
            isLooping={isLooping}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onLoad={() => {
              setIsLoaded(true);
              // Only reset frozen state if freezeAtSeconds is not set
              // If freezeAtSeconds is set and video was frozen, preserve the frozen state
              // This prevents unfreezing a video that should remain frozen after reload
              if (!freezeAtSeconds) {
                setIsFrozen(false);
              }
              hasFiredFreezeRef.current = false;
              // Notify parent that video is loaded, passing the source that just loaded
              // Don't position or play here - let the useEffect handle it to avoid race conditions
              // The useEffect will call setPositionAsync(0) and playAsync() when isLoaded becomes true
              onLoad?.(source);
            }}
            onError={() => {
              setHasError(true);
              if (onError) {
                onError();
              }
            }}
            shouldPlay={shouldPlay && !isFrozen}
            isMuted={isMuted}
            volume={isMuted ? 0.0 : volume}
          />
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000', // Black background to prevent any gaps
    width: '100%',
    height: '100%',
  },
});
