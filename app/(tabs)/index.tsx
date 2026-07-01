import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Dimensions, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import {
  BellIcon,
  SparkleIcon,
  ChatTeardropDotsIcon,
  TrendUpIcon,
  CaretRightIcon,
  DropIcon,
  MinusIcon,
  PlusIcon,
  ForkKnifeIcon,
  StarIcon,
  LockIcon,
  MagnifyingGlassIcon,
  CameraIcon,
  PencilSimpleIcon,
} from 'phosphor-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Colors, Elevation } from '../../src/constants/colors';
import { Type, FontFamily } from '../../src/constants/fonts';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { changeHydration, getFoodLogsInRange, getHydration } from '../../src/lib/db';
import { getUstadAdvice } from '../../src/lib/gemini';
import { Card, ProgressRing, MacroBar, FadeInView, AnimatedPressable } from '../../src/components/ui';
import { calculateMacros } from '../../src/constants/nutrition';
import { FoodLog } from '../../src/types/database';
import { getHydrationGoal, HYDRATION_DEFAULT_GOAL } from '../../src/lib/preferences';
import { aggregateCalories, buildDateRange, normalizeSeries, todayKey } from '../../src/lib/analytics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// Hydration keeps its own blue — water is the one surface that isn't the
// health-green accent (matches the Stitch dashboard mockup).
const HYDRATION_BLUE = '#4FC3F7';
const CARD_PADDING = 20;
const CARD_GAP = 16;
const CARD_WIDTH = SCREEN_WIDTH - (CARD_PADDING * 2); // Full width minus padding
const CARD_HEIGHT = Math.max(520, SCREEN_HEIGHT * 0.55); // Larger cards - 55% of screen height

