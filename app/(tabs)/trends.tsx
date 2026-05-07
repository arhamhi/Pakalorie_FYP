import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Svg, { Path, Rect } from 'react-native-svg';
import { router } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';
import {
  aggregateCalories,
  aggregateHydration,
  buildDateRange,
  normalizeSeries,
} from '../../src/lib/analytics';
import { Card, FadeInView } from '../../src/components/ui';
import { WeightLog } from '../../src/types/database';

const CHART_HEIGHT = 180;

export default function TrendsScreen() {
  const { colors, accent } = useTheme();
  const { user, profile } = useAuth();
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');

  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const dates = buildDateRange(days);
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  const { data } = useQuery({
    queryKey: ['trends', user?.id, range],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return { food: [], hydration: [], weight: [] };
      const [foodRes, hydrationRes, weightRes] = await Promise.all([
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
        supabase
          .from('weight_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('logged_at', `${startDate}T00:00:00`)
          .lte('logged_at', `${endDate}T23:59:59`)
          .order('logged_at', { ascending: true }),
      ]);

      return {
        food: foodRes.data || [],
        hydration: hydrationRes.data || [],
        weight: weightRes.data || [],
      };
    },
  });

  const calories = normalizeSeries(
    aggregateCalories(data?.food || []),
    dates,
    (date) => ({ date, calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 })
  );
  const hydration = normalizeSeries(
    aggregateHydration(data?.hydration || []),
    dates,
    (date) => ({ date, count: 0 })
  );

  const weightSeries: { date: string; weight: number }[] = useMemo(() => {
    const map = new Map<string, number>();
    (data?.weight as WeightLog[] | undefined)?.forEach((w) => {
      const key = w.logged_at ? w.logged_at.split('T')[0] : w.id;
      map.set(key, w.weight_kg);
    });

    return normalizeSeries(
      Array.from(map.entries()).map(([date, weight]) => ({ date, weight })),
      dates,
      (date) => ({ date, weight: NaN })
    );
  }, [data?.weight, dates]);

  const maxCal = Math.max(profile?.daily_target_kcal || 2200, ...calories.map((c) => c.calories));
  const maxWater = Math.max(10, ...hydration.map((h) => h.count));
  
  // Collect only finite weights to avoid Infinity issues
  const validWeights = weightSeries.map((w) => w.weight).filter(Number.isFinite);
  const maxWeight = Math.max(...validWeights, profile?.current_weight_kg || 0);
  const minWeight = validWeights.length > 0 ? Math.min(...validWeights) : 0;

  const screenWidth = Dimensions.get('window').width - 40; // account for padding

  const renderLine = (values: number[], color: string, maxY: number, minY = 0) => {
    if (!values.length || maxY === 0) return null;
    const width = screenWidth - 32; // card padding
    const stepX = width / Math.max(values.length - 1, 1);
    const normalized = values.map((v) => {
      const clamped = Math.max(minY, v);
      const rangeY = Math.max(1, maxY - minY);
      return 1 - (clamped - minY) / rangeY;
    });

    let d = '';
    normalized.forEach((n, i) => {
      const x = i * stepX;
      const y = n * CHART_HEIGHT;
      d += `${i === 0 ? 'M' : 'L'}${x},${y} `;
    });

    return <Path d={d} stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" />;
  };

  const weightValues = weightSeries.map((w) => (Number.isFinite(w.weight) ? w.weight : NaN)).filter((v) => !Number.isNaN(v));
  const weightDelta =
    weightValues.length > 1 ? weightValues[weightValues.length - 1] - weightValues[0] : 0;
  const avgCalories =
    calories.reduce((sum, c) => sum + c.calories, 0) / Math.max(1, calories.length);

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
            Trends
          </Text>
        </View>

        {/* Range Selector */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {(['7d', '30d', '90d'] as const).map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setRange(r)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                backgroundColor: range === r ? accent : colors.surface.secondary,
              }}
            >
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontSize: 13,
                  color: range === r ? '#fff' : colors.text.primary,
                }}
              >
                {r.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Calories chart */}
        <FadeInView delay={0}>
          <Card style={{ marginBottom: 12, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 16,
                color: colors.text.primary,
              }}
            >
              Calorie Intake
            </Text>
            <Text
              style={{
                fontFamily: 'IBMPlexMono_600SemiBold',
                fontSize: 14,
                color: colors.text.secondary,
              }}
            >
              Avg {Math.round(avgCalories)} kcal
            </Text>
          </View>
          <Svg width={screenWidth - 32} height={CHART_HEIGHT}>
            <Rect
              x={0}
              y={0}
              width={screenWidth - 32}
              height={CHART_HEIGHT}
              rx={12}
              fill={colors.surface.secondary}
            />
            {renderLine(
              calories.map((c) => c.calories),
              accent,
              maxCal
            )}
          </Svg>
          </Card>
        </FadeInView>

        {/* Weight chart */}
        <FadeInView delay={50}>
          <Card style={{ marginBottom: 12, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 16,
                color: colors.text.primary,
              }}
            >
              Weight Trend
            </Text>
            <Text
              style={{
                fontFamily: 'IBMPlexMono_600SemiBold',
                fontSize: 14,
                color: weightDelta >= 0 ? colors.text.secondary : '#4CAF50',
              }}
            >
              {weightDelta >= 0 ? '+' : ''}
              {weightDelta.toFixed(1)} kg
            </Text>
          </View>
          <Svg width={screenWidth - 32} height={CHART_HEIGHT}>
            <Rect
              x={0}
              y={0}
              width={screenWidth - 32}
              height={CHART_HEIGHT}
              rx={12}
              fill={colors.surface.secondary}
            />
            {renderLine(
              weightSeries.map((w) => (Number.isFinite(w.weight) ? w.weight : (profile?.current_weight_kg || 0))),
              '#4FC3F7',
              maxWeight || 1,
              Number.isFinite(minWeight) ? minWeight * 0.98 : 0
            )}
          </Svg>
          </Card>
        </FadeInView>

        {/* Hydration chart */}
        <FadeInView delay={100}>
          <Card style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 16,
                color: colors.text.primary,
              }}
            >
              Hydration
            </Text>
            <Text
              style={{
                fontFamily: 'IBMPlexMono_600SemiBold',
                fontSize: 14,
                color: colors.text.secondary,
              }}
            >
              Max {maxWater} glasses
            </Text>
          </View>
          <Svg width={screenWidth - 32} height={CHART_HEIGHT}>
            <Rect
              x={0}
              y={0}
              width={screenWidth - 32}
              height={CHART_HEIGHT}
              rx={12}
              fill={colors.surface.secondary}
            />
            {renderLine(
              hydration.map((h) => h.count),
              '#4FC3F7',
              maxWater
            )}
          </Svg>
          </Card>
        </FadeInView>
      </ScrollView>
    </View>
  );
}
