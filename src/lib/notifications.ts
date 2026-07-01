// Pakalorie Notification Service
// Handles scheduling, permissions, and notification delivery

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasFoodLogsOnDay } from './db';
import { todayKey } from './analytics';
import { Profile } from '../types/database';
import {
  MEAL_REMINDERS,
  MISSED_MEAL_MESSAGES,
  STREAK_WARNING_9PM,
  STREAK_WARNING_11PM,
  STREAK_BROKEN_MESSAGES,
  HYDRATION_REMINDERS,
  GOAL_MESSAGES,
  getRandomMessage,
  getGenderAgeGreeting,
  getStreakMilestoneMessage,
  getComebackMessage,
  getCurrentMealType,
  MealType,
  NotificationMessage,
} from '../constants/notifications';

// ============================================================================
// CONFIGURATION
// ============================================================================
// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Notification channel IDs (for Android categorization)
export const NOTIFICATION_CHANNELS = {
  MEAL_REMINDERS: 'meal-reminders',
  STREAK_ALERTS: 'streak-alerts',
  HYDRATION: 'hydration',
  ACHIEVEMENTS: 'achievements',
} as const;

// Storage keys
const STORAGE_KEYS = {
  NOTIFICATION_PREFS: 'pakalorie_notification_prefs',
  LAST_ACTIVE_DATE: 'pakalorie_last_active_date',
  SCHEDULED_IDS: 'pakalorie_scheduled_notification_ids',
};

// ============================================================================
// TYPES
// ============================================================================

export interface NotificationPreferences {
  enabled: boolean;
  mealReminders: boolean;
  streakAlerts: boolean;
  hydrationReminders: boolean;
  achievementAlerts: boolean;
  weeklyDigest: boolean;
  quietHoursStart: number; // 0-23, e.g., 22 = 10 PM
  quietHoursEnd: number;   // 0-23, e.g., 7 = 7 AM
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  enabled: true,
  mealReminders: true,
  streakAlerts: true,
  hydrationReminders: true,
  achievementAlerts: true,
  weeklyDigest: true,
  quietHoursStart: 23, // 11 PM
  quietHoursEnd: 7,    // 7 AM
};

// ============================================================================
// PERMISSIONS
// ============================================================================

/**
 * Request notification permissions from user
 * Returns true if permissions granted
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  // Check if physical device (required for push notifications)
  if (!Device.isDevice) {
    console.log('Notifications require a physical device');
    return false;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  
  if (existingStatus === 'granted') {
    return true;
  }

  // Request permissions
  const { status } = await Notifications.requestPermissionsAsync();
  
  if (status !== 'granted') {
    console.log('Notification permissions not granted');
    return false;
  }

  // Set up Android notification channel
  if (Platform.OS === 'android') {
    await setupAndroidChannels();
  }

  return true;
}

/**
 * Set up Android notification channels for categorization
 */
async function setupAndroidChannels(): Promise<void> {
  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.MEAL_REMINDERS, {
    name: 'Meal Reminders',
    description: 'Reminders to log your meals',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1BAD66',
  });

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.STREAK_ALERTS, {
    name: 'Streak Alerts',
    description: 'Warnings about your logging streak',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 250, 500],
    lightColor: '#EF4444',
  });

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.HYDRATION, {
    name: 'Hydration Reminders',
    description: 'Reminders to drink water',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#3B82F6',
  });

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.ACHIEVEMENTS, {
    name: 'Achievements',
    description: 'Celebration notifications for milestones',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#F59E0B',
  });
}

// ============================================================================
// PREFERENCES MANAGEMENT
// ============================================================================

/**
 * Get notification preferences from storage
 */
export async function getNotificationPrefs(): Promise<NotificationPreferences> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_PREFS);
    if (stored) {
      return { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Error reading notification prefs:', error);
  }
  return DEFAULT_NOTIFICATION_PREFS;
}

/**
 * Save notification preferences to storage
 */
export async function saveNotificationPrefs(prefs: Partial<NotificationPreferences>): Promise<void> {
  try {
    const current = await getNotificationPrefs();
    const updated = { ...current, ...prefs };
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_PREFS, JSON.stringify(updated));
    
    // Reschedule notifications based on new preferences
    await rescheduleAllNotifications();
  } catch (error) {
    console.error('Error saving notification prefs:', error);
  }
}

// ============================================================================
// CORE SCHEDULING FUNCTIONS
// ============================================================================

/**
 * Schedule a local notification
 */
export async function scheduleNotification(
  content: NotificationMessage,
  trigger: Notifications.NotificationTriggerInput,
  channelId: string = NOTIFICATION_CHANNELS.MEAL_REMINDERS
): Promise<string | null> {
  try {
    const prefs = await getNotificationPrefs();
    if (!prefs.enabled) return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === 'android' && { channelId }),
      },
      trigger,
    });

    // Store notification ID for later management
    await storeScheduledId(id);
    
    return id;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.removeItem(STORAGE_KEYS.SCHEDULED_IDS);
}