export default function HomeScreen() {
  const { colors, accent, accentDeep, theme } = useTheme();
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

  // Fetch today's food logs (local calendar day, not UTC)
  const today = todayKey();
  const { data: foodLogs, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['foodLogs', user?.id, today],
    queryFn: async (): Promise<FoodLog[]> => (user ? getFoodLogsInRange(user.id, today) : []),
    enabled: !!user,
  });

  // Fetch today's hydration
  const { data: hydration } = useQuery({
    queryKey: ['hydration', user?.id, today],
    queryFn: async () => (user ? getHydration(user.id, today) : null),
    enabled: !!user,
  });

  // Fetch last 7 days for trends mini-card
  const trendDates = buildDateRange(7);
  const trendStart = trendDates[0];
  const trendEnd = trendDates[trendDates.length - 1];

  const { data: trendData } = useQuery({
    queryKey: ['trends7d', user?.id],
    queryFn: async (): Promise<FoodLog[]> =>
      user ? getFoodLogsInRange(user.id, trendStart, trendEnd) : [],
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
      // Atomic per-day counter — no update-vs-insert branch, no stale-row race.
      await changeHydration(user.id, today, 1);
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
      await changeHydration(user.id, today, -1);
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
    let cancelled = false;
    const fetchAdvice = async () => {
      if (remainingCalories !== undefined) {
        const advice = await getUstadAdvice({
          remainingCalories,
          timeOfDay: getTimeOfDay(),
          goal: profile?.goal_type || 'maintain',
          waterCount,
        });
        if (!cancelled) setUstadAdvice(advice);
      }
    };
    fetchAdvice();
    return () => {
      cancelled = true;
    };
    // waterCount is deliberately NOT a dependency: every hydration +/- tap
    // would fire another Gemini call (and race the previous one). The advice
    // simply reads the latest count whenever it does refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingCalories, profile?.goal_type]);

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
            // React Query v5: isLoading is first-load only; manual refetch()
            // toggles isRefetching, so the pull spinner needs that.
            refreshing={isRefetching}
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
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text
              style={{
                ...Type.labelCaps,
                textTransform: 'uppercase',
                color: colors.text.tertiary,
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
                ...Type.headlineSerifMd,
                color: colors.text.primary,
                marginTop: 4,
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {greeting}
            </Text>
            <Text
              style={{
                ...Type.bodyMd,
                color: colors.text.secondary,
                marginTop: 4,
              }}
            >
              {remainingCalories > 0
                ? `You're ${remainingCalories} kcal away from your goal today.`
                : "You've hit your goal for today."}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/notifications')}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.surface.secondary,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <BellIcon size={24} color={colors.text.primary} weight="regular" />
          </TouchableOpacity>
        </View>

        {/* Swipable Cards Carousel */}
        <FadeInView direction="up" delay={60}>
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
                  unit="kcal left"
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
                        fontFamily: FontFamily.instrumentSerif,
                        fontSize: 32,
                        color: colors.text.primary,
                      }}
                    >
                      {totalCalories}
                    </Text>
                    <Text
                      style={{
                        fontFamily: FontFamily.geistSemiBold,
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
                        fontFamily: FontFamily.instrumentSerif,
                        fontSize: 32,
                        color: accent,
                      }}
                    >
                      {targetCalories}
                    </Text>
                    <Text
                      style={{
                        fontFamily: FontFamily.geistSemiBold,
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
                  color={Colors.accent.coral}
                />
                <MacroBar
                  label="Carbs"
                  current={Math.round(totalCarbs)}
                  target={targetMacros.carbs}
                  color={Colors.accent.gold}
                />
                <MacroBar
                  label="Fat"
                  current={Math.round(totalFat)}
                  target={targetMacros.fat}
                  color={Colors.accent.green}
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
                    <SparkleIcon size={28} color={accent} weight="duotone" />
                  </View>
                  <Text
                    style={{
                      fontFamily: FontFamily.geistBold,
                      fontSize: 24,
                      color: colors.text.primary,
                    }}
                  >
                    Ustad says
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: FontFamily.geistSemiBold,
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
                <ChatTeardropDotsIcon size={24} color={Colors.onAccent} weight="fill" />
                <Text
                  style={{
                    fontFamily: FontFamily.geistBold,
                    fontSize: 18,
                    color: Colors.onAccent,
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
                      <TrendUpIcon size={28} color={accent} weight="duotone" />
                    </View>
                    <View>
                      <Text
                        style={{
                          fontFamily: FontFamily.geistBold,
                          fontSize: 24,
                          color: colors.text.primary,
                        }}
                      >
                        Weekly Trends
                      </Text>
                      <Text
                        style={{
                          fontFamily: FontFamily.instrumentSerif,
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
                          fontFamily: FontFamily.geistSemiBold,
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
                      fontFamily: FontFamily.geistSemiBold,
                      fontSize: 17,
                      color: accent,
                      flex: 1,
                    }}
                  >
                    View detailed trends
                  </Text>
                  <CaretRightIcon size={24} color={accent} weight="regular" />
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
        </FadeInView>

        {/* Hydration Card */}
        <FadeInView direction="up" delay={120}>
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
                  backgroundColor: HYDRATION_BLUE + '20',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <DropIcon size={26} color={HYDRATION_BLUE} weight="duotone" />
              </View>
              <View style={{ marginLeft: 14 }}>
                <Text
                  style={{
                    fontFamily: FontFamily.geistBold,
                    fontSize: 18,
                    color: colors.text.primary,
                  }}
                >
                  {t('dashboard', 'water_intake')}
                </Text>
                <Text
                  style={{
                    fontFamily: FontFamily.geistMedium,
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
                <MinusIcon size={22} color={waterCount > 0 ? colors.text.primary : colors.text.tertiary} weight="bold" />
              </TouchableOpacity>
              <Text
                style={{
                  fontFamily: FontFamily.instrumentSerif,
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
                  backgroundColor: HYDRATION_BLUE,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <PlusIcon size={26} color={Colors.onAccent} weight="bold" />
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
                backgroundColor: HYDRATION_BLUE,
                borderRadius: 5,
              }}
            />
          </View>
        </Card>
        </FadeInView>

        {/* Premium Restaurant Discovery */}
        <FadeInView direction="up" delay={180}>
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
                      backgroundColor: Colors.accent.gold + '20',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 14,
                    }}
                  >
                    <ForkKnifeIcon size={24} color={Colors.accent.gold} weight="duotone" />
                  </View>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text
                        style={{
                          fontFamily: FontFamily.geistBold,
                          fontSize: 18,
                          color: colors.text.primary,
                        }}
                      >
                        Discover Nearby
                      </Text>
                      <View
                        style={{
                          backgroundColor: Colors.accent.gold,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                          marginLeft: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: FontFamily.geistSemiBold,
                            fontSize: 10,
                            color: Colors.ink,
                          }}
                        >
                          PRO
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={{
                        fontFamily: FontFamily.geistMedium,
                        fontSize: 14,
                        color: colors.text.secondary,
                        marginTop: 2,
                      }}
                    >
                      Find healthy restaurants near you
                    </Text>
                  </View>
                </View>
                <CaretRightIcon size={24} color={Colors.accent.gold} weight="regular" />
              </View>
            </Card>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.push('/onboarding/paywall')} activeOpacity={0.8}>
            <Card style={{ marginBottom: 16, borderWidth: 1, borderColor: Colors.accent.gold + '40' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: Colors.accent.gold + '10',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 14,
                    }}
                  >
                    <StarIcon size={24} color={Colors.accent.gold} weight="fill" />
                  </View>
                  <View>
                    <Text
                      style={{
                        fontFamily: FontFamily.geistBold,
                        fontSize: 16,
                        color: colors.text.primary,
                      }}
                    >
                      Unlock Premium Features
                    </Text>
                    <Text
                      style={{
                        fontFamily: FontFamily.geistRegular,
                        fontSize: 13,
                        color: colors.text.secondary,
                        marginTop: 2,
                      }}
                    >
                      Restaurant discovery, AI suggestions & more
                    </Text>
                  </View>
                </View>
                <LockIcon size={20} color={Colors.accent.gold} weight="fill" />
              </View>
            </Card>
          </TouchableOpacity>
        )}
        </FadeInView>

        {/* Quick log — Stitch dashboard tiles (Photo / Search / Manual) */}
        <FadeInView direction="up" delay={240}>
        <Text
          style={{
            ...Type.labelCaps,
            textTransform: 'uppercase',
            color: colors.text.secondary,
            marginBottom: 12,
          }}
        >
          Quick log
        </Text>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <QuickLogTile
            label="Photo"
            icon={<CameraIcon size={24} color={accentDeep} weight="duotone" />}
            onPress={() => router.push('/(tabs)/scan')}
            colors={colors}
          />
          <QuickLogTile
            label="Search"
            icon={<MagnifyingGlassIcon size={24} color={accentDeep} weight="duotone" />}
            onPress={() => router.push('/(tabs)/search')}
            colors={colors}
          />
          <QuickLogTile
            label="Manual"
            icon={<PencilSimpleIcon size={24} color={accentDeep} weight="duotone" />}
            onPress={() => router.push('/(tabs)/create-meal')}
            colors={colors}
          />
        </View>
        </FadeInView>

        {/* Today's meals — Stitch list: caps meal-type kicker + serif kcal */}
        <FadeInView direction="up" delay={300}>
        <View style={{ marginTop: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text
              style={{
                ...Type.headlineSerifSm,
                color: colors.text.primary,
              }}
            >
              Today's meals
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/calendar-log')} hitSlop={8}>
              <Text
                style={{
                  fontFamily: FontFamily.geistMedium,
                  fontSize: 14,
                  color: accentDeep,
                }}
              >
                View all
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
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text
                      style={{
                        ...Type.labelCaps,
                        textTransform: 'uppercase',
                        color: accentDeep,
                        marginBottom: 2,
                      }}
                    >
                      {log.meal_type}
                      {log.created_at
                        ? ` • ${new Date(log.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                        : ''}
                    </Text>
                    <Text
                      style={{
                        fontFamily: FontFamily.geistSemiBold,
                        fontSize: 16,
                        color: colors.text.primary,
                      }}
                      numberOfLines={1}
                    >
                      {log.name}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: FontFamily.instrumentSerif,
                      fontSize: 18,
                      color: colors.text.primary,
                    }}
                  >
                    {log.calories} kcal
                  </Text>
                </View>
              </Card>
            ))
          ) : (
            <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
              <ForkKnifeIcon size={40} color={colors.text.tertiary} weight="regular" />
              <Text
                style={{
                  fontFamily: FontFamily.geistMedium,
                  fontSize: 16,
                  color: colors.text.secondary,
                  marginTop: 12,
                }}
              >
                No meals logged yet
              </Text>
              <Text
                style={{
                  fontFamily: FontFamily.geistRegular,
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
        </FadeInView>
      </ScrollView>
    </View>
  );
}

interface QuickLogTileProps {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

// White Stitch tile with an accent-deep icon chip (dashboard "Quick log" row).
function QuickLogTile({ label, icon, onPress, colors }: QuickLogTileProps) {
  const { accentDeep } = useTheme();
  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} log`}
      style={{
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 24,
        backgroundColor: colors.surface.secondary,
        ...Elevation.ambient,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: accentDeep + '1A',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
        }}
      >
        {icon}
      </View>
      <Text
        style={{
          ...Type.labelCaps,
          textTransform: 'uppercase',
          color: colors.text.secondary,
        }}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}
