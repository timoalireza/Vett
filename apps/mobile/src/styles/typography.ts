/**
 * Typography System
 * 
 * Primary Typeface: Inter
 * Fallbacks: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
 * 
 * Font Weight Usage:
 * - Headlines/Titles: Inter_700Bold (700) or Inter_800ExtraBold (800)
 * - Subtitles/Supporting: Inter_500Medium (500) or Inter_400Regular (400)
 * - Body Text: Inter_400Regular (400)
 * - UI Labels/Metadata: Inter_500Medium (500)
 */

// Font family constants for consistent usage across the app
export const fonts = {
  // Headlines / Titles - Bold or ExtraBold
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
  
  // Subtitles / Supporting Text - Medium or Regular
  medium: 'Inter_500Medium',
  
  // Body Text - Regular
  regular: 'Inter_400Regular',
} as const;

// Typography presets for common use cases
export const typography = {
  // Headlines / Page Titles / Section Headers
  headline: {
    fontFamily: fonts.bold,
    fontSize: 32,
    lineHeight: 38, // ~1.2 ratio
    letterSpacing: -0.5,
  },
  
  // Large headlines for onboarding/splash
  display: {
    fontFamily: fonts.extraBold,
    fontSize: 42,
    lineHeight: 48, // ~1.14 ratio
    letterSpacing: -1,
  },
  
  // Section headers / Card titles
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 29, // ~1.2 ratio
    letterSpacing: -0.3,
  },
  
  // Subtitles / Supporting copy
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 18,
    lineHeight: 25, // ~1.4 ratio
  },
  
  // Body text / Paragraphs / General content
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24, // 1.5 ratio
  },
  
  // Smaller body text
  bodySmall: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20, // ~1.43 ratio
  },
  
  // UI Labels / Buttons / Navigation / Tabs
  label: {
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 20,
  },
  
  // Small UI labels / Metadata / Timestamps / Badges
  caption: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  
  // Very small annotations
  small: {
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 14,
  },
};
