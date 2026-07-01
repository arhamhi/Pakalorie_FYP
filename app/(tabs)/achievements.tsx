import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { Card, FadeInView } from '../../src/components/ui';
import { computeAchievements, aggregateCalories, aggregateHydration, buildDateRange, dayBounds } from '../../src/lib/analytics';
import { getHydrationGoal, HYDRATION_DEFAULT_GOAL } from '../../src/lib/preferences';

export default function AchievementsScreen() {
  const { colors, accent } = useTheme();
  const { user, profile } = useAuth();
  const dates = buildDateRange(30);
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  // Load hydration goal from preferences
  const [hydrationGoal, setHydrationGoal] = useState<number>(HYDRATION_DEFAULT_GOAL);
  useEffect(() => {
    getHydrationGoal().then(setHydrationGoal).catch(console.error);
  }, []);

  const { data } = useQuery({
    queryKey: ['achievements', user?.id, startDate, endDate],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return { food: [], hydration: [], weight: [] };
      const bounds = dayBounds(startDate, endDate);
      const [foodRes, hydrationRes, weightRes] = await Promise.all([
        supabase
          .from('food_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', bounds.start)
          .lt('created_at', bounds.end),
        supabase
          .from('hydration_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('log_date', startDate)
          .lte('log_date', endDate),
        supabase
          .from('weight_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('logged_at', bounds.start)
          .lt('logged_at', bounds.end),
      ]);

      return {
        food: foodRes.data || [],
        hydration: hydrationRes.data || [],
        weight: weightRes.data || [],
      };
    },
  });

  const achievements = computeAchievements({
    calories: aggregateCalories(data?.food || []),
    hydration: aggregateHydration(data?.hydration || []),
    weight: data?.weight || [],
    targetCalories: profile?.daily_target_kcal || 2000,
    waterGoal: hydrationGoal,
    streak: profile?.streak_count,
    hasAvatar: !!profile?.avatar_url,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.primary }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 120 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/profile')}>
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
            Achievements
          </Text>
        </View>

        {achievements.map((ach, index) => (
          <FadeInView key={ach.id} delay={index * 50}>
            <Card style={{ marginBottom: 12, opacity: ach.unlocked ? 1 : 0.8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: ach.unlocked ? accent + '20' : colors.surface.secondary,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}
              >
                <MaterialIcons
                  name={ach.icon as any}
                  size={22}
                  color={ach.unlocked ? accent : colors.text.secondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold',
                    fontSize: 16,
                    color: colors.text.primary,
                  }}
                >
                  {ach.title}
                </Text>
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_400Regular',
                    fontSize: 13,
                    color: colors.text.secondary,
                    marginTop: 4,
                  }}
                >
                  {ach.description}
                </Text>
                {ach.highlight && (
                  <Text
                    style={{
                      fontFamily: 'IBMPlexMono_600SemiBold',
                      fontSize: 12,
                      color: colors.text.secondary,
                      marginTop: 4,
                    }}
                  >
                    {ach.highlight}
                  </Text>
                )}
                <View
                  style={{
                    height: 8,
                    backgroundColor: colors.surface.tertiary,
                    borderRadius: 999,
                    overflow: 'hidden',
                    marginTop: 10,
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
              </View>
              <MaterialIcons
                name={ach.unlocked ? 'emoji-events' : 'lock'}
                size={24}
                color={ach.unlocked ? accent : colors.text.tertiary}
              />
            </View>
            </Card>
          </FadeInView>
        ))}
      </ScrollView>
    </View>
  );
}
