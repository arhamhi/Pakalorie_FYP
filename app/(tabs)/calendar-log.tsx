import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { aggregateCalories, aggregateHydration, buildDateRange, normalizeSeries } from '../../src/lib/analytics';
import { Card, FadeInView } from '../../src/components/ui';

export default function CalendarLogScreen() {
  const { colors, accent } = useTheme();
  const { user, profile } = useAuth();

  const today = new Date();
  const dates = buildDateRange(35, today); // 5 weeks view
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  const { data: logs } = useQuery({
    queryKey: ['calendarLogs', user?.id, startDate, endDate],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return { food: [], hydration: [] };
      const [foodRes, hydrationRes] = await Promise.all([
        supabase
          .from('food_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', `${startDate}T00:00:00`)
          .lte('created_at', `${endDate}T23:59:59`),
        supabase
          .from('hydration_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('log_date', startDate)
          .lte('log_date', endDate),
      ]);

      return {
        food: foodRes.data || [],
        hydration: hydrationRes.data || [],
      };
    },
  });

  const calories = normalizeSeries(
    aggregateCalories(logs?.food || []),
    dates,
    (date) => ({ date, calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 })
  );
  const hydration = normalizeSeries(
    aggregateHydration(logs?.hydration || []),
    dates,
    (date) => ({ date, count: 0 })
  );

  const maxCal = Math.max(
    profile?.daily_target_kcal ? profile.daily_target_kcal * 1.2 : 2400,
    ...calories.map((c) => c.calories)
  );

  const getCalorieColor = (value: number) => {
    const ratio = Math.min(1, value / maxCal);
    const alpha = Math.max(0.15, ratio);
    return `${accent}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
  };

  const rows: { date: string; calories: number; count: number }[][] = [];
  for (let i = 0; i < dates.length; i += 7) {
    rows.push(
      dates.slice(i, i + 7).map((d) => ({
        date: d,
        calories: calories.find((c) => c.date === d)?.calories || 0,
        count: hydration.find((h) => h.date === d)?.count || 0,
      }))
    );
  }

  const daysShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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
            Calendar Log
          </Text>
        </View>

        <FadeInView delay={0}>
          <Card style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 16,
                color: colors.text.primary,
                marginBottom: 12,
              }}
            >
              Past 5 Weeks
            </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            {daysShort.map((d, i) => (
              <Text
                key={`${d}-${i}`}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontFamily: 'PlusJakartaSans_500Medium',
                  fontSize: 12,
                  color: colors.text.tertiary,
                }}
              >
                {d}
              </Text>
            ))}
          </View>

          {rows.map((week, idx) => (
            <View key={idx} style={{ flexDirection: 'row', marginBottom: 8 }}>
              {week.map((day) => {
                const dateObj = new Date(day.date);
                const isToday = day.date === dates[dates.length - 1];
                const logged = day.calories > 0;
                const hydrated = day.count > 0;

                return (
                  <View
                    key={day.date}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      paddingVertical: 6,
                      gap: 4,
                    }}
                  >
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        backgroundColor: logged ? getCalorieColor(day.calories) : colors.surface.secondary,
                        borderWidth: isToday ? 2 : 1,
                        borderColor: isToday ? accent : colors.surface.tertiary,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'IBMPlexMono_600SemiBold',
                          fontSize: 13,
                          color: colors.text.primary,
                        }}
                      >
                        {dateObj.getDate()}
                      </Text>
                    </View>
                    <View
                      style={{
                        width: 24,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: logged ? accent : colors.surface.tertiary,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          width: `${Math.min(100, (day.calories / (profile?.daily_target_kcal || 2000)) * 100)}%`,
                          height: '100%',
                          backgroundColor: accent,
                        }}
                      />
                    </View>
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: hydrated ? '#4FC3F7' : colors.surface.tertiary,
                      }}
                    />
                  </View>
                );
              })}
            </View>
          ))}
          </Card>
        </FadeInView>

        <FadeInView delay={50}>
          <Card>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 16,
                color: colors.text.primary,
                marginBottom: 8,
              }}
            >
              Legend
            </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: accent + '60', marginRight: 8 }} />
            <Text style={{ color: colors.text.secondary, fontFamily: 'PlusJakartaSans_400Regular' }}>
              Calorie intensity (darker = more calories)
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <View style={{ width: 24, height: 6, borderRadius: 3, backgroundColor: accent, marginRight: 8 }} />
            <Text style={{ color: colors.text.secondary, fontFamily: 'PlusJakartaSans_400Regular' }}>
              Macro bar shows % of daily target
            </Text>
          </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#4FC3F7', marginRight: 8 }} />
              <Text style={{ color: colors.text.secondary, fontFamily: 'PlusJakartaSans_400Regular' }}>
                Hydration log present
              </Text>
            </View>
          </Card>
        </FadeInView>
      </ScrollView>
    </View>
  );
}
