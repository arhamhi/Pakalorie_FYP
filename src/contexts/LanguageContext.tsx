import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LanguageCode,
  LanguageConfig,
  TimeOfDay,
  UserDemographic,
  DynamicGreetings,
  Hydration,
  DashboardCards,
  Strings,
  LocalizedString,
  TimeRanges,
} from '../constants/language';

const LANGUAGE_KEY = '@pakalorie_language';
const USE_URDU_KEY = '@pakalorie_use_urdu';

interface LanguageContextType {
  // Current language setting
  language: LanguageCode;
  useUrdu: boolean;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  toggleUrdu: () => Promise<void>;
  
  // String getters
  t: (category: keyof typeof Strings, key: string) => string;
  tLocalized: (localizedString: LocalizedString) => string;
  
  // Dynamic greeting
  getDynamicGreeting: (
    name?: string,
    gender?: 'male' | 'female' | 'other' | null,
    age?: number | null
  ) => string;
  
  // Time of day
  getTimeOfDay: () => TimeOfDay;
  
  // Hydration feedback
  getHydrationFeedback: (glasses: number) => string;
  getHydrationLabel: () => string;
  
  // Dashboard cards
  getDashboardCardLabel: (card: keyof typeof DashboardCards) => string;
  
  // Time-based greeting (simple)
  getTimeGreeting: () => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * Determines the time of day based on current hour
 * Note: Night time wraps around midnight (21-4), so needs special handling
 */
const getTimeOfDayFromHour = (hour: number): TimeOfDay => {
  // Handle night wrap-around (21:00 - 04:00)
  if (hour >= TimeRanges.night.start || hour <= TimeRanges.night.end) {
    return 'night';
  } else if (hour >= TimeRanges.morning.start && hour <= TimeRanges.morning.end) {
    return 'morning';
  } else if (hour >= TimeRanges.afternoon.start && hour <= TimeRanges.afternoon.end) {
    return 'afternoon';
  } else if (hour >= TimeRanges.evening.start && hour <= TimeRanges.evening.end) {
    return 'evening';
  } else {
    return 'night'; // Fallback
  }
};

/**
 * Determines user demographic based on gender and age
 */
const getUserDemographic = (
  gender?: 'male' | 'female' | 'other' | null,
  age?: number | null
): UserDemographic => {
  if (!age) return 'general';
  
  if (age >= 55) {
    return 'senior';
  } else if (age >= 30 && age < 55) {
    return 'professional';
  } else if (age >= 13 && age < 30) {
    if (gender === 'male') return 'male_young';
    if (gender === 'female') return 'female_young';
  }
  
  return 'general';
};

/**
 * Deterministically selects whether to use Urdu based on a string key
 * This ensures that the same UI element always shows in the same language for a given session/probability
 */
const selectWithProbability = (key: string, useUrdu: boolean, urduProbability: number): boolean => {
  if (!useUrdu) return false;
  
  // Simple hash function to generate a deterministic number between 0 and 1 from the key
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  
  // Normalize to 0-1 range
  const normalized = Math.abs(hash) / 2147483647;
  return normalized < urduProbability;
};

/**
 * Replaces {name} placeholder with actual name
 * Handles edge cases where no name is provided to avoid awkward spacing
 */
const replacePlaceholders = (text: string, name?: string): string => {
  if (name) {
    return text.replace(/\{name\}/g, name);
  }
  // Remove {name} and any preceding comma+space or trailing space
  return text
    .replace(/,?\s*\{name\}/g, '')
    .replace(/\{name\}\s*/g, '')
    .replace(/\s+!/g, '!')
    .replace(/\s+\?/g, '?')
    .trim();
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>('en');
  const [useUrdu, setUseUrdu] = useState(true); // Default to mixed mode
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [savedLanguage, savedUseUrdu] = await Promise.all([
          AsyncStorage.getItem(LANGUAGE_KEY),
          AsyncStorage.getItem(USE_URDU_KEY),
        ]);

        if (savedLanguage) {
          setLanguageState(savedLanguage as LanguageCode);
        }

        if (savedUseUrdu !== null) {
          setUseUrdu(savedUseUrdu === 'true');
        }
      } catch (error) {
        console.error('Error loading language preferences:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadPreferences();
  }, []);

  const setLanguage = async (lang: LanguageCode) => {
    setLanguageState(lang);
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  };

  const toggleUrdu = async () => {
    const newValue = !useUrdu;
    setUseUrdu(newValue);
    await AsyncStorage.setItem(USE_URDU_KEY, newValue.toString());
  };