/**
 * Store scheduled notification ID
 */
async function storeScheduledId(id: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULED_IDS);
    const ids: string[] = stored ? JSON.parse(stored) : [];
    ids.push(id);
    await AsyncStorage.setItem(STORAGE_KEYS.SCHEDULED_IDS, JSON.stringify(ids));
  } catch (error) {
    console.error('Error storing notification ID:', error);
  }
}

// ============================================================================
// SMART SCHEDULING - MEAL REMINDERS
// ============================================================================

/**
 * Schedule daily meal reminders
 * Call this on app start and when preferences change
 */
export async function scheduleDailyMealReminders(profile: Profile | null): Promise<void> {
  const prefs = await getNotificationPrefs();
  if (!prefs.enabled || !prefs.mealReminders) return;

  const greeting = getGenderAgeGreeting(profile);

  // Breakfast reminder - 8:30 AM
  const breakfastMsg = getRandomMessage(MEAL_REMINDERS.breakfast);
  await scheduleNotification(
    { ...breakfastMsg, body: breakfastMsg.body.replace('{name}', greeting) },
    {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 30,
    },
    NOTIFICATION_CHANNELS.MEAL_REMINDERS
  );

  // Lunch reminder - 12:30 PM
  const lunchMsg = getRandomMessage(MEAL_REMINDERS.lunch);
  await scheduleNotification(
    { ...lunchMsg, body: lunchMsg.body.replace('{name}', greeting) },
    {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 12,
      minute: 30,
    },
    NOTIFICATION_CHANNELS.MEAL_REMINDERS
  );

  // Dinner reminder - 7:00 PM
  const dinnerMsg = getRandomMessage(MEAL_REMINDERS.dinner);
  await scheduleNotification(
    { ...dinnerMsg, body: dinnerMsg.body.replace('{name}', greeting) },
    {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 19,
      minute: 0,
    },
    NOTIFICATION_CHANNELS.MEAL_REMINDERS
  );
}

// ============================================================================
// SMART SCHEDULING - STREAK ALERTS
// ============================================================================

/**
 * Check if user has logged any meals today
 */
export async function hasLoggedMealsToday(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    return await hasFoodLogsOnDay(userId, todayKey());
  } catch (error) {
    console.warn('[notifications] meal check failed:', error);
    return false;
  }
}

/**
 * Schedule streak warning notifications
 * Only schedules if user hasn't logged anything today
 */
export async function scheduleStreakWarnings(userId?: string): Promise<void> {
  const prefs = await getNotificationPrefs();
  if (!prefs.enabled || !prefs.streakAlerts) return;

  // If userId provided, check if already logged
  if (userId) {
    const hasLogged = await hasLoggedMealsToday(userId);
    if (hasLogged) {
      console.log('Skipping streak warnings - meals already logged today');
      return;
    }
  }

  // 9 PM warning
  const warning9pm = getRandomMessage(STREAK_WARNING_9PM);
  await scheduleNotification(
    warning9pm,
    {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 0,
    },
    NOTIFICATION_CHANNELS.STREAK_ALERTS
  );

  // 11 PM final warning (user requested)
  const warning11pm = getRandomMessage(STREAK_WARNING_11PM);
  await scheduleNotification(
    warning11pm,
    {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 23,
      minute: 0,
    },
    NOTIFICATION_CHANNELS.STREAK_ALERTS
  );
}

/**
 * Cancel streak warning notifications (call when a meal is logged)
 */
export async function cancelStreakWarnings(): Promise<void> {
  if (Platform.OS === 'android') {
    // On Android we can target by channel
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_CHANNELS.STREAK_ALERTS);
  } else {
    // On iOS we need to track IDs or cancel all and reschedule others
    // For now, simple no-op on iOS or rudimentary handling
  }
}

// ============================================================================
// SMART SCHEDULING - HYDRATION
// ============================================================================

/**
 * Schedule hydration reminders throughout the day
 * Every 2.5 hours from 8 AM to 10 PM
 */
export async function scheduleHydrationReminders(): Promise<void> {
  const prefs = await getNotificationPrefs();
  if (!prefs.enabled || !prefs.hydrationReminders) return;

  const hydrationTimes = [
    { hour: 10, minute: 0 },  // 10 AM
    { hour: 12, minute: 30 }, // 12:30 PM
    { hour: 15, minute: 0 },  // 3 PM
    { hour: 17, minute: 30 }, // 5:30 PM
    { hour: 20, minute: 0 },  // 8 PM
  ];

  for (const time of hydrationTimes) {
    const msg = getRandomMessage(HYDRATION_REMINDERS);
    await scheduleNotification(
      msg,
      {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: time.hour,
        minute: time.minute,
      },
      NOTIFICATION_CHANNELS.HYDRATION
    );
  }
}

