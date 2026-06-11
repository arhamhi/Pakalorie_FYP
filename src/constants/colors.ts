// Pakalorie Color System - 90-8-2 Rule
// 90% Monochromatic, 8% Accent, 2% Error

export const Colors = {
  light: {
    surface: {
      primary: '#F8F9FA',    // Slightly off-white for less harsh background
      secondary: '#FFFFFF',   // Pure white for cards (creates elevation)
      tertiary: '#E9ECEF',    // Subtle gray for borders, dividers
    },
    text: {
      primary: '#1A1A2E',     // Deep blue-black for better readability
      secondary: '#4A5568',   // Medium gray with good contrast
      tertiary: '#718096',    // Darker tertiary for legibility
    },
    // Light mode specific
    border: '#E2E8F0',        // Subtle border color for cards
    shadow: 'rgba(0, 0, 0, 0.08)', // Soft shadow for elevation
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
    green: '#1BAD66',
    gold: '#FFC107',
    coral: '#FF6B6B',
  },
  system: {
    error: '#D32F2F',
    warning: '#EF4444',
    success: '#1BAD66',
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
