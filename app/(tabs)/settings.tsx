import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Switch, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { Card, Button } from '../../src/components/ui';
import { Colors, AccentColor, ThemeColors } from '../../src/constants/colors';
import { calculateDailyTarget } from '../../src/constants/nutrition';
import { getHydrationGoal, setHydrationGoal, HYDRATION_DEFAULT_GOAL } from '../../src/lib/preferences';
import * as Haptics from 'expo-haptics';
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  sendTestNotification,
  NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFS,
} from '../../src/lib/notifications';

const ACCENT_COLORS: { value: AccentColor; label: string; color: string }[] = [
  { value: 'green', label: 'Green', color: Colors.accent.green },
  { value: 'gold', label: 'Gold', color: Colors.accent.gold },
  { value: 'coral', label: 'Coral', color: Colors.accent.coral },
];

// Minimum hydration goal - shared constant to ensure consistency with water.tsx
export const HYDRATION_MIN_GOAL = 4;

export default function SettingsScreen() {
  const { colors, accent, theme, accentColor, setAccentColor, toggleTheme } = useTheme();
  const { profile, user, updateProfile, signOut } = useAuth();
  const { useUrdu, toggleUrdu } = useLanguage();

  const [weight, setWeight] = useState<string>(profile?.current_weight_kg?.toString() || '');
  const [height, setHeight] = useState<string>(profile?.height_cm?.toString() || '');
  const [goalType, setGoalType] = useState<string>(profile?.goal_type || 'maintain');
  const [activityLevel, setActivityLevel] = useState<string>(
    profile?.activity_level ? profile.activity_level.toString() : '1.375'
  );
  const [hydrationGoal, setHydrationGoalState] = useState<number>(HYDRATION_DEFAULT_GOAL);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFS);

  useEffect(() => {
    getNotificationPrefs().then(setNotifPrefs);
  }, []);

  useEffect(() => {
    getHydrationGoal().then(setHydrationGoalState);
  }, []);

  const handleAccentChange = async (newAccent: AccentColor) => {
    await setAccentColor(newAccent);
    if (user) {
      await updateProfile({ accent_preference: newAccent });
    }
  };

  const handleThemeChange = async () => {
    // Compute the intended new theme BEFORE toggling to avoid race condition
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    try {
      await toggleTheme();
      if (user) {
        await updateProfile({ theme_preference: newTheme });
      }
    } catch (error) {
      console.error('Failed to change theme:', error);
    }
  };

  const handleNotifToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    await saveNotificationPrefs({ [key]: value });
  };

  const handleTestNotification = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const id = await sendTestNotification();
    if (id) {
      Alert.alert(
        'Test Sent! 🔔',
        'Check your notification center in a few seconds.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Notifications Disabled',
        'Please enable notifications in your device settings first.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSaveMetrics = async () => {
    if (!user) return;
    const weightNum = Number(weight);
    const heightNum = Number(height);
    const activityNum = Number(activityLevel);

    if (!Number.isFinite(weightNum) || !Number.isFinite(heightNum)) {
      Alert.alert('Invalid numbers', 'Please provide valid height and weight.');
      return;
    }

    const age = profile?.dob ? Math.floor((Date.now() - new Date(profile.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : 28;
    const dailyTarget = calculateDailyTarget(
      weightNum,
      heightNum,
      age,
      (profile?.gender as any) || 'male',
      activityNum,
      goalType as any
    );

    try {
      await updateProfile({
        current_weight_kg: weightNum,
        height_cm: heightNum,
        goal_type: goalType as any,
        activity_level: activityNum,
        daily_target_kcal: dailyTarget,
      });
      Alert.alert('Updated', 'Targets recalculated with your new stats.');
    } catch (error: any) {
      Alert.alert('Update failed', error?.message || 'Could not update metrics right now.');
    }
  };

  const handleHydrationGoalChange = async (value: string) => {
    const parsed = Math.max(HYDRATION_MIN_GOAL, Math.round(Number(value) || HYDRATION_DEFAULT_GOAL));
    setHydrationGoalState(parsed);
    await setHydrationGoal(parsed);
  };

  const handleExport = () => {
    Alert.alert('Coming soon', 'CSV/JSON export will be enabled once storage is wired in this build.');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      await AsyncStorage.removeItem('@pakalorie_onboarding_complete');
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

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
            Settings
          </Text>
        </View>

        {/* Notifications */}
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_600SemiBold',
            fontSize: 14,
            color: colors.text.tertiary,
            marginBottom: 12,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Notifications
        </Text>
        <Card style={{ marginBottom: 24 }}>
          {/* Master Toggle */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="notifications-active" size={22} color={colors.text.secondary} />
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_500Medium',
                  fontSize: 16,
                  color: colors.text.primary,
                  marginLeft: 12,
                }}
              >
                Enable Notifications
              </Text>
            </View>
            <Switch
              value={notifPrefs.enabled}
              onValueChange={(val) => handleNotifToggle('enabled', val)}
              trackColor={{ false: colors.surface.tertiary, true: accent }}
              thumbColor="#fff"
            />
          </View>

          {/* Meal Reminders */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 12,
              opacity: notifPrefs.enabled ? 1 : 0.5,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="restaurant" size={22} color={colors.text.secondary} />
              <View style={{ marginLeft: 12 }}>
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_500Medium',
                    fontSize: 16,
                    color: colors.text.primary,
                  }}
                >
                  Meal Reminders
                </Text>
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_400Regular',
                    fontSize: 12,
                    color: colors.text.tertiary,
                  }}
                >
                  Breakfast, Lunch, Dinner
                </Text>
              </View>
            </View>
            <Switch
              value={notifPrefs.mealReminders}
              onValueChange={(val) => handleNotifToggle('mealReminders', val)}
              disabled={!notifPrefs.enabled}
              trackColor={{ false: colors.surface.tertiary, true: accent }}
              thumbColor="#fff"
            />
          </View>

          {/* Streak Alerts */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 12,
              opacity: notifPrefs.enabled ? 1 : 0.5,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="local-fire-department" size={22} color={colors.text.secondary} />
              <View style={{ marginLeft: 12 }}>
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_500Medium',
                    fontSize: 16,
                    color: colors.text.primary,
                  }}
                >
                  Streak Alerts
                </Text>
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_400Regular',
                    fontSize: 12,
                    color: colors.text.tertiary,
                  }}
                >
                  Guilt trips included 😈
                </Text>
              </View>
            </View>
            <Switch
              value={notifPrefs.streakAlerts}
              onValueChange={(val) => handleNotifToggle('streakAlerts', val)}
              disabled={!notifPrefs.enabled}
              trackColor={{ false: colors.surface.tertiary, true: accent }}
              thumbColor="#fff"
            />
          </View>

          {/* Test Button */}
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.surface.tertiary,
              marginTop: 12,
              paddingTop: 12,
            }}
          >
            <TouchableOpacity
              onPress={handleTestNotification}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 8,
              }}
            >
              <MaterialIcons name="send" size={18} color={accent} />
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontSize: 14,
                  color: accent,
                  marginLeft: 8,
                }}
              >
                Send Test Notification
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Appearance */}
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_600SemiBold',
            fontSize: 14,
            color: colors.text.tertiary,
            marginBottom: 12,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Appearance
        </Text>
        <Card style={{ marginBottom: 24 }}>
          {/* Dark mode toggle removed for P1: dark tokens exist but the dark
              UI is unpolished (docs/DESIGN.md defers it). handleThemeChange
              stays wired for when the toggle returns. */}
          {/* Accent Color */}
          <View style={{ paddingVertical: 12 }}>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_500Medium',
                fontSize: 16,
                color: colors.text.primary,
                marginBottom: 12,
              }}
            >
              Accent Color
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {ACCENT_COLORS.map((ac) => (
                <TouchableOpacity
                  key={ac.value}
                  onPress={() => handleAccentChange(ac.value)}
                  style={{
                    flex: 1,
                    paddingVertical: 16,
                    borderRadius: 12,
                    backgroundColor: ac.color + '20',
                    borderWidth: 2,
                    borderColor: accentColor === ac.value ? ac.color : 'transparent',
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: ac.color,
                      marginBottom: 8,
                    }}
                  />
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_500Medium',
                      fontSize: 12,
                      color: ac.color,
                    }}
                  >
                    {ac.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>

        {/* Language + Urdu mix */}
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_600SemiBold',
            fontSize: 14,
            color: colors.text.tertiary,
            marginBottom: 12,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Language
        </Text>
        <Card style={{ marginBottom: 24 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="translate" size={22} color={colors.text.secondary} />
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_500Medium',
                  fontSize: 16,
                  color: colors.text.primary,
                  marginLeft: 12,
                }}
              >
                Urdu Mix
              </Text>
            </View>
            <Switch
              value={useUrdu}
              onValueChange={toggleUrdu}
              trackColor={{ false: colors.surface.tertiary, true: accent }}
              thumbColor="#fff"
            />
          </View>
        </Card>

        {/* Metrics & Goals */}
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_600SemiBold',
            fontSize: 14,
            color: colors.text.tertiary,
            marginBottom: 12,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Goals & Metrics
        </Text>
        <Card style={{ marginBottom: 24, gap: 12 }}>
          <InputRow
            label="Current Weight (kg)"
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            colors={colors}
            theme={theme}
          />
          <InputRow
            label="Height (cm)"
            value={height}
            onChangeText={setHeight}
            keyboardType="numeric"
            colors={colors}
            theme={theme}
          />
          <InputRow
            label="Activity Level (1.2 - 1.9)"
            value={activityLevel}
            onChangeText={setActivityLevel}
            keyboardType="numeric"
            colors={colors}
            theme={theme}
          />
          <InputRow
            label="Goal (gain/lose/maintain)"
            value={goalType}
            onChangeText={setGoalType}
            colors={colors}
            theme={theme}
          />
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_500Medium',
                fontSize: 14,
                color: colors.text.primary,
              }}
            >
              Hydration Goal (glasses)
            </Text>
            <TextInput
              value={hydrationGoal.toString()}
              onChangeText={handleHydrationGoalChange}
              keyboardType="numeric"
              style={{
                width: 80,
                backgroundColor: theme === 'light' ? colors.surface.primary : colors.surface.secondary,
                color: colors.text.primary,
                padding: 10,
                borderRadius: 10,
                fontFamily: 'IBMPlexMono_600SemiBold',
                textAlign: 'center',
                borderWidth: theme === 'light' ? 1 : 0,
                borderColor: theme === 'light' ? colors.border : 'transparent',
              }}
            />
          </View>
          <Button title="Save Targets" onPress={handleSaveMetrics} fullWidth />
        </Card>

        {/* Account */}
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_600SemiBold',
            fontSize: 14,
            color: colors.text.tertiary,
            marginBottom: 12,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Account
        </Text>
        <Card style={{ marginBottom: 24 }}>
          <TouchableOpacity
            onPress={handleExport}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="file-download" size={22} color={colors.text.secondary} />
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_500Medium',
                  fontSize: 16,
                  color: colors.text.primary,
                  marginLeft: 12,
                }}
              >
                Export Data
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.text.tertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSignOut}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="logout" size={22} color={Colors.system.error} />
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_500Medium',
                  fontSize: 16,
                  color: Colors.system.error,
                  marginLeft: 12,
                }}
              >
                Sign Out
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.text.tertiary} />
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </View>
  );
}

const InputRow = ({
  label,
  value,
  onChangeText,
  keyboardType,
  colors,
  theme,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'numeric';
  colors: ThemeColors;
  theme?: 'light' | 'dark';
}) => (
  <View
    style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
      gap: 12,
    }}
  >
    <Text
      style={{
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        color: colors.text.primary,
        flex: 1,
      }}
    >
      {label}
    </Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      style={{
        width: 140,
        backgroundColor: theme === 'light' ? colors.surface.primary : colors.surface.secondary,
        color: colors.text.primary,
        padding: 10,
        borderRadius: 10,
        fontFamily: 'IBMPlexMono_600SemiBold',
        textAlign: 'right',
        borderWidth: theme === 'light' ? 1 : 0,
        borderColor: theme === 'light' ? colors.border : 'transparent',
      }}
      placeholder="--"
      placeholderTextColor={colors.text.tertiary}
    />
  </View>
);
