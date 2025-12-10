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
  loopFromSeconds?: number;
  isLooping?: boolean; // If true, loops normally. If false, we handle custom loop logic.
  onError?: () => void;
  onLoad?: (loadedSource: any) => void; // Callback when video is loaded and ready, passes the source that loaded
  freezeAtSeconds?: number; // Freeze video at this time (in seconds) and show still frame
  stillFrameSource?: any; // Still image to show when frozen
  onFreeze?: () => void; // Callback when video freezes
}

export const VideoAnimation: React.FC<VideoAnimationProps> = ({
  source,
  onSkip,
  shouldPlay,
  style,
  resizeMode,
  loopFromSeconds = 5,
  isLooping = false,
  onError,
  onLoad,
  freezeAtSeconds,
  stillFrameSource,
  onFreeze
}) => {
  const videoRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const previousSourceRef = useRef<any>(null);
  const hasStartedPlayingRef = useRef(false);
  const freezeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const totalPlaybackTimeRef = useRef<number>(0); // Track cumulative playback time for freeze logic
  const lastPositionRef = useRef<number>(0); // Track last position to detect loops
  const isFirstPlayRef = useRef<boolean>(true); // Track if this is the first play to correctly calculate cumulative time
  
  // Default resize mode if available
  const defaultResizeMode = ResizeMode ? ResizeMode.COVER : undefined;
  const finalResizeMode = resizeMode || defaultResizeMode;

  // Reset video position when source changes
  useEffect(() => {
    if (source !== previousSourceRef.current) {
      // Reset loaded state when source changes to ensure proper reload
      setIsLoaded(false);
      setIsFrozen(false);
      hasStartedPlayingRef.current = false;
      // Reset cumulative playback tracking when source changes
      totalPlaybackTimeRef.current = 0;
      lastPositionRef.current = 0;
      isFirstPlayRef.current = true;
      // Clear any pending freeze timeout
      if (freezeTimeoutRef.current) {
        clearTimeout(freezeTimeoutRef.current);
        freezeTimeoutRef.current = null;
      }
      // Reset video to beginning when switching to new video (if ref exists)
      if (videoRef.current) {
        videoRef.current.setPositionAsync(0).catch(() => {
          // Ignore errors when resetting video position on source change
        });
      }
      previousSourceRef.current = source;
    }
  }, [source]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (freezeTimeoutRef.current) {
        clearTimeout(freezeTimeoutRef.current);
      }
    };
  }, []);
  
  // If Video component is not available, trigger error immediately
  useEffect(() => {
    if (!Video) {
      setHasError(true);
      if (onError) {
        onError();
      }
    }
  }, [onError]);

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

    // Only track cumulative playback time if freezeAtSeconds is set
    // This prevents unnecessary calculations for videos that don't need freezing (like loading)
    if (freezeAtSeconds) {
      const currentPosition = status.positionMillis;
      const videoDuration = status.durationMillis || 0;
      
      // Detect if video looped back (position decreased significantly)
      const hasLooped = currentPosition < lastPositionRef.current - 1000 && lastPositionRef.current > 0;
      if (hasLooped) {
        // Video looped back - calculate how much time was played in the previous segment
        if (isFirstPlayRef.current) {
          // First play completed (0 to end) - add full duration
          totalPlaybackTimeRef.current += videoDuration;
          isFirstPlayRef.current = false; // Mark that first play is complete
        } else {
          // Subsequent loop completed (loopFromSeconds to end) - add duration minus loop start
          totalPlaybackTimeRef.current += videoDuration - (loopFromSeconds * 1000);
        }
      }
      lastPositionRef.current = currentPosition;
      
      // Calculate total cumulative playback time
      // This tracks total elapsed time from the start of playback
      let totalTime: number;
      if (hasLooped || totalPlaybackTimeRef.current > 0) {
        // Video has looped at least once - use cumulative tracking
        if (currentPosition >= loopFromSeconds * 1000) {
          // We're in a loop segment - add time from loop start point
          totalTime = totalPlaybackTimeRef.current + (currentPosition - (loopFromSeconds * 1000));
        } else {
          // This shouldn't happen after looping, but handle it just in case
          totalTime = totalPlaybackTimeRef.current + currentPosition;
        }
      } else {
        // First play - use current position directly
        totalTime = currentPosition;
      }

      // Check if we should freeze at freezeAtSeconds based on cumulative playback time
      // Only freeze if we haven't already frozen and total time has reached the freeze point
      if (!isFrozen && totalTime >= freezeAtSeconds * 1000) {
        // Pause the video and freeze it
        videoRef.current?.pauseAsync();
        setIsFrozen(true);
        if (onFreeze) {
          onFreeze();
        }
        return;
      }
    }

    // Handle looping logic (only if not frozen and not looping normally)
    // When freezeAtSeconds is set, we should loop until we reach the freeze point during playback
    if (status.didJustFinish && !isLooping && !isFrozen) {
      // Always loop normally - don't freeze early based on video duration
      // The freeze will happen naturally when total playback time reaches freezeAtSeconds
      videoRef.current?.setPositionAsync(loopFromSeconds * 1000);
      if (shouldPlay) {
        videoRef.current?.playAsync();
      }
    }
  }, [isLooping, loopFromSeconds, shouldPlay, onError, freezeAtSeconds, isFrozen, onFreeze]);

  useEffect(() => {
    if (shouldPlay && isLoaded && !isFrozen) {
      // ALWAYS reset to position 0 when video becomes active to ensure consistent starting frame
      // This prevents jitter from videos starting at different positions
      // Use a small delay to ensure position is set before playing
      const resetAndPlay = async () => {
        try {
          await videoRef.current?.setPositionAsync(0);
          // Reset cumulative playback tracking when starting fresh
          totalPlaybackTimeRef.current = 0;
          lastPositionRef.current = 0;
          isFirstPlayRef.current = true;
          // Only unfreeze if freezeAtSeconds is not set - if it's set, we want to respect the freeze state
          if (!freezeAtSeconds) {
            setIsFrozen(false);
          }
          // Small delay to ensure position is set
          await new Promise(resolve => setTimeout(resolve, 16)); // ~1 frame at 60fps
          await videoRef.current?.playAsync();
        } catch (error) {
          // If setPositionAsync fails, try playing anyway
          videoRef.current?.playAsync().catch(() => {
            // Ignore play errors
          });
        }
      };
      resetAndPlay();
      hasStartedPlayingRef.current = true;
    } else if (!shouldPlay || isFrozen) {
      videoRef.current?.pauseAsync();
      // Reset position to 0 when paused to ensure it's ready for next activation
      // This ensures videos always start from the same frame
      // Only unfreeze if freezeAtSeconds is not set - if it's set, preserve the freeze state
      if (!shouldPlay && isLoaded && !freezeAtSeconds) {
        videoRef.current?.setPositionAsync(0).catch(() => {
          // Ignore errors when resetting paused video position
        });
        setIsFrozen(false);
        // Reset cumulative playback tracking when stopping
        totalPlaybackTimeRef.current = 0;
        lastPositionRef.current = 0;
        isFirstPlayRef.current = true;
      }
      // Reset the flag when video stops so it starts from beginning next time
      if (!shouldPlay) {
        hasStartedPlayingRef.current = false;
      }
    }
  }, [shouldPlay, isLoaded, isFrozen, freezeAtSeconds]);

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
