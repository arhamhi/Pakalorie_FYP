import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';
import type { Json } from '../../src/types/database';
import { Card, Button, Input } from '../../src/components/ui';
import { COMMON_FOODS, FOOD_MODIFIERS } from '../../src/constants/nutrition';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface FoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  unit: string;
}

interface CombinationItem {
  food: FoodItem;
  servings: number;
}

export default function SearchScreen() {
  const { colors, accent, theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [servings, setServings] = useState(1);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [adjustmentsApplied, setAdjustmentsApplied] = useState(false);

  // Combination mode state
  const [combinationMode, setCombinationMode] = useState(false);
  const [combinationItems, setCombinationItems] = useState<CombinationItem[]>([]);
  const [showCombinationModal, setShowCombinationModal] = useState(false);
  const [combinationName, setCombinationName] = useState('');

  // Fetch favorites
  const { data: favorites } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Filter foods based on search
  const filteredFoods = Object.values(COMMON_FOODS).filter((food) =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle modifier selection
  const toggleModifier = (mod: string) => {
    setSelectedModifiers(prev =>
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    );
    setAdjustmentsApplied(false);
  };

  // Calculate modifier multiplier
  const getModifierMultiplier = () => {
    let multiplier = 1;
    let addition = 0;
    selectedModifiers.forEach(mod => {
      const modifier = FOOD_MODIFIERS[mod as keyof typeof FOOD_MODIFIERS];
      if (modifier && 'calorieMultiplier' in modifier) {
        multiplier *= modifier.calorieMultiplier;
      }
      if (modifier && 'calorieAdd' in modifier) {
        addition += modifier.calorieAdd;
      }
    });
    return { multiplier, addition };
  };

  // Calculate final values
  const calculateFinalCalories = (withModifiers = false) => {
    if (!selectedFood) return 0;
    let calories = selectedFood.calories * servings;
    if (withModifiers) {
      const { multiplier, addition } = getModifierMultiplier();
      calories = (calories * multiplier) + addition;
    }
    return Math.round(calories);
  };

  const calculateFinalMacro = (value: number, withModifiers = false) => {
    let result = value * servings;
    if (withModifiers) {
      const { multiplier } = getModifierMultiplier();
      result *= multiplier;
    }
    return Math.round(result);
  };

  // Build notes string
  const buildNotesString = () => {
    const parts: string[] = [];
    if (selectedModifiers.length > 0) {
      const modLabels = selectedModifiers.map(mod =>
        FOOD_MODIFIERS[mod as keyof typeof FOOD_MODIFIERS]?.label || mod
      );
      parts.push(modLabels.join(', '));
    }
    if (additionalNotes.trim()) {
      parts.push(additionalNotes.trim());
    }
    return parts.join(' - ');
  };

  // Apply adjustments
  const applyAdjustments = () => {
    setAdjustmentsApplied(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const logMeal = useMutation({
    mutationFn: async () => {
      if (!user || !selectedFood) throw new Error('Missing data');

      const notes = buildNotesString();
      const useAdjusted = adjustmentsApplied && selectedModifiers.length > 0;
      const { error } = await supabase.from('food_logs').insert({
        user_id: user.id,
        name: selectedFood.name,
        calories: calculateFinalCalories(useAdjusted),
        protein: calculateFinalMacro(selectedFood.protein, useAdjusted),
        carbs: calculateFinalMacro(selectedFood.carbs, useAdjusted),
        fat: calculateFinalMacro(selectedFood.fat, useAdjusted),
        meal_type: mealType,
        notes: notes || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['foodLogs'] });
      Alert.alert('Success', 'Meal logged successfully!');
      setSelectedFood(null);
      setServings(1);
      setAdditionalNotes('');
      setSelectedModifiers([]);
      setAdjustmentsApplied(false);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to log meal. Please try again.');
    },
  });

  const addToFavorites = useMutation({
    mutationFn: async (food: FoodItem) => {
      if (!user) throw new Error('Not logged in');

      const { error } = await supabase.from('favorites').insert({
        user_id: user.id,
        // FoodItem is a plain JSON-serializable shape; Supabase's Json type
        // just can't see that structurally.
        food_data: food as unknown as Json,
        is_combination: false,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  // Combination helpers
  const toggleCombinationItem = (food: FoodItem) => {
    const exists = combinationItems.find((item) => item.food.name === food.name);
    if (exists) {
      setCombinationItems(combinationItems.filter((item) => item.food.name !== food.name));
    } else {
      setCombinationItems([...combinationItems, { food, servings: 1 }]);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const updateCombinationServings = (foodName: string, newServings: number) => {
    setCombinationItems(
      combinationItems.map((item) =>
        item.food.name === foodName ? { ...item, servings: newServings } : item
      )
    );
  };

  const combinationTotals = {
    calories: combinationItems.reduce((sum, item) => sum + item.food.calories * item.servings, 0),
    protein: combinationItems.reduce((sum, item) => sum + item.food.protein * item.servings, 0),
    carbs: combinationItems.reduce((sum, item) => sum + item.food.carbs * item.servings, 0),
    fat: combinationItems.reduce((sum, item) => sum + item.food.fat * item.servings, 0),
  };

  const saveCombination = useMutation({
    mutationFn: async () => {
      if (!user || combinationItems.length < 2 || !combinationName.trim()) {
        throw new Error('Invalid combination');
      }

      const combinedFood = {
        name: combinationName.trim(),
        calories: Math.round(combinationTotals.calories),
        protein: Math.round(combinationTotals.protein),
        carbs: Math.round(combinationTotals.carbs),
        fat: Math.round(combinationTotals.fat),
        unit: 'combined meal',
        items: combinationItems.map((item) => ({
          name: item.food.name,
          servings: item.servings,
        })),
      };

      const { error } = await supabase.from('favorites').insert({
        user_id: user.id,
        food_data: combinedFood,
        is_combination: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      Alert.alert('Success', 'Combination saved to favorites!');
      setCombinationMode(false);
      setCombinationItems([]);
      setCombinationName('');
      setShowCombinationModal(false);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to save combination. Please try again.');
    },
  });

  const exitCombinationMode = () => {
    setCombinationMode(false);
    setCombinationItems([]);
    setCombinationName('');
  };

  const MEAL_TYPES: { value: MealType; label: string }[] = [
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'snack', label: 'Snack' },
  ];

  if (selectedFood) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface.primary }}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 180 }}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <TouchableOpacity onPress={() => {
              setSelectedFood(null);
              setAdditionalNotes('');
              setSelectedModifiers([]);
              setAdjustmentsApplied(false);
              setServings(1);
            }}>
              <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 18,
                color: colors.text.primary,
                marginLeft: 16,
              }}
            >
              Log Food
            </Text>
          </View>

          {/* Food Info */}
          <Card style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_700Bold',
                fontSize: 24,
                color: colors.text.primary,
                marginBottom: 4,
              }}
            >
              {selectedFood.name}
            </Text>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: 14,
                color: colors.text.tertiary,
                marginBottom: 16,
              }}
            >
              {selectedFood.unit}
            </Text>

            {/* Servings */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginVertical: 16,
                paddingVertical: 12,
                backgroundColor: colors.surface.secondary,
                borderRadius: 12,
              }}
            >
              <TouchableOpacity
                onPress={() => setServings(Math.max(0.5, servings - 0.5))}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.surface.tertiary,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <MaterialIcons name="remove" size={24} color={colors.text.primary} />
              </TouchableOpacity>
              <View style={{ marginHorizontal: 24, alignItems: 'center' }}>
                <Text
                  style={{
                    fontFamily: 'IBMPlexMono_700Bold',
                    fontSize: 32,
                    color: colors.text.primary,
                  }}
                >
                  {servings}
                </Text>
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_400Regular',
                    fontSize: 14,
                    color: colors.text.tertiary,
                  }}
                >
                  {servings === 1 ? 'serving' : 'servings'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setServings(servings + 0.5)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.surface.tertiary,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <MaterialIcons name="add" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Calories */}
            <View style={{ alignItems: 'center' }}>
              <Text
                style={{
                  fontFamily: 'IBMPlexMono_700Bold',
                  fontSize: 40,
                  color: accent,
                  textAlign: 'center',
                }}
              >
                {adjustmentsApplied ? calculateFinalCalories(true) : calculateFinalCalories(false)}
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_400Regular',
                    fontSize: 16,
                    color: colors.text.tertiary,
                  }}
                >
                  {' '}kcal
                </Text>
              </Text>
              {adjustmentsApplied && selectedModifiers.length > 0 && (
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_400Regular',
                    fontSize: 12,
                    color: colors.text.tertiary,
                    marginTop: 4,
                  }}
                >
                  (adjusted from {calculateFinalCalories(false)} kcal)
                </Text>
              )}
            </View>

            {/* Macros */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                marginTop: 20,
                paddingTop: 16,
                borderTopWidth: 1,
                borderTopColor: colors.surface.tertiary,
              }}
            >
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: 'IBMPlexMono_600SemiBold', fontSize: 18, color: '#FF6B6B' }}>
                  {adjustmentsApplied ? calculateFinalMacro(selectedFood.protein, true) : calculateFinalMacro(selectedFood.protein)}g
                </Text>
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: colors.text.tertiary }}>
                  Protein
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: 'IBMPlexMono_600SemiBold', fontSize: 18, color: '#FFC107' }}>
                  {adjustmentsApplied ? calculateFinalMacro(selectedFood.carbs, true) : calculateFinalMacro(selectedFood.carbs)}g
                </Text>
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: colors.text.tertiary }}>
                  Carbs
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: 'IBMPlexMono_600SemiBold', fontSize: 18, color: '#1BAD66' }}>
                  {adjustmentsApplied ? calculateFinalMacro(selectedFood.fat, true) : calculateFinalMacro(selectedFood.fat)}g
                </Text>
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: colors.text.tertiary }}>
                  Fat
                </Text>
              </View>
            </View>
          </Card>

          {/* Meal Type */}
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_600SemiBold',
              fontSize: 16,
              color: colors.text.primary,
              marginBottom: 12,
            }}
          >
            Meal Type
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
            {MEAL_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                onPress={() => setMealType(type.value)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: mealType === type.value ? accent + '20' : colors.surface.secondary,
                  borderWidth: mealType === type.value ? 2 : (theme === 'light' ? 1 : 0),
                  borderColor: mealType === type.value ? accent : (theme === 'light' ? colors.border : 'transparent'),
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_500Medium',
                    fontSize: 13,
                    color: mealType === type.value ? accent : colors.text.secondary,
                  }}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Additional Comments */}
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_600SemiBold',
              fontSize: 16,
              color: colors.text.primary,
              marginBottom: 12,
            }}
          >
            Additional Comments
          </Text>
          <TextInput
            value={additionalNotes}
            onChangeText={setAdditionalNotes}
            placeholder="Add notes about your meal (e.g., extra oil, less salt, homemade)"
            placeholderTextColor={colors.text.tertiary}
            multiline
            numberOfLines={3}
            style={{
              fontFamily: 'PlusJakartaSans_400Regular',
              fontSize: 15,
              color: colors.text.primary,
              backgroundColor: colors.surface.secondary,
              borderRadius: 12,
              padding: 16,
              minHeight: 80,
              textAlignVertical: 'top',
              marginBottom: 20,
              borderWidth: theme === 'light' ? 1 : 0,
              borderColor: theme === 'light' ? colors.border : 'transparent',
            }}
          />

          {/* Quick Add Tags */}
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_600SemiBold',
              fontSize: 16,
              color: colors.text.primary,
              marginBottom: 8,
            }}
          >
            Quick Add
          </Text>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_400Regular',
              fontSize: 13,
              color: colors.text.tertiary,
              marginBottom: 12,
            }}
          >
            Tap to add to comments
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {Object.entries(FOOD_MODIFIERS).map(([key, mod]) => (
              <TouchableOpacity
                key={key}
                onPress={() => toggleModifier(key)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 20,
                  backgroundColor: selectedModifiers.includes(key)
                    ? accent + '20'
                    : colors.surface.secondary,
                  borderWidth: 1,
                  borderColor: selectedModifiers.includes(key) ? accent : (theme === 'light' ? colors.border : 'transparent'),
                }}
              >
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_500Medium',
                    fontSize: 13,
                    color: selectedModifiers.includes(key) ? accent : colors.text.primary,
                  }}
                >
                  {mod.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Readjust Button */}
          {selectedModifiers.length > 0 && !adjustmentsApplied && (
            <TouchableOpacity
              onPress={applyAdjustments}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: accent + '15',
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 20,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: accent + '40',
                gap: 8,
              }}
            >
              <MaterialIcons name="refresh" size={20} color={accent} />
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontSize: 14,
                  color: accent,
                }}
              >
                Readjust Calories & Macros
              </Text>
            </TouchableOpacity>
          )}

          {/* Adjustment Applied Indicator */}
          {selectedModifiers.length > 0 && adjustmentsApplied && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#1BAD66' + '15',
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 16,
                marginBottom: 20,
                gap: 8,
              }}
            >
              <MaterialIcons name="check-circle" size={18} color="#1BAD66" />
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_500Medium',
                  fontSize: 13,
                  color: '#1BAD66',
                }}
              >
                Adjustments applied to nutrition values
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom Button */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: 20,
            paddingBottom: 100,
            backgroundColor: colors.surface.primary,
          }}
        >
          <Button
            title="Log Meal"
            onPress={() => logMeal.mutate()}
            size="lg"
            fullWidth
            loading={logMeal.isPending}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.primary }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 120 }}>
        {/* Header */}
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_700Bold',
            fontSize: 28,
            color: colors.text.primary,
            marginBottom: 16,
          }}
        >
          Search Food
        </Text>

        {/* Create Custom Meal Button */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/create-meal')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: accent + '15',
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: accent + '30',
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: accent + '25',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            <MaterialIcons name="auto-awesome" size={20} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 15,
                color: colors.text.primary,
              }}
            >
              Create Custom Meal
            </Text>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: 12,
                color: colors.text.secondary,
              }}
            >
              AI will estimate nutrition for you
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={accent} />
        </TouchableOpacity>

        {/* Combination Mode Toggle */}
        <TouchableOpacity
          onPress={() => combinationMode ? exitCombinationMode() : setCombinationMode(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: combinationMode ? '#FF6B6B' + '15' : colors.surface.secondary,
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: combinationMode ? '#FF6B6B' + '30' : 'transparent',
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: combinationMode ? '#FF6B6B' + '25' : colors.surface.tertiary,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            <MaterialIcons
              name={combinationMode ? 'close' : 'playlist-add'}
              size={20}
              color={combinationMode ? '#FF6B6B' : colors.text.secondary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 15,
                color: colors.text.primary,
              }}
            >
              {combinationMode ? 'Exit Combination Mode' : 'Create Meal Combination'}
            </Text>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: 12,
                color: colors.text.secondary,
              }}
            >
              {combinationMode
                ? `${combinationItems.length} items selected`
                : 'Combine multiple foods together'}
            </Text>
          </View>
          {!combinationMode && (
            <MaterialIcons name="chevron-right" size={20} color={colors.text.tertiary} />
          )}
        </TouchableOpacity>

        {/* Search Bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface.secondary,
            borderRadius: 12,
            paddingHorizontal: 16,
            marginBottom: 24,
          }}
        >
          <MaterialIcons name="search" size={22} color={colors.text.tertiary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search foods..."
            placeholderTextColor={colors.text.tertiary}
            style={{
              flex: 1,
              fontFamily: 'PlusJakartaSans_400Regular',
              fontSize: 16,
              color: colors.text.primary,
              paddingVertical: 14,
              marginLeft: 12,
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Favorites */}
        {!searchQuery && favorites && favorites.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 18,
                color: colors.text.primary,
                marginBottom: 12,
              }}
            >
              Favorites
            </Text>
            {favorites.slice(0, 5).map((fav) => {
              const food = fav.food_data as unknown as FoodItem;
              return (
                <TouchableOpacity
                  key={fav.id}
                  onPress={() => setSelectedFood(food)}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: colors.surface.secondary,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 8,
                  }}
                >
                  <View>
                    <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 16, color: colors.text.primary }}>
                      {food.name}
                    </Text>
                    <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, color: colors.text.tertiary }}>
                      {food.unit}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: 'IBMPlexMono_600SemiBold', fontSize: 16, color: accent }}>
                    {food.calories} kcal
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Common Foods / Search Results */}
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_600SemiBold',
            fontSize: 18,
            color: colors.text.primary,
            marginBottom: 12,
          }}
        >
          {searchQuery ? 'Results' : 'Common Foods'}
        </Text>
        {filteredFoods.map((food, index) => {
          const isSelected = combinationItems.some((item) => item.food.name === food.name);
          const selectedItem = combinationItems.find((item) => item.food.name === food.name);

          return (
            <TouchableOpacity
              key={index}
              onPress={() => combinationMode ? toggleCombinationItem(food) : setSelectedFood(food)}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: isSelected ? accent + '15' : colors.surface.secondary,
                borderRadius: 12,
                padding: 16,
                marginBottom: 8,
                borderWidth: isSelected ? 1 : 0,
                borderColor: isSelected ? accent + '30' : 'transparent',
              }}
            >
              {/* Checkbox for combination mode */}
              {combinationMode && (
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    backgroundColor: isSelected ? accent : colors.surface.tertiary,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}
                >
                  {isSelected && <MaterialIcons name="check" size={16} color="#fff" />}
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 16, color: colors.text.primary }}>
                  {food.name}
                </Text>
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, color: colors.text.tertiary }}>
                  {food.unit}
                </Text>
              </View>

              {/* Servings adjuster when selected in combination mode */}
              {combinationMode && isSelected && selectedItem ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity
                    onPress={() => updateCombinationServings(food.name, Math.max(0.5, selectedItem.servings - 0.5))}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: colors.surface.tertiary,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <MaterialIcons name="remove" size={16} color={colors.text.primary} />
                  </TouchableOpacity>
                  <Text
                    style={{
                      fontFamily: 'IBMPlexMono_600SemiBold',
                      fontSize: 14,
                      color: accent,
                      marginHorizontal: 10,
                      minWidth: 30,
                      textAlign: 'center',
                    }}
                  >
                    {selectedItem.servings}x
                  </Text>
                  <TouchableOpacity
                    onPress={() => updateCombinationServings(food.name, selectedItem.servings + 0.5)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: colors.surface.tertiary,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <MaterialIcons name="add" size={16} color={colors.text.primary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'IBMPlexMono_600SemiBold', fontSize: 16, color: accent, marginRight: combinationMode ? 0 : 12 }}>
                    {food.calories} kcal
                  </Text>
                  {!combinationMode && (
                    <TouchableOpacity
                      onPress={() => addToFavorites.mutate(food)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialIcons name="favorite-border" size={20} color={colors.text.tertiary} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {filteredFoods.length === 0 && searchQuery && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <MaterialIcons name="search-off" size={48} color={colors.text.tertiary} />
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: 14,
                color: colors.text.tertiary,
                marginTop: 12,
              }}
            >
              No foods found for "{searchQuery}"
            </Text>
          </View>
        )}

        {/* Extra padding for combination summary card */}
        {combinationMode && combinationItems.length >= 2 && (
          <View style={{ height: 180 }} />
        )}
      </ScrollView>

      {/* Combination Summary Card - Fixed at bottom */}
      {combinationMode && combinationItems.length >= 2 && (
        <View
          style={{
            position: 'absolute',
            bottom: 100,
            left: 20,
            right: 20,
            backgroundColor: colors.surface.secondary,
            borderRadius: 16,
            padding: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
            borderWidth: 1,
            borderColor: accent + '30',
          }}
        >
          {/* Items summary */}
          <View style={{ marginBottom: 12 }}>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 14,
                color: colors.text.primary,
                marginBottom: 4,
              }}
            >
              {combinationItems.length} items selected
            </Text>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: 12,
                color: colors.text.secondary,
              }}
              numberOfLines={1}
            >
              {combinationItems.map((item) => `${item.food.name} (${item.servings}x)`).join(', ')}
            </Text>
          </View>

          {/* Combined totals */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 12,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: colors.surface.tertiary,
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: 'IBMPlexMono_700Bold', fontSize: 18, color: accent }}>
                {Math.round(combinationTotals.calories)}
              </Text>
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 11, color: colors.text.tertiary }}>
                kcal
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: 'IBMPlexMono_600SemiBold', fontSize: 16, color: '#FF6B6B' }}>
                {Math.round(combinationTotals.protein)}g
              </Text>
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 11, color: colors.text.tertiary }}>
                Protein
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: 'IBMPlexMono_600SemiBold', fontSize: 16, color: '#FFC107' }}>
                {Math.round(combinationTotals.carbs)}g
              </Text>
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 11, color: colors.text.tertiary }}>
                Carbs
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: 'IBMPlexMono_600SemiBold', fontSize: 16, color: '#1BAD66' }}>
                {Math.round(combinationTotals.fat)}g
              </Text>
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 11, color: colors.text.tertiary }}>
                Fat
              </Text>
            </View>
          </View>

          {/* Save button */}
          <TouchableOpacity
            onPress={() => setShowCombinationModal(true)}
            style={{
              backgroundColor: accent,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 15,
                color: '#fff',
              }}
            >
              Save Combination
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Save Combination Modal */}
      <Modal
        visible={showCombinationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCombinationModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              width: '100%',
              backgroundColor: colors.surface.primary,
              borderRadius: 24,
              padding: 24,
            }}
          >
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_700Bold',
                fontSize: 20,
                color: colors.text.primary,
                marginBottom: 8,
              }}
            >
              Name Your Combination
            </Text>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: 14,
                color: colors.text.secondary,
                marginBottom: 20,
              }}
            >
              Give this meal combo a memorable name like "Morning Nashta" or "Chai Break"
            </Text>

            <TextInput
              value={combinationName}
              onChangeText={setCombinationName}
              placeholder="e.g., Morning Nashta"
              placeholderTextColor={colors.text.tertiary}
              style={{
                fontFamily: 'PlusJakartaSans_500Medium',
                fontSize: 16,
                color: colors.text.primary,
                backgroundColor: colors.surface.secondary,
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
              }}
              autoFocus
            />

            {/* Items preview */}
            <View
              style={{
                backgroundColor: colors.surface.secondary,
                borderRadius: 12,
                padding: 12,
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_500Medium',
                  fontSize: 13,
                  color: colors.text.secondary,
                  marginBottom: 8,
                }}
              >
                Includes:
              </Text>
              {combinationItems.map((item, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_400Regular',
                      fontSize: 13,
                      color: colors.text.primary,
                    }}
                  >
                    {item.food.name} ({item.servings}x)
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'IBMPlexMono_500Medium',
                      fontSize: 12,
                      color: colors.text.tertiary,
                    }}
                  >
                    {Math.round(item.food.calories * item.servings)} kcal
                  </Text>
                </View>
              ))}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: 8,
                  paddingTop: 8,
                  borderTopWidth: 1,
                  borderTopColor: colors.surface.tertiary,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold',
                    fontSize: 13,
                    color: colors.text.primary,
                  }}
                >
                  Total
                </Text>
                <Text
                  style={{
                    fontFamily: 'IBMPlexMono_600SemiBold',
                    fontSize: 13,
                    color: accent,
                  }}
                >
                  {Math.round(combinationTotals.calories)} kcal
                </Text>
              </View>
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowCombinationModal(false);
                  setCombinationName('');
                }}
                style={{
                  flex: 1,
                  backgroundColor: colors.surface.secondary,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold',
                    fontSize: 15,
                    color: colors.text.primary,
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => saveCombination.mutate()}
                disabled={!combinationName.trim() || saveCombination.isPending}
                style={{
                  flex: 1,
                  backgroundColor: combinationName.trim() ? accent : colors.surface.tertiary,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  opacity: saveCombination.isPending ? 0.7 : 1,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold',
                    fontSize: 15,
                    color: combinationName.trim() ? '#fff' : colors.text.tertiary,
                  }}
                >
                  {saveCombination.isPending ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
