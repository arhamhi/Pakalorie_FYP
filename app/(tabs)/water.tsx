import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { supabase } from '../../src/lib/supabase';
import { Card, Button, FadeInView } from '../../src/components/ui';
import { getHydrationGoal, setHydrationGoal, HYDRATION_DEFAULT_GOAL } from '../../src/lib/preferences';
import { HYDRATION_MIN_GOAL } from './settings';

export default function WaterScreen() {
  const { colors, accent } = useTheme();
  const { user, profile } = useAuth();
  const { getHydrationFeedback } = useLanguage();
  const queryClient = useQueryClient();
  
  // Helper to get current date to avoid stale date after midnight
  const getToday = () => new Date().toISOString().split('T')[0];
  const today = getToday();

  const [goal, setGoal] = useState<number>(HYDRATION_DEFAULT_GOAL);

  useEffect(() => {
    getHydrationGoal().then(setGoal);
  }, []);

  const { data: hydration } = useQuery({
    queryKey: ['hydration', user?.id, today],
    enabled: !!user,
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
  });

  const waterCount = hydration?.count || 0;
  const progress = Math.min(1, waterCount / goal);

  const incrementWater = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not logged in');
      const currentToday = getToday(); // Get fresh date at mutation time
      if (hydration) {
        const { error } = await supabase
          .from('hydration_logs')
          .update({ count: waterCount + 1 })
          .eq('id', hydration.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hydration_logs')
          .insert({
            user_id: user.id,
            log_date: currentToday,
            count: 1,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      queryClient.invalidateQueries({ queryKey: ['hydration', user?.id, today] });
    },
    onError: (error) => {
      console.error('Failed to increment water:', error);
      Alert.alert('Error', 'Failed to log water intake. Please try again.');
      queryClient.invalidateQueries({ queryKey: ['hydration', user?.id, today] });
    },
  });

  const decrementWater = useMutation({
    mutationFn: async () => {
      if (!user || !hydration || waterCount <= 0) return;
      const { error } = await supabase
        .from('hydration_logs')
        .update({ count: Math.max(0, waterCount - 1) })
        .eq('id', hydration.id);
      if (error) throw error;
    },
    onSuccess: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      queryClient.invalidateQueries({ queryKey: ['hydration', user?.id, today] });
    },
    onError: (error) => {
      console.error('Failed to decrement water:', error);
      Alert.alert('Error', 'Failed to update water intake. Please try again.');
      queryClient.invalidateQueries({ queryKey: ['hydration', user?.id, today] });
    },
  });

  const handleGoalChange = async (delta: number) => {
    const next = Math.max(HYDRATION_MIN_GOAL, Math.min(20, goal + delta));
    setGoal(next);
    await setHydrationGoal(next);
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
            Water Logging
          </Text>
        </View>

        <FadeInView delay={0}>
          <Card style={{ marginBottom: 16, alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_500Medium',
                fontSize: 14,
                color: colors.text.secondary,
                marginBottom: 8,
              }}
            >
              Today
            </Text>
          <Text
            style={{
              fontFamily: 'IBMPlexMono_700Bold',
              fontSize: 42,
              color: colors.text.primary,
            }}
          >
            {waterCount} / {goal}
          </Text>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_400Regular',
              fontSize: 14,
              color: colors.text.tertiary,
              marginTop: 4,
            }}
          >
            {getHydrationFeedback(waterCount)}
          </Text>

          {/* Progress bar */}
          <View
            style={{
              width: '100%',
              height: 10,
              backgroundColor: colors.surface.tertiary,
              borderRadius: 999,
              overflow: 'hidden',
              marginTop: 16,
            }}
          >
            <View
              style={{
                width: `${progress * 100}%`,
                height: '100%',
                backgroundColor: '#4FC3F7',
              }}
            />
          </View>

          {/* Controls */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <TouchableOpacity
              onPress={() => decrementWater.mutate()}
              disabled={waterCount <= 0}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: waterCount > 0 ? colors.surface.secondary : colors.surface.tertiary,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <MaterialIcons name="remove" size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => incrementWater.mutate()}
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: '#4FC3F7',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <MaterialIcons name="add" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          </Card>
        </FadeInView>

        <FadeInView delay={50}>
          <Card style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 16,
                color: colors.text.primary,
                marginBottom: 12,
              }}
            >
              Hydration Goal
            </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                onPress={() => handleGoalChange(-1)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.surface.secondary,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <MaterialIcons name="remove" size={20} color={colors.text.primary} />
              </TouchableOpacity>
              <Text
                style={{
                  fontFamily: 'IBMPlexMono_700Bold',
                  fontSize: 24,
                  color: colors.text.primary,
                }}
              >
                {goal} glasses
              </Text>
              <TouchableOpacity
                onPress={() => handleGoalChange(1)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.surface.secondary,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <MaterialIcons name="add" size={20} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
          </View>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: 13,
                color: colors.text.secondary,
                marginTop: 8,
              }}
            >
              Your base goal is 8 glasses. Adjust if you train harder or it's hot outside.
            </Text>
          </Card>
        </FadeInView>

        <FadeInView delay={100}>
          <Card>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 16,
                color: colors.text.primary,
                marginBottom: 12,
              }}
            >
              Tips
            </Text>
          <View style={{ gap: 8 }}>
            {[
              'Start each meal with one glass.',
              'Keep a 500ml bottle nearby—2 refills is ~4 glasses.',
              'If you train today, add +1 glass per 20 minutes of sweat.',
            ].map((tip) => (
              <View key={tip} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="check-circle" size={18} color={accent} />
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_400Regular',
                    fontSize: 14,
                    color: colors.text.secondary,
                    marginLeft: 8,
                  }}
                >
                  {tip}
                </Text>
              </View>
            ))}
          </View>
          </Card>
        </FadeInView>
      </ScrollView>
    </View>
  );
}
