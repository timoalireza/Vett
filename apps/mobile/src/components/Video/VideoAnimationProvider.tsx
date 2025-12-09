import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, LayoutRectangle } from 'react-native';
import { VideoAnimation } from './VideoAnimation';
import Animated, { useSharedValue, withTiming, Easing, runOnJS } from 'react-native-reanimated';

type VideoSource = any;

interface VideoAnimationContextType {
  playVideo: (source: VideoSource, loopFromSeconds?: number) => void;
  stopVideo: () => void;
  registerVideoContainer: (layout: LayoutRectangle) => void; // For positioning if we go that route
  registerVideo: (videoKey: string) => void;
  currentVideo: string | null;
}

const VideoAnimationContext = createContext<VideoAnimationContextType | undefined>(undefined);

export const useVideoAnimation = () => {
  const context = useContext(VideoAnimationContext);
  if (!context) {
    throw new Error('useVideoAnimation must be used within a VideoAnimationProvider');
  }
  return context;
};

// Also export as useVideoAnimationState to match usage
export const useVideoAnimationState = useVideoAnimation;

export const VideoAnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);
  
  const playVideo = useCallback((source: VideoSource, loopFromSeconds = 5) => {
    // Logic to sync playback could go here
  }, []);

  const stopVideo = useCallback(() => {
    setCurrentVideo(null);
  }, []);

  const registerVideoContainer = useCallback((layout: LayoutRectangle) => {
    // Placeholder for shared element positioning
  }, []);

  const registerVideo = useCallback((videoKey: string) => {
    setCurrentVideo(videoKey);
  }, []);

  return (
    <VideoAnimationContext.Provider value={{ playVideo, stopVideo, registerVideoContainer, registerVideo, currentVideo }}>
      {children}
    </VideoAnimationContext.Provider>
  );
};