// ============================================================================
// IMMEDIATE NOTIFICATIONS (For specific events)
// ============================================================================

/**
 * Send immediate streak milestone celebration
 */
export async function sendStreakMilestoneNotification(streakCount: number): Promise<void> {
  const milestone = getStreakMilestoneMessage(streakCount);
  if (milestone) {
    await scheduleNotification(
      milestone,
      { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1 },
      NOTIFICATION_CHANNELS.ACHIEVEMENTS
    );
  }
}

/**
 * Send immediate streak broken notification
 */
export async function sendStreakBrokenNotification(): Promise<void> {
  const msg = getRandomMessage(STREAK_BROKEN_MESSAGES);
  await scheduleNotification(
    msg,
    { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1 },
    NOTIFICATION_CHANNELS.STREAK_ALERTS
  );
}

/**
 * Send welcome back notification for returning users
 */
export async function sendComebackNotification(daysAway: number): Promise<void> {
  const msg = getComebackMessage(daysAway);
  if (msg) {
    await scheduleNotification(
      msg,
      { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1 },
      NOTIFICATION_CHANNELS.ACHIEVEMENTS
    );
  }
}

/**
 * Send goal-specific motivation
 */
export async function sendGoalMotivation(goalType: 'lose' | 'maintain' | 'gain'): Promise<void> {
  const msg = getRandomMessage(GOAL_MESSAGES[goalType]);
  await scheduleNotification(
    msg,
    { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1 },
    NOTIFICATION_CHANNELS.MEAL_REMINDERS
  );
}

// ============================================================================
// MISSED MEAL DETECTION (Call this when checking if meal was logged)
// ============================================================================

/**
 * Schedule a missed meal notification
 * Call this 2 hours after meal time if no log detected
 */
export async function scheduleMissedMealNotification(mealType: MealType): Promise<void> {
  const prefs = await getNotificationPrefs();
  if (!prefs.enabled || !prefs.mealReminders) return;

  const msg = getRandomMessage(MISSED_MEAL_MESSAGES[mealType]);
  
  // Send in 5 minutes (gives buffer time)
  await scheduleNotification(
    msg,
    { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 300 },
    NOTIFICATION_CHANNELS.MEAL_REMINDERS
  );
}

// ============================================================================
// MASTER SCHEDULING
// ============================================================================

/**
 * Reschedule all notifications
 * Call on app start and when preferences change
 */
export async function rescheduleAllNotifications(profile: Profile | null = null): Promise<void> {
  // Cancel existing
  await cancelAllNotifications();

  const prefs = await getNotificationPrefs();
  if (!prefs.enabled) return;

  // Schedule all notification types
  await scheduleDailyMealReminders(profile);
  await scheduleStreakWarnings(profile?.id);
  await scheduleHydrationReminders();

  console.log('All notifications rescheduled');
}

// ============================================================================
// NOTIFICATION RESPONSE HANDLERS
// ============================================================================

/**
 * Set up notification response listener
 * Call this in app root
 */
export function setupNotificationResponseHandler(
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationResponse: (response: Notifications.NotificationResponse) => void
): () => void {
  // When notification is received while app is open
  const receivedSubscription = Notifications.addNotificationReceivedListener(onNotificationReceived);

  // When user taps on notification
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);

  // Return cleanup function
  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

// ============================================================================
// LAST ACTIVE TRACKING (For comeback detection)
// ============================================================================

/**
 * Update last active date
 */
export async function updateLastActiveDate(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_DATE, new Date().toISOString());
}

/**
 * Get days since last active
 */
export async function getDaysSinceLastActive(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.LAST_ACTIVE_DATE);
    if (!stored) return 0;
    
    const lastActive = new Date(stored);
    const now = new Date();
    const diffMs = now.getTime() - lastActive.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

// ============================================================================
// DEBUG / TESTING
// ============================================================================

/**
 * Send a test notification immediately (for debugging)
 */
export async function sendTestNotification(): Promise<string | null> {
  const testMessage: NotificationMessage = {
    title: 'Test Notification 🔔',
    body: 'Agar yeh dikhai de raha hai, notifications kaam kar rahe hain!',
    tone: 'celebratory',
  };

  return scheduleNotification(
    testMessage,
    { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
    NOTIFICATION_CHANNELS.MEAL_REMINDERS
  );
}

/**
 * Get all scheduled notifications (for debugging)
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return Notifications.getAllScheduledNotificationsAsync();
}
