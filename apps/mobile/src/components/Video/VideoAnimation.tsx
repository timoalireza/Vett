import React, { useRef, useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Pressable, ViewStyle, StyleProp, Dimensions } from 'react-native';

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
  onLoad
}) => {
  const videoRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  // Default resize mode if available
  const defaultResizeMode = ResizeMode ? ResizeMode.COVER : undefined;
  const finalResizeMode = resizeMode || defaultResizeMode;
  
  // If Video component is not available, trigger error immediately
  useEffect(() => {
    if (!Video) {
      setHasError(true);
      if (onError) {
        onError();
      }
    }
  }, [onError]);

  // Handle custom looping logic and errors
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

    if (status.didJustFinish && !isLooping) {
      // Seek to loop start point and play
      videoRef.current?.setPositionAsync(loopFromSeconds * 1000);
      if (shouldPlay) {
        videoRef.current?.playAsync();
      }
    }
  }, [isLooping, loopFromSeconds, shouldPlay, onError]);

  useEffect(() => {
    if (shouldPlay) {
      videoRef.current?.playAsync();
    } else {
      videoRef.current?.pauseAsync();
    }
  }, [shouldPlay]);

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
          <Video
            ref={videoRef}
            style={StyleSheet.absoluteFill}
            source={source}
            useNativeControls={false}
            resizeMode={finalResizeMode}
            isLooping={isLooping}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onLoad={() => {
              setIsLoaded(true);
              // Ensure video plays immediately after loading
              if (shouldPlay) {
                videoRef.current?.playAsync();
              }
              // Notify parent that video is loaded, passing the source that just loaded
              onLoad?.(source);
            }}
            onError={() => {
              setHasError(true);
              if (onError) {
                onError();
              }
            }}
            shouldPlay={shouldPlay}
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
  },
});
