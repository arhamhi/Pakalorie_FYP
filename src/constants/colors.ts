// Pakalorie Color System — Stitch design (stitch_pakalorie_fyp/calorie_tracking_app/DESIGN.md)
// 70/20/10: sage-tinted surfaces, near-black ink text, green reserved for
// health/save actions. Token STRUCTURE is frozen; only values change.

export const Colors = {
  light: {
    surface: {
      primary: '#F4FBF2',    // Page background — Stitch sage tint
      secondary: '#FFFFFF',   // Cards (float on the sage bg, no borders)
      tertiary: '#E9F0E7',    // Dividers, soft input fills
    },
    text: {
      primary: '#161D18',     // on-surface ink
      secondary: '#3D4A40',   // on-surface-variant
      tertiary: '#6D7A6F',    // outline / captions
    },
    // Light mode specific
    border: '#E3EAE1',        // Hairline of last resort; cards use shadows
    shadow: 'rgba(0, 0, 0, 0.05)', // Ambient elevation (4-6% per Stitch spec)
  },
  dark: {
    surface: {
      primary: '#121212',
      secondary: '#1E1E1E',
      tertiary: '#2A2A2A',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#E5E5E5',
      tertiary: '#A3A3A3',
    },
    border: '#2A2A2A',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
  accent: {
    // Keys are a live contract with profile.accent_preference — do not rename.
    green: '#1BAD66',
    gold: '#FFC107',
    coral: '#FF6B6B',
  },
  // Stitch additions (additive — no consumer breaks)
  ink: '#161D18',            // Solid-black pill buttons (Stitch primary)
  onAccent: '#FFFFFF',       // Text/icons on accent or ink fills
  accentDeep: '#006D3D',     // Active nav, focus states, insights banner
  system: {
    error: '#BA1A1A',
    warning: '#FF6B6B',      // Coral = warnings/over-limit per Stitch
    success: '#1BAD66',
  },
} as const;

/**
 * Elevation presets per the Stitch spec: large-blur, low-opacity ambient
 * shadows with Android `elevation` fallbacks (blur shadows don't exist
 * there — tonal contrast carries the hierarchy).
 */
export const Elevation = {
  /** Cards: soft natural lift (CSS ~0 4px 40px rgba(0,0,0,0.04)). */
  ambient: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
  /** Deep-green insights/streak banner glow. */
  banner: {
    shadowColor: '#006D3D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
} as const;

export type AccentColor = keyof typeof Colors.accent;
export type ThemeMode = 'light' | 'dark';

/**
 * Structural shape shared by `Colors.light` and `Colors.dark`. Use this for
 * anything that consumes a resolved theme palette (e.g. `useTheme().colors`)
 * so both palettes are assignable.
 */
export interface ThemeColors {
  surface: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  border: string;
  shadow: string;
}

export const getAccentColor = (accent: AccentColor): string => {
  return Colors.accent[accent] || Colors.accent.green;
};

export const getThemeColors = (theme: ThemeMode): ThemeColors => {
  return theme === 'dark' ? Colors.dark : Colors.light;
};
