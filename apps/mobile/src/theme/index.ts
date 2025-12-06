import { darkPalette } from "./dark";
import { lightPalette } from "./light";
import { colors } from "../styles/colors";

export type ThemeMode = "dark" | "light";

function createTheme(palette: typeof darkPalette) {
  // Use new colors for dark theme, fall back to palette for light (if we supported it, but we're going dark-only basically)
  // Actually, let's just map the new colors to the theme structure
  
  return {
    colors: {
      background: colors.void, // Pure black
      backgroundSecondary: colors.surface,
      backgroundTertiary: colors.border,
      text: colors.secondary, // #E5E5E5 (Off White)
      textSecondary: colors.muted, // #8A8A8A (Gray)
      textTertiary: colors.subtle,
      textMuted: colors.muted,
      subtitle: colors.secondary,
      card: colors.surface, // #0A0A0A
      surface: colors.surface,
      border: colors.border, // #1A1A1A
      borderLight: colors.border,
      borderHeavy: colors.border,
      primary: colors.brand,
      secondary: colors.brand,
      highlight: colors.brand, // #2EFAC0
      warning: colors.warning,
      danger: colors.danger,
      success: colors.success
    },
    spacing: (factor: number) => factor * 8,
    radii: {
      xs: 8,
      sm: 12,
      md: 16,
      lg: 20,
      xl: 24,
      pill: 999
    },
    typography: {
      heading: 32,
      subheading: 20,
      body: 16,
      caption: 13,
      small: 11,
      // Tight line spacing
      lineHeight: {
        tight: 1.2,
        normal: 1.4,
        relaxed: 1.6
      }
    },
    // Glass effects (keeping existing values for compatibility if used elsewhere, but new UI doesn't use glass much)
    glass: {
      blur: {
        light: 20,
        medium: 40,
        heavy: 60
      },
      opacity: {
        light: 0.08,
        medium: 0.12,
        heavy: 0.16
      }
    },
    // Shadows for depth
    shadows: {
      sm: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2
      },
      md: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 4
      },
      lg: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 8
      }
    }
  };
}

export const darkTheme = createTheme(darkPalette);
export const lightTheme = createTheme(lightPalette);

export type Theme = ReturnType<typeof createTheme>;

// Default export for backward compatibility
export const theme = darkTheme;
