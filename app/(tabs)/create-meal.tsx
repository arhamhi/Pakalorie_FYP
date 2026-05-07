import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { Card, Button } from '../../src/components/ui';
import { generateMealFromDescription } from '../../src/lib/gemini';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface GeneratedMeal {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
}

const MEAL_TYPES: { value: MealType; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { value: 'breakfast', label: 'Breakfast', icon: 'free-breakfast' },
  { value: 'lunch', label: 'Lunch', icon: 'lunch-dining' },
  { value: 'dinner', label: 'Dinner', icon: 'dinner-dining' },
  { value: 'snack', label: 'Snack', icon: 'icecream' },
];

export default function CreateMealScreen() {
  const { colors, accent, theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [mealName, setMealName] = useState('');
  const [description, setDescription] = useState('');
  const [generatedMeal, setGeneratedMeal] = useState<GeneratedMeal | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [servings, setServings] = useState(1);
  const [saveToFavorites, setSaveToFavorites] = useState(false);

  const generateNutrition = async () => {
    if (!mealName.trim()) {
      Alert.alert('Missing Info', 'Please enter a meal name');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateMealFromDescription(mealName.trim(), description.trim() || undefined);
      setGeneratedMeal({
        name: result.name,
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
        servingSize: result.servingSize,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Generation error:', error);
      Alert.alert('Error', 'Could not generate nutrition info. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const logMeal = useMutation({
    mutationFn: async () => {
      if (!user || !generatedMeal) throw new Error('Missing data');

      // Log to food_logs
      const { error: logError } = await supabase.from('food_logs').insert({
        user_id: user.id,
        name: generatedMeal.name,
        calories: Math.round(generatedMeal.calories * servings),
        protein: Math.round(generatedMeal.protein * servings),
        carbs: Math.round(generatedMeal.carbs * servings),
        fat: Math.round(generatedMeal.fat * servings),
        meal_type: mealType,
      });

      if (logError) throw logError;

      // Optionally save to favorites
      if (saveToFavorites) {
        const { error: favError } = await supabase.from('favorites').insert({
          user_id: user.id,
          food_data: {
            name: generatedMeal.name,
            calories: generatedMeal.calories,
            protein: generatedMeal.protein,
            carbs: generatedMeal.carbs,
            fat: generatedMeal.fat,
            unit: generatedMeal.servingSize,
          },
          is_combination: false,
        });

        if (favError) console.error('Failed to save to favorites:', favError);
      }
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['foodLogs'] });
      if (saveToFavorites) {
        queryClient.invalidateQueries({ queryKey: ['favorites'] });
      }
      Alert.alert('Success', 'Custom meal logged!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error) => {
      console.error('Log error:', error);
      Alert.alert('Error', 'Failed to log meal. Please try again.');
    },
  });

  // Show generation form if no meal generated yet
  if (!generatedMeal) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface.primary }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 120 }}>
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
                Create Custom Meal
              </Text>
            </View>

            {/* Info Card */}
            <Card style={{ marginBottom: 24, backgroundColor: accent + '10' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="auto-awesome" size={24} color={accent} />
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_500Medium',
                    fontSize: 14,
                    color: colors.text.secondary,
                    marginLeft: 12,
                    flex: 1,
                  }}
                >
                  Describe your meal and AI will estimate the nutrition based on Pakistani cooking methods
                </Text>
              </View>
            </Card>

            {/* Meal Name Input */}
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 16,
                color: colors.text.primary,
                marginBottom: 8,
              }}
            >
              Meal Name *
            </Text>
            <View
              style={{
                backgroundColor: colors.surface.secondary,
                borderRadius: 12,
                paddingHorizontal: 16,
                marginBottom: 20,
              }}
            >
              <TextInput
                value={mealName}
                onChangeText={setMealName}
                placeholder="e.g., Homemade Chicken Biryani"
                placeholderTextColor={colors.text.tertiary}
                style={{
                  fontFamily: 'PlusJakartaSans_400Regular',
                  fontSize: 16,
                  color: colors.text.primary,
                  paddingVertical: 14,
                }}
              />
            </View>

            {/* Description Input */}
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 16,
                color: colors.text.primary,
                marginBottom: 8,
              }}
            >
              Description (Optional)
            </Text>
            <View
              style={{
                backgroundColor: colors.surface.secondary,
                borderRadius: 12,
                paddingHorizontal: 16,
                marginBottom: 24,
              }}
            >
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="e.g., Extra ghee, with raita, medium portion"
                placeholderTextColor={colors.text.tertiary}
                multiline
                numberOfLines={3}
                style={{
                  fontFamily: 'PlusJakartaSans_400Regular',
                  fontSize: 16,
                  color: colors.text.primary,
                  paddingVertical: 14,
                  minHeight: 80,
                  textAlignVertical: 'top',
                }}
              />
            </View>

            {/* Examples */}
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_500Medium',
                fontSize: 14,
                color: colors.text.tertiary,
                marginBottom: 12,
              }}
            >
              Examples:
            </Text>
            <View style={{ gap: 8, marginBottom: 24 }}>
              {[
                'Aloo Paratha with butter',
                'Daal Chawal - small portion',
                'Chicken Karahi - restaurant style, extra oily',
                'Chai with biscuits',
              ].map((example) => (
                <TouchableOpacity
                  key={example}
                  onPress={() => setMealName(example)}
                  style={{
                    backgroundColor: colors.surface.secondary,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_400Regular',
                      fontSize: 14,
                      color: colors.text.secondary,
                    }}
                  >
                    {example}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Generate Button */}
        <View style={{ position: 'absolute', bottom: 100, left: 20, right: 20 }}>
          <Button
            title={isGenerating ? 'Generating...' : 'Generate Nutrition'}
            onPress={generateNutrition}
            size="lg"
            fullWidth
            loading={isGenerating}
            disabled={!mealName.trim() || isGenerating}
          />
        </View>
      </View>
    );
  }

  // Show meal details and log options
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.primary }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 120 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity onPress={() => setGeneratedMeal(null)}>
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
            Log Custom Meal
          </Text>
        </View>

        {/* Meal Info Card */}
        <Card style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_700Bold',
              fontSize: 24,
              color: colors.text.primary,
              marginBottom: 4,
            }}
          >
            {generatedMeal.name}
          </Text>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_400Regular',
              fontSize: 14,
              color: colors.text.tertiary,
              marginBottom: 16,
            }}
          >
            {generatedMeal.servingSize}
          </Text>

          {/* Servings Adjuster */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
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
                servings
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
          <Text
            style={{
              fontFamily: 'IBMPlexMono_700Bold',
              fontSize: 40,
              color: accent,
              textAlign: 'center',
            }}
          >
            {Math.round(generatedMeal.calories * servings)}
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
                {Math.round(generatedMeal.protein * servings)}g
              </Text>
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: colors.text.tertiary }}>
                Protein
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: 'IBMPlexMono_600SemiBold', fontSize: 18, color: '#FFC107' }}>
                {Math.round(generatedMeal.carbs * servings)}g
              </Text>
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: colors.text.tertiary }}>
                Carbs
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: 'IBMPlexMono_600SemiBold', fontSize: 18, color: '#1BAD66' }}>
                {Math.round(generatedMeal.fat * servings)}g
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
                borderWidth: 2,
                borderColor: mealType === type.value ? accent : 'transparent',
                alignItems: 'center',
              }}
            >
              <MaterialIcons
                name={type.icon}
                size={20}
                color={mealType === type.value ? accent : colors.text.tertiary}
              />
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_500Medium',
                  fontSize: 11,
                  color: mealType === type.value ? accent : colors.text.secondary,
                  marginTop: 4,
                }}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save to Favorites Toggle */}
        <TouchableOpacity
          onPress={() => setSaveToFavorites(!saveToFavorites)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface.secondary,
            borderRadius: 12,
            padding: 16,
          }}
        >
          <MaterialIcons
            name={saveToFavorites ? 'favorite' : 'favorite-border'}
            size={22}
            color={saveToFavorites ? accent : colors.text.tertiary}
          />
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_500Medium',
              fontSize: 16,
              color: colors.text.primary,
              marginLeft: 12,
              flex: 1,
            }}
          >
            Save to Favorites
          </Text>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              backgroundColor: saveToFavorites ? accent : colors.surface.tertiary,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {saveToFavorites && <MaterialIcons name="check" size={16} color="#fff" />}
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Log Button */}
      <View style={{ position: 'absolute', bottom: 100, left: 20, right: 20 }}>
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
