import { darkPalette } from "./dark";
import { lightPalette } from "./light";

export type ThemeMode = "dark" | "light";

function createTheme(palette: typeof darkPalette) {
  return {
    colors: {
      background: palette.background,
      backgroundSecondary: palette.backgroundSecondary,
      backgroundTertiary: palette.backgroundTertiary,
      text: palette.textPrimary,
      textSecondary: palette.textSecondary,
      textTertiary: palette.textTertiary,
      textMuted: palette.textQuaternary,
      subtitle: palette.textSecondary,
      card: palette.glassLight,
      surface: palette.glassMedium,
      border: palette.border,
      borderLight: palette.borderLight,
      borderHeavy: palette.borderHeavy,
      primary: palette.accent.blue,
      secondary: palette.accent.purple,
      highlight: palette.accent.teal,
      warning: palette.warning,
      danger: palette.error,
      success: palette.success
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
    // Glass effects
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
