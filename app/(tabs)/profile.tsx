import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { Card, Button, FadeInView, AnimatedPressable } from '../../src/components/ui';
import { getFoodLogsInRange, getHydrationInRange, getWeightLogsInRange } from '../../src/lib/db';
import { getHydrationGoal, HYDRATION_DEFAULT_GOAL } from '../../src/lib/preferences';
import { computeAchievements, aggregateCalories, aggregateHydration, buildDateRange } from '../../src/lib/analytics';

export default function ProfileScreen() {
  const { colors, accent } = useTheme();
  const { profile, user, signOut, updateProfile } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [hydrationGoal, setHydrationGoalState] = useState<number>(HYDRATION_DEFAULT_GOAL);

  useEffect(() => {
    getHydrationGoal()
      .then(setHydrationGoalState)
      .catch((error) => {
        console.error('Failed to load hydration goal:', error);
        // Keep default value on error
      });
  }, []);

  useEffect(() => {
    // Avatars are stored as data URIs in the profile doc (post-Supabase).
    // Old http(s) Supabase-storage URLs are dead links, so only data:/http
    // values render; legacy storage paths fall back to initials.
    if (profile?.avatar_url && /^(data:|https?:)/.test(profile.avatar_url)) {
      setAvatarUrl(profile.avatar_url);
    } else {
      setAvatarUrl(null);
    }
  }, [profile?.avatar_url]);

  // Achievements preview query
  const achievementDates = buildDateRange(30);
  const achievementStart = achievementDates[0];
  const achievementEnd = achievementDates[achievementDates.length - 1];

  const { data: achievementsData } = useQuery({
    queryKey: ['profileAchievements', user?.id, achievementStart, achievementEnd],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return { food: [], hydration: [], weight: [] };
      const [food, hydration, weight] = await Promise.all([
        getFoodLogsInRange(user.id, achievementStart, achievementEnd),
        getHydrationInRange(user.id, achievementStart, achievementEnd),
        getWeightLogsInRange(user.id, achievementStart, achievementEnd),
      ]);
      return { food, hydration, weight };
    },
  });

  const achievements = computeAchievements({
    calories: aggregateCalories(achievementsData?.food || []),
    hydration: aggregateHydration(achievementsData?.hydration || []),
    weight: achievementsData?.weight || [],
    targetCalories: profile?.daily_target_kcal || 2000,
    waterGoal: hydrationGoal,
    streak: profile?.streak_count,
    hasAvatar: !!profile?.avatar_url,
  });

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              await AsyncStorage.removeItem('@pakalorie_onboarding_complete');
              router.replace('/');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleAvatarUpload = async () => {
    if (!user) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to pick a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      mediaTypes: ['images'],
      base64: true,
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert('Upload failed', 'Could not read the selected image. Try another one.');
      return;
    }
    // The avatar lives as a data URI inside the Firestore profile doc (1 MiB
    // doc limit). ponytail: quality 0.3 + this guard covers phone photos; add
    // expo-image-manipulator resizing if large sources start getting rejected.
    if (asset.base64.length > 700_000) {
      Alert.alert('Image too large', 'Pick a smaller photo (or crop tighter) and try again.');
      return;
    }

    try {
      setIsUploading(true);
      const dataUri = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
      await updateProfile({ avatar_url: dataUri });
      setAvatarUrl(dataUri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('Avatar upload error', error);
      Alert.alert('Upload failed', error?.message || 'Could not save the image right now.');
    } finally {
      setIsUploading(false);
    }
  };

  const initials = useMemo(() => {
    if (!profile?.display_name) return 'U';
    return profile.display_name
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }, [profile?.display_name]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.primary }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 120 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_700Bold',
              fontSize: 28,
              color: colors.text.primary,
            }}
          >
            Profile
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/settings')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.surface.secondary,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <MaterialIcons name="settings" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* User Info Card */}
        <FadeInView direction="up" delay={0}>
        <Card style={{ marginBottom: 20, alignItems: 'center' }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: accent + '20',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
              overflow: 'hidden',
            }}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_700Bold',
                  fontSize: 32,
                  color: accent,
                }}
              >
                {initials}
              </Text>
            )}
            <TouchableOpacity
              onPress={handleAvatarUpload}
              style={{
                position: 'absolute',
                bottom: 4,
                right: 4,
                backgroundColor: colors.surface.secondary,
                borderRadius: 14,
                padding: 6,
                borderWidth: 1,
                borderColor: colors.surface.tertiary,
              }}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color={accent} />
              ) : (
                <MaterialIcons name="photo-camera" size={16} color={colors.text.primary} />
              )}
            </TouchableOpacity>
          </View>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_600SemiBold',
              fontSize: 20,
              color: colors.text.primary,
              marginBottom: 4,
            }}
            >
              {profile?.display_name || 'User'}
            </Text>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: 14,
                color: colors.text.secondary,
                marginTop: 4,
              }}
            >
              {profile?.goal_type ? profile.goal_type.charAt(0).toUpperCase() + profile.goal_type.slice(1) : 'Goal not set'}
            </Text>
          {profile?.is_premium && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: accent + '20',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                marginTop: 8,
              }}
            >
              <MaterialIcons name="star" size={16} color={accent} />
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_500Medium',
                  fontSize: 12,
                  color: accent,
                  marginLeft: 4,
                }}
              >
                Premium
              </Text>
            </View>
          )}
        </Card>
        </FadeInView>

        {/* Stats Grid */}
        <FadeInView direction="up" delay={80}>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <MaterialIcons name="local-fire-department" size={28} color="#FF6B6B" />
            <Text
              style={{
                fontFamily: 'IBMPlexMono_700Bold',
                fontSize: 24,
                color: colors.text.primary,
                marginTop: 8,
              }}
            >
              {profile?.streak_count || 0}
            </Text>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: 12,
                color: colors.text.tertiary,
              }}
            >
              Day Streak
            </Text>
          </Card>

          <Card style={{ flex: 1, alignItems: 'center' }}>
            <MaterialIcons name="flag" size={28} color={accent} />
            <Text
              style={{
                fontFamily: 'IBMPlexMono_700Bold',
                fontSize: 24,
                color: colors.text.primary,
                marginTop: 8,
              }}
            >
              {profile?.daily_target_kcal?.toLocaleString() || '2000'}
            </Text>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: 12,
                color: colors.text.tertiary,
              }}
            >
              Daily Goal
            </Text>
          </Card>
        </View>
        </FadeInView>

        {/* Current Stats */}
        <FadeInView direction="up" delay={140}>
        <Card style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_600SemiBold',
              fontSize: 16,
              color: colors.text.primary,
              marginBottom: 16,
            }}
          >
            Your Stats
          </Text>

          <View style={{ gap: 12 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: colors.text.secondary }}>
                Current Weight
              </Text>
              <Text style={{ fontFamily: 'IBMPlexMono_600SemiBold', fontSize: 16, color: colors.text.primary }}>
                {profile?.current_weight_kg || '--'} kg
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: colors.text.secondary }}>
                Height
              </Text>
              <Text style={{ fontFamily: 'IBMPlexMono_600SemiBold', fontSize: 16, color: colors.text.primary }}>
                {profile?.height_cm || '--'} cm
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: colors.text.secondary }}>
                Goal
              </Text>
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontSize: 14,
                  color: accent,
                  textTransform: 'capitalize',
                }}
              >
                {profile?.goal_type || 'Maintain'}
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: colors.text.secondary }}>
                Hydration Goal
              </Text>
              <Text style={{ fontFamily: 'IBMPlexMono_600SemiBold', fontSize: 16, color: colors.text.primary }}>
                {hydrationGoal} glasses
              </Text>
            </View>
          </View>
        </Card>
        </FadeInView>

        {/* Quick Actions - Featured */}
        <FadeInView direction="up" delay={200}>
        <View style={{ gap: 12, marginBottom: 12 }}>
          {/* Trends Button - Accent styled */}
          <AnimatedPressable
            onPress={() => router.push('/(tabs)/trends')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: accent + '15',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: accent + '30',
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: accent + '25',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <MaterialIcons name="trending-up" size={22} color={accent} />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontSize: 16,
                  color: colors.text.primary,
                }}
              >
                Detailed Trends
              </Text>
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_400Regular',
                  fontSize: 12,
                  color: colors.text.secondary,
                  marginTop: 2,
                }}
              >
                Track your progress over time
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={accent} />
          </AnimatedPressable>

          {/* Calendar Button - Gold styled */}
          <AnimatedPressable
            onPress={() => router.push('/(tabs)/calendar-log')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FFC107' + '15',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: '#FFC107' + '30',
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#FFC107' + '25',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <MaterialIcons name="calendar-today" size={22} color="#FFC107" />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontSize: 16,
                  color: colors.text.primary,
                }}
              >
                Logging Calendar
              </Text>
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_400Regular',
                  fontSize: 12,
                  color: colors.text.secondary,
                  marginTop: 2,
                }}
              >
                View your daily meal history
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#FFC107" />
          </AnimatedPressable>
        </View>
        </FadeInView>

        {/* Achievements Preview */}
        <FadeInView direction="up" delay={260}>
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 18,
                color: colors.text.primary,
              }}
            >
              Achievements
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/achievements')}>
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_500Medium',
                  fontSize: 14,
                  color: accent,
                }}
              >
                See All
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            {achievements.slice(0, 3).map((ach) => (
              <TouchableOpacity
                key={ach.id}
                onPress={() => router.push('/(tabs)/achievements')}
                activeOpacity={0.7}
                style={{ flex: 1 }}
              >
                <Card style={{ alignItems: 'center', padding: 12 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: ach.unlocked ? accent + '20' : colors.surface.tertiary,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <MaterialIcons
                      name={ach.icon as any}
                      size={22}
                      color={ach.unlocked ? accent : colors.text.tertiary}
                    />
                  </View>
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_500Medium',
                      fontSize: 11,
                      color: colors.text.primary,
                      textAlign: 'center',
                      lineHeight: 14,
                    }}
                    numberOfLines={2}
                  >
                    {ach.title}
                  </Text>
                  {/* Mini progress bar */}
                  <View
                    style={{
                      height: 4,
                      width: '100%',
                      backgroundColor: colors.surface.tertiary,
                      borderRadius: 2,
                      marginTop: 8,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        width: `${Math.min(100, Math.round(ach.progress * 100))}%`,
                        height: '100%',
                        backgroundColor: ach.unlocked ? accent : colors.text.tertiary,
                      }}
                    />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        </FadeInView>

        {/* Quick Actions - Standard */}
        <FadeInView direction="up" delay={320}>
        <View style={{ gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/water')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surface.secondary,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <MaterialIcons name="water-drop" size={22} color={colors.text.secondary} />
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_500Medium',
                fontSize: 16,
                color: colors.text.primary,
                marginLeft: 12,
                flex: 1,
              }}
            >
              Water Log & Goal
            </Text>
            <MaterialIcons name="chevron-right" size={22} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <View style={{ marginTop: 20 }}>
          <Button
            title="Sign Out"
            onPress={handleSignOut}
            variant="outline"
            fullWidth
          />
        </View>
        </FadeInView>
      </ScrollView>
    </View>
  );
}
