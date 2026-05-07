import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Dimensions, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { supabase } from '../../src/lib/supabase';
import { getUstadAdvice } from '../../src/lib/gemini';
import { Card, ProgressRing, MacroBar } from '../../src/components/ui';
import { calculateMacros } from '../../src/constants/nutrition';
import { FoodLog } from '../../src/types/database';
import { getHydrationGoal, HYDRATION_DEFAULT_GOAL } from '../../src/lib/preferences';
import { aggregateCalories, buildDateRange, normalizeSeries } from '../../src/lib/analytics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_PADDING = 20;
const CARD_GAP = 16;
const CARD_WIDTH = SCREEN_WIDTH - (CARD_PADDING * 2); // Full width minus padding
const CARD_HEIGHT = Math.max(520, SCREEN_HEIGHT * 0.55); // Larger cards - 55% of screen height

export default function HomeScreen() {
  const { colors, accent, theme } = useTheme();
  const { profile, user } = useAuth();
  const { getDynamicGreeting, getHydrationFeedback, getTimeOfDay, t } = useLanguage();
  const queryClient = useQueryClient();
  const [ustadAdvice, setUstadAdvice] = useState('');
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const carouselRef = useRef<ScrollView>(null);

  // Calculate age from DOB if available
  const calculateAge = (dob: string | null): number | null => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Memoize greeting so it doesn't change on every render (hydration updates, etc.)
  const greeting = useMemo(() => {
    return getDynamicGreeting(
      profile?.display_name || undefined,
      profile?.gender as 'male' | 'female' | 'other' | null,
      calculateAge(profile?.dob || null)
    );
  }, [profile?.display_name, profile?.gender, profile?.dob, getDynamicGreeting]);

  // Time of day is provided by useLanguage hook

  // Fetch today's food logs
  const today = new Date().toISOString().split('T')[0];
  const { data: foodLogs, isLoading, refetch } = useQuery({
    queryKey: ['foodLogs', user?.id, today],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FoodLog[];
    },
    enabled: !!user,
  });

  // Fetch today's hydration
  const { data: hydration } = useQuery({
    queryKey: ['hydration', user?.id, today],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('hydration_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch last 7 days for trends mini-card
  const trendDates = buildDateRange(7);
  const trendStart = trendDates[0];
  const trendEnd = trendDates[trendDates.length - 1];

  const { data: trendData } = useQuery({
    queryKey: ['trends7d', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', `${trendStart}T00:00:00`)
        .lte('created_at', `${trendEnd}T23:59:59`);
      if (error) throw error;
      return data as FoodLog[];
    },
    enabled: !!user,
  });

  // Process trends data
  const trendCalories = normalizeSeries(
    aggregateCalories(trendData || []),
    trendDates,
    (date) => ({ date, calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 })
  );
  const maxTrendCal = Math.max(
    profile?.daily_target_kcal || 2000,
    ...trendCalories.map((c) => c.calories)
  );
  const avgCalories = trendCalories.reduce((sum, c) => sum + c.calories, 0) / Math.max(1, trendCalories.length);

  // Calculate totals
  const totalCalories = foodLogs?.reduce((sum, log) => sum + log.calories, 0) || 0;
  const totalProtein = foodLogs?.reduce((sum, log) => sum + (log.protein || 0), 0) || 0;
  const totalCarbs = foodLogs?.reduce((sum, log) => sum + (log.carbs || 0), 0) || 0;
  const totalFat = foodLogs?.reduce((sum, log) => sum + (log.fat || 0), 0) || 0;

  const targetCalories = profile?.daily_target_kcal || 2000;
  const remainingCalories = targetCalories - totalCalories;
  const calorieProgress = (totalCalories / targetCalories) * 100;

  const targetMacros = profile?.goal_type
    ? calculateMacros(targetCalories, profile.goal_type)
    : { protein: 150, carbs: 250, fat: 65 };

  const waterCount = hydration?.count || 0;
  const [waterGoal, setWaterGoal] = useState<number>(HYDRATION_DEFAULT_GOAL);
  const waterProgress = (waterCount / waterGoal) * 100;

  // Load persisted hydration goal
  useEffect(() => {
    getHydrationGoal().then(setWaterGoal);
  }, []);

  // Hydration increment mutation with optimistic updates
  const incrementWater = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not logged in');
      const currentCount = hydration?.count || 0;

      if (hydration) {
        // Update existing record
        const { error } = await supabase
          .from('hydration_logs')
          .update({ count: currentCount + 1 })
          .eq('id', hydration.id);
        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('hydration_logs')
          .insert({
            user_id: user.id,
            log_date: today,
            count: 1,
          });
        if (error) throw error;
      }
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['hydration', user?.id, today] });
      // Snapshot previous value
      const previous = queryClient.getQueryData(['hydration', user?.id, today]);
      // Optimistically update
      queryClient.setQueryData(['hydration', user?.id, today], (old: any) => ({
        ...old,
        count: (old?.count || 0) + 1,
        id: old?.id || 'temp',
        user_id: user?.id,
        log_date: today,
      }));
      return { previous };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['hydration', user?.id, today], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['hydration', user?.id, today] });
    },
    onSuccess: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  // Decrement water with optimistic updates
  const decrementWater = useMutation({
    mutationFn: async () => {
      if (!user || !hydration) return;
      const currentCount = hydration?.count || 0;
      if (currentCount <= 0) return;

      const { error } = await supabase
        .from('hydration_logs')
        .update({ count: Math.max(0, currentCount - 1) })
        .eq('id', hydration.id);
      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['hydration', user?.id, today] });
      const previous = queryClient.getQueryData(['hydration', user?.id, today]);
      queryClient.setQueryData(['hydration', user?.id, today], (old: any) => ({
        ...old,
        count: Math.max(0, (old?.count || 0) - 1),
      }));
      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['hydration', user?.id, today], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['hydration', user?.id, today] });
    },
    onSuccess: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  // Fetch dynamic Ustad advice
  useEffect(() => {
    const fetchAdvice = async () => {
      if (remainingCalories !== undefined) {
        const advice = await getUstadAdvice({
          remainingCalories,
          timeOfDay: getTimeOfDay(),
          goal: profile?.goal_type || 'maintain',
          waterCount,
        });
        setUstadAdvice(advice);
      }
    };
    fetchAdvice();
  }, [remainingCalories, waterCount, profile?.goal_type]);

  // Handle carousel scroll
  const handleCarouselScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / CARD_WIDTH);
    setActiveCardIndex(index);
  };

  // Helper to render trend line
  const renderTrendLine = (values: number[], color: string, maxY: number) => {
    if (!values.length || maxY === 0) return null;
    const chartWidth = CARD_WIDTH - 48;
    const chartHeight = 180;
    const padding = 24;
    const stepX = chartWidth / Math.max(values.length - 1, 1);
    const normalized = values.map((v) => 1 - v / maxY);

    let d = '';
    normalized.forEach((n, i) => {
      const x = i * stepX;
      const y = padding + Math.max(0, Math.min(chartHeight - padding * 2, n * (chartHeight - padding * 2)));
      d += `${i === 0 ? 'M' : 'L'}${x},${y} `;
    });

    return <Path d={d} stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.primary }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 60,
          paddingBottom: 120,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={accent}
          />
        }
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: 14,
                color: colors.text.secondary,
              }}
            >
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 20,
                color: colors.text.primary,
                marginTop: 4,
              }}
              numberOfLines={1}
            >
              {greeting}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/notifications')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.surface.secondary,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <MaterialIcons name="notifications-none" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Swipable Cards Carousel */}
        <View style={{ marginHorizontal: -20, marginBottom: 20 }}>
          <ScrollView
            ref={carouselRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleCarouselScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={CARD_WIDTH + CARD_GAP}
            snapToAlignment="start"
            contentContainerStyle={{ paddingHorizontal: CARD_PADDING, gap: CARD_GAP }}
          >
            {/* Card 1: Calorie Intelligence */}
            <Card style={{ width: CARD_WIDTH, height: CARD_HEIGHT, justifyContent: 'center', padding: 24 }}>
              <View style={{ alignItems: 'center' }}>
                <ProgressRing
                  progress={calorieProgress}
                  size={220}
                  strokeWidth={16}
                  value={remainingCalories > 0 ? remainingCalories : 0}
                  unit="kcal remaining"
                />
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    marginTop: 28,
                    gap: 40,
                  }}
                >
                  <View style={{ alignItems: 'center' }}>
                    <Text
                      style={{
                        fontFamily: 'IBMPlexMono_700Bold',
                        fontSize: 32,
                        color: colors.text.primary,
                      }}
                    >
                      {totalCalories}
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'PlusJakartaSans_600SemiBold',
                        fontSize: 16,
                        color: colors.text.tertiary,
                        marginTop: 4,
                      }}
                    >
                      eaten
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 2,
                      height: 50,
                      backgroundColor: colors.surface.tertiary,
                    }}
                  />
                  <View style={{ alignItems: 'center' }}>
                    <Text
                      style={{
                        fontFamily: 'IBMPlexMono_700Bold',
                        fontSize: 32,
                        color: accent,
                      }}
                    >
                      {targetCalories}
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'PlusJakartaSans_600SemiBold',
                        fontSize: 16,
                        color: colors.text.tertiary,
                        marginTop: 4,
                      }}
                    >
                      target
                    </Text>
                  </View>
                </View>
              </View>

              {/* Macros */}
              <View style={{ marginTop: 32 }}>
                <MacroBar
                  label="Protein"
                  current={Math.round(totalProtein)}
                  target={targetMacros.protein}
                  color="#FF6B6B"
                />
                <MacroBar
                  label="Carbs"
                  current={Math.round(totalCarbs)}
                  target={targetMacros.carbs}
                  color="#FFC107"
                />
                <MacroBar
                  label="Fat"
                  current={Math.round(totalFat)}
                  target={targetMacros.fat}
                  color="#1BAD66"
                />
              </View>
            </Card>

            {/* Card 2: Ustad Coaching */}
            <Card style={{ width: CARD_WIDTH, height: CARD_HEIGHT, justifyContent: 'space-between', padding: 24 }}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: accent + '20',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 16,
                    }}
                  >
                    <MaterialIcons name="auto-awesome" size={28} color={accent} />
                  </View>
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_700Bold',
                      fontSize: 24,
                      color: colors.text.primary,
                    }}
                  >
                    Ustad says
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold',
                    fontSize: 28,
                    color: colors.text.primary,
                    lineHeight: 42,
                  }}
                >
                  {ustadAdvice || (remainingCalories > 500
                    ? "Abhi toh khaana baaki hai! Protein pe focus karo aaj."
                    : remainingCalories > 0
                    ? "Theek chal raha hai! Bas dinner mein halka rakhna."
                    : "Target ho gaya! Kal se aur better karenge.")}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/chat')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 18,
                  paddingHorizontal: 24,
                  backgroundColor: accent,
                  borderRadius: 16,
                }}
              >
                <MaterialIcons name="chat" size={24} color="#fff" />
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_700Bold',
                    fontSize: 18,
                    color: '#fff',
                    marginLeft: 12,
                  }}
                >
                  Chat with Ustad
                </Text>
              </TouchableOpacity>
            </Card>

            {/* Card 3: Trends */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push('/(tabs)/trends')}
            >
              <Card style={{ width: CARD_WIDTH, height: CARD_HEIGHT, justifyContent: 'space-between', padding: 24 }}>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: accent + '20',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 16,
                      }}
                    >
                      <MaterialIcons name="trending-up" size={28} color={accent} />
                    </View>
                    <View>
                      <Text
                        style={{
                          fontFamily: 'PlusJakartaSans_700Bold',
                          fontSize: 24,
                          color: colors.text.primary,
                        }}
                      >
                        Weekly Trends
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'IBMPlexMono_600SemiBold',
                          fontSize: 18,
                          color: colors.text.secondary,
                          marginTop: 4,
                        }}
                      >
                        Avg {Math.round(avgCalories)} kcal/day
                      </Text>
                    </View>
                  </View>

                  {/* Trend chart */}
                  <View style={{ marginTop: 12 }}>
                    <Svg width={CARD_WIDTH - 48} height={180}>
                      <Rect
                        x={0}
                        y={0}
                        width={CARD_WIDTH - 48}
                        height={180}
                        rx={16}
                        fill={colors.surface.secondary}
                      />
                      {renderTrendLine(
                        trendCalories.map((c) => c.calories),
                        accent,
                        maxTrendCal
                      )}
                    </Svg>
                  </View>

                  {/* Day labels */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingHorizontal: 8 }}>
                    {trendDates.map((date) => (
                      <Text
                        key={date}
                        style={{
                          fontFamily: 'PlusJakartaSans_600SemiBold',
                          fontSize: 14,
                          color: colors.text.tertiary,
                        }}
                      >
                        {new Date(date).toLocaleDateString('en-US', { weekday: 'narrow' })}
                      </Text>
                    ))}
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingTop: 20,
                    borderTopWidth: 1,
                    borderTopColor: colors.surface.tertiary,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_600SemiBold',
                      fontSize: 17,
                      color: accent,
                      flex: 1,
                    }}
                  >
                    View detailed trends
                  </Text>
                  <MaterialIcons name="chevron-right" size={24} color={accent} />
                </View>
              </Card>
            </TouchableOpacity>
          </ScrollView>

          {/* Pagination Dots */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 12,
              gap: 8,
            }}
          >
            {[0, 1, 2].map((index) => (
              <View
                key={index}
                style={{
                  width: activeCardIndex === index ? 20 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: activeCardIndex === index ? accent : colors.surface.tertiary,
                }}
              />
            ))}
          </View>
        </View>

        {/* Hydration Card */}
        <Card style={{ marginBottom: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/water')}
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#4FC3F7' + '20',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <MaterialIcons name="water-drop" size={26} color="#4FC3F7" />
              </View>
              <View style={{ marginLeft: 14 }}>
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_700Bold',
                    fontSize: 18,
                    color: colors.text.primary,
                  }}
                >
                  {t('dashboard', 'water_intake')}
                </Text>
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_500Medium',
                    fontSize: 14,
                    color: colors.text.secondary,
                    marginTop: 2,
                  }}
                >
                  {getHydrationFeedback(waterCount)}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  decrementWater.mutate();
                }}
                disabled={waterCount <= 0}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: waterCount > 0 ? colors.surface.tertiary : colors.surface.secondary,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <MaterialIcons name="remove" size={22} color={waterCount > 0 ? colors.text.primary : colors.text.tertiary} />
              </TouchableOpacity>
              <Text
                style={{
                  fontFamily: 'IBMPlexMono_700Bold',
                  fontSize: 24,
                  color: colors.text.primary,
                  minWidth: 60,
                  textAlign: 'center',
                }}
              >
                {waterCount}/{waterGoal}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  incrementWater.mutate();
                }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#4FC3F7',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <MaterialIcons name="add" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          <View
            style={{
              height: 10,
              backgroundColor: colors.surface.tertiary,
              borderRadius: 5,
              marginTop: 16,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${Math.min(waterProgress, 100)}%`,
                backgroundColor: '#4FC3F7',
                borderRadius: 5,
              }}
            />
          </View>
        </Card>

        {/* Premium Restaurant Discovery */}
        {profile?.is_premium ? (
          <TouchableOpacity onPress={() => router.push('/discover')} activeOpacity={0.8}>
            <Card style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: '#FFC107' + '20',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 14,
                    }}
                  >
                    <MaterialIcons name="restaurant" size={24} color="#FFC107" />
                  </View>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text
                        style={{
                          fontFamily: 'PlusJakartaSans_700Bold',
                          fontSize: 18,
                          color: colors.text.primary,
                        }}
                      >
                        Discover Nearby
                      </Text>
                      <View
                        style={{
                          backgroundColor: '#FFC107',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                          marginLeft: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: 'PlusJakartaSans_600SemiBold',
                            fontSize: 10,
                            color: '#121212',
                          }}
                        >
                          PRO
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={{
                        fontFamily: 'PlusJakartaSans_500Medium',
                        fontSize: 14,
                        color: colors.text.secondary,
                        marginTop: 2,
                      }}
                    >
                      Find healthy restaurants near you
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#FFC107" />
              </View>
            </Card>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.push('/onboarding/paywall')} activeOpacity={0.8}>
            <Card style={{ marginBottom: 16, borderWidth: 1, borderColor: '#FFC107' + '40' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: '#FFC107' + '10',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 14,
                    }}
                  >
                    <MaterialIcons name="star" size={24} color="#FFC107" />
                  </View>
                  <View>
                    <Text
                      style={{
                        fontFamily: 'PlusJakartaSans_700Bold',
                        fontSize: 16,
                        color: colors.text.primary,
                      }}
                    >
                      Unlock Premium Features
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'PlusJakartaSans_400Regular',
                        fontSize: 13,
                        color: colors.text.secondary,
                        marginTop: 2,
                      }}
                    >
                      Restaurant discovery, AI suggestions & more
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="lock" size={20} color="#FFC107" />
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* Search Meals / Manual Logging Card */}
        <TouchableOpacity onPress={() => router.push('/(tabs)/search')} activeOpacity={0.8}>
          <Card style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: accent + '20',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 14,
                  }}
                >
                  <MaterialIcons name="search" size={24} color={accent} />
                </View>
                <View>
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_700Bold',
                      fontSize: 18,
                      color: colors.text.primary,
                    }}
                  >
                    Search & Log
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_500Medium',
                      fontSize: 14,
                      color: colors.text.secondary,
                      marginTop: 2,
                    }}
                  >
                    Search foods or log manually
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.text.tertiary} />
            </View>
          </Card>
        </TouchableOpacity>

        {/* Today's Log */}
        <View style={{ marginTop: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 18,
                color: colors.text.primary,
              }}
            >
              Today's Log
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/calendar-log')}>
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_500Medium',
                  fontSize: 14,
                  color: accent,
                }}
              >
                View All
              </Text>
            </TouchableOpacity>
          </View>

          {foodLogs && foodLogs.length > 0 ? (
            foodLogs.slice(0, 5).map((log) => (
              <Card key={log.id} style={{ marginBottom: 8 }} padding="sm">
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: 'PlusJakartaSans_500Medium',
                        fontSize: 15,
                        color: colors.text.primary,
                      }}
                      numberOfLines={1}
                    >
                      {log.name}
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'PlusJakartaSans_400Regular',
                        fontSize: 13,
                        color: colors.text.tertiary,
                        textTransform: 'capitalize',
                      }}
                    >
                      {log.meal_type} • {new Date(log.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: 'IBMPlexMono_600SemiBold',
                      fontSize: 16,
                      color: accent,
                    }}
                  >
                    {log.calories} kcal
                  </Text>
                </View>
              </Card>
            ))
          ) : (
            <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
              <MaterialIcons name="restaurant" size={40} color={colors.text.tertiary} />
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_500Medium',
                  fontSize: 16,
                  color: colors.text.secondary,
                  marginTop: 12,
                }}
              >
                No meals logged yet
              </Text>
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_400Regular',
                  fontSize: 14,
                  color: colors.text.tertiary,
                  marginTop: 4,
                }}
              >
                Scan or search to add your first meal
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