  /**
   * Get time of day
   */
  const getTimeOfDay = useCallback((): TimeOfDay => {
    const hour = new Date().getHours();
    return getTimeOfDayFromHour(hour);
  }, []);

  /**
   * Get a translated string from a category
   */
  const t = useCallback(
    (category: keyof typeof Strings, key: string): string => {
      const categoryStrings = Strings[category] as Record<string, LocalizedString | string>;
      const value = categoryStrings[key];
      
      if (!value) return key;
      
      if (typeof value === 'string') return value;
      
      const shouldUseUrdu = selectWithProbability(`${category}.${key}`, useUrdu, LanguageConfig.urdu_probability);
      return shouldUseUrdu ? value.ur : value.en;
    },
    [useUrdu]
  );

  /**
   * Get string from a LocalizedString object
   */
  const tLocalized = useCallback(
    (localizedString: LocalizedString): string => {
      // Use the English string as the seed key since it's unique enough for this purpose
      const shouldUseUrdu = selectWithProbability(localizedString.en, useUrdu, LanguageConfig.urdu_probability);
      return shouldUseUrdu ? localizedString.ur : localizedString.en;
    },
    [useUrdu]
  );

  /**
   * Get dynamic greeting based on time, demographics, and preferences
   */
  const getDynamicGreeting = useCallback(
    (
      name?: string,
      gender?: 'male' | 'female' | 'other' | null,
      age?: number | null
    ): string => {
      const timeOfDay = getTimeOfDay();
      const demographic = getUserDemographic(gender, age);
      
      // Get greetings for this time and demographic
      const greetingsForTime = DynamicGreetings[timeOfDay];
      let greetings = greetingsForTime[demographic];
      
      // Fallback to general if no specific demographic greetings
      if (!greetings || greetings.length === 0) {
        greetings = greetingsForTime.general;
      }
      
      // Pick a random greeting
      const randomIndex = Math.floor(Math.random() * greetings.length);
      const greeting = greetings[randomIndex];
      
      // Decide whether to use English or Urdu
      // Use greeting.en as key for stability
      const shouldUseUrdu = selectWithProbability(greeting.en, useUrdu, LanguageConfig.urdu_probability);
      const text = shouldUseUrdu ? greeting.ur : greeting.en;
      
      // Replace placeholders
      return replacePlaceholders(text, name);
    },
    [useUrdu, getTimeOfDay]
  );

  /**
   * Get simple time-based greeting
   */
  const getTimeGreeting = useCallback((): string => {
    const timeOfDay = getTimeOfDay();
    const greetingKey = timeOfDay as keyof typeof Strings.dashboard;
    const greeting = Strings.dashboard[greetingKey];
    
    if (typeof greeting === 'string') return greeting;
    
    const shouldUseUrdu = selectWithProbability(`greeting-${timeOfDay}`, useUrdu, LanguageConfig.urdu_probability);
    return shouldUseUrdu ? greeting.ur : greeting.en;
  }, [useUrdu, getTimeOfDay]);

  /**
   * Get hydration feedback based on glasses consumed
   */
  const getHydrationFeedback = useCallback(
    (glasses: number): string => {
      let feedback = Hydration.feedback[0];
      
      for (const fb of Hydration.feedback) {
        if (glasses >= fb.threshold) {
          feedback = fb;
        }
      }
      
      const shouldUseUrdu = selectWithProbability(`hydration-feedback-${glasses}`, useUrdu, LanguageConfig.urdu_probability);
      return shouldUseUrdu ? feedback.ur : feedback.en;
    },
    [useUrdu]
  );

  /**
   * Get hydration label
   */
  const getHydrationLabel = useCallback((): string => {
    const shouldUseUrdu = selectWithProbability('hydration-label', useUrdu, LanguageConfig.urdu_probability);
    return shouldUseUrdu ? Hydration.label.ur : Hydration.label.en;
  }, [useUrdu]);

  /**
   * Get dashboard card label
   */
  const getDashboardCardLabel = useCallback(
    (card: keyof typeof DashboardCards): string => {
      const cardLabel = DashboardCards[card];
      const shouldUseUrdu = selectWithProbability(`card-${card}`, useUrdu, LanguageConfig.urdu_probability);
      return shouldUseUrdu ? cardLabel.ur : cardLabel.en;
    },
    [useUrdu]
  );

  if (!isLoaded) {
    return null;
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        useUrdu,
        setLanguage,
        toggleUrdu,
        t,
        tLocalized,
        getDynamicGreeting,
        getTimeOfDay,
        getHydrationFeedback,
        getHydrationLabel,
        getDashboardCardLabel,
        getTimeGreeting,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Export types for external use
export type { TimeOfDay, UserDemographic, LocalizedString };
