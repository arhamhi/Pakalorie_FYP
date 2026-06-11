import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { Card } from '../../src/components/ui';
import { FadeInView } from '../../src/components/ui';
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  scheduleDailyMealReminders,
  scheduleHydrationReminders,
  scheduleStreakWarnings,
  cancelAllNotifications,
  NotificationPreferences,
} from '../../src/lib/notifications';

interface NotificationCategory {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  enabled: boolean;
  times?: string[];
}

export default function NotificationsScreen() {
  const { colors, accent } = useTheme();
  const { profile, user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scheduledCount, setScheduledCount] = useState(0);

  useEffect(() => {
    loadPreferences();
    loadScheduledNotifications();
  }, []);

  const loadPreferences = async () => {
    try {
      const preferences = await getNotificationPrefs();
      setPrefs(preferences);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadScheduledNotifications = async () => {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      setScheduledCount(scheduled.length);
    } catch (error) {
      console.error('Failed to load scheduled notifications:', error);
    }
  };

  const toggleCategory = async (category: string, value: boolean) => {
    if (!prefs) return;

    const newPrefs = { ...prefs, [category]: value };
    setPrefs(newPrefs);

    try {
      await saveNotificationPrefs(newPrefs);

      // Reschedule notifications based on new preferences
      await cancelAllNotifications();

      if (newPrefs.mealReminders) {
        await scheduleDailyMealReminders(profile);
      }
      if (newPrefs.hydrationReminders) {
        await scheduleHydrationReminders();
      }
      if (newPrefs.streakAlerts && user) {
        await scheduleStreakWarnings(user.id);
      }

      await loadScheduledNotifications();
    } catch (error) {
      console.error('Failed to update preferences:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const categories: NotificationCategory[] = [
    {
      id: 'mealReminders',
      title: 'Meal Reminders',
      description: 'Get reminded to log breakfast, lunch & dinner',
      icon: 'restaurant',
      color: accent,
      enabled: prefs?.mealReminders ?? true,
      times: ['8:30 AM', '12:30 PM', '7:00 PM'],
    },
    {
      id: 'hydrationReminders',
      title: 'Hydration Reminders',
      description: 'Stay on top of your water intake goals',
      icon: 'water-drop',
      color: '#4FC3F7',
      enabled: prefs?.hydrationReminders ?? true,
      times: ['10:00 AM', '12:30 PM', '3:00 PM', '5:30 PM', '8:00 PM'],
    },
    {
      id: 'streakAlerts',
      title: 'Streak Alerts',
      description: "Don't lose your logging streak",
      icon: 'local-fire-department',
      color: '#FF6B6B',
      enabled: prefs?.streakAlerts ?? true,
      times: ['9:00 PM', '11:00 PM'],
    },
    {
      id: 'achievementAlerts',
      title: 'Achievement Alerts',
      description: 'Celebrate your milestones',
      icon: 'emoji-events',
      color: '#FFC107',
      enabled: prefs?.achievementAlerts ?? true,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.primary }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 120 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_700Bold',
              fontSize: 24,
              color: colors.text.primary,
              marginLeft: 16,
            }}
          >
            Notifications
          </Text>
        </View>

        {/* Status Card */}
        <FadeInView delay={0}>
          <Card style={{ marginBottom: 20, alignItems: 'center' }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: accent + '20',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <MaterialIcons name="notifications-active" size={32} color={accent} />
            </View>
            <Text
              style={{
                fontFamily: 'IBMPlexMono_700Bold',
                fontSize: 28,
                color: colors.text.primary,
              }}
            >
              {scheduledCount}
            </Text>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: 14,
                color: colors.text.secondary,
                marginTop: 4,
              }}
            >
              Scheduled Notifications
            </Text>
          </Card>
        </FadeInView>

        {/* Categories */}
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_600SemiBold',
            fontSize: 18,
            color: colors.text.primary,
            marginBottom: 12,
          }}
        >
          Notification Settings
        </Text>

        {categories.map((category, index) => (
          <FadeInView key={category.id} delay={(index + 1) * 50}>
            <Card style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: category.color + '20',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}
                >
                  <MaterialIcons name={category.icon} size={22} color={category.color} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_600SemiBold',
                      fontSize: 16,
                      color: colors.text.primary,
                    }}
                  >
                    {category.title}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_400Regular',
                      fontSize: 13,
                      color: colors.text.secondary,
                      marginTop: 2,
                    }}
                  >
                    {category.description}
                  </Text>

                  {category.times && category.enabled && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {category.times.map((time) => (
                        <View
                          key={time}
                          style={{
                            backgroundColor: colors.surface.tertiary,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: 'IBMPlexMono_500Medium',
                              fontSize: 11,
                              color: colors.text.secondary,
                            }}
                          >
                            {time}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <Switch
                  value={category.enabled}
                  onValueChange={(value) => toggleCategory(category.id, value)}
                  trackColor={{ false: colors.surface.tertiary, true: category.color + '60' }}
                  thumbColor={category.enabled ? category.color : colors.text.tertiary}
                />
              </View>
            </Card>
          </FadeInView>
        ))}

        {/* Quiet Hours Info */}
        <FadeInView delay={250}>
          <Card style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="bedtime" size={20} color={colors.text.tertiary} />
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_400Regular',
                  fontSize: 13,
                  color: colors.text.tertiary,
                  marginLeft: 8,
                  flex: 1,
                }}
              >
                Quiet hours: 11:00 PM - 7:00 AM
              </Text>
            </View>
          </Card>
        </FadeInView>
      </ScrollView>
    </View>
  );
}
