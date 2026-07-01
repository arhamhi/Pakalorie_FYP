import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, AccentColor, ThemeMode, ThemeColors, getThemeColors } from '../constants/colors';

interface ThemeContextType {
  theme: ThemeMode;
  accentColor: AccentColor;
  colors: ThemeColors;
  accent: string;
  /** Darker shade of the selected accent for active nav / focus text+icons —
   * the raw accent (esp. gold/coral) lacks contrast on white surfaces. */
  accentDeep: string;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setAccentColor: (color: AccentColor) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

// Same hue as each accent, lightness dropped for contrast on white cards.
const ACCENT_DEEP: Record<AccentColor, string> = {
  green: Colors.accentDeep, // #006D3D — the designed Stitch deep green
  gold: '#8A6D00',
  coral: '#C6403F',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = '@pakalorie_theme';
const ACCENT_KEY = '@pakalorie_accent';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [accentColor, setAccentColorState] = useState<AccentColor>('green');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [savedTheme, savedAccent] = await Promise.all([
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(ACCENT_KEY),
        ]);

        if (savedTheme) {
          setThemeState(savedTheme as ThemeMode);
        } else {
          // Light mode only for P1 (docs/DESIGN.md); dark polish is deferred
          setThemeState('light');
        }

        if (savedAccent) {
          setAccentColorState(savedAccent as AccentColor);
        }
      } catch (error) {
        console.error('Error loading theme preferences:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadPreferences();
  }, []);

  const setTheme = async (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    await AsyncStorage.setItem(THEME_KEY, newTheme);
  };

  const setAccentColor = async (color: AccentColor) => {
    setAccentColorState(color);
    await AsyncStorage.setItem(ACCENT_KEY, color);
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    await setTheme(newTheme);
  };

  const colors = getThemeColors(theme);
  const accent = Colors.accent[accentColor];
  const accentDeep = ACCENT_DEEP[accentColor] || Colors.accentDeep;

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        accentColor,
        colors,
        accent,
        accentDeep,
        setTheme,
        setAccentColor,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
