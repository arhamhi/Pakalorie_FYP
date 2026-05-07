import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { identifyFood, FoodIdentificationResult } from '../../src/lib/gemini';
import { Button, Card } from '../../src/components/ui';
import { FOOD_MODIFIERS } from '../../src/constants/nutrition';

type ScanState = 'camera' | 'preview' | 'result';
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface ScanResult extends FoodIdentificationResult {}

const MEAL_TYPES: { value: MealType; label: string; icon: string }[] = [
  { value: 'breakfast', label: 'Breakfast', icon: 'free-breakfast' },
  { value: 'lunch', label: 'Lunch', icon: 'restaurant' },
  { value: 'dinner', label: 'Dinner', icon: 'dinner-dining' },
  { value: 'snack', label: 'Snack', icon: 'icecream' },
];

export default function ScanScreen() {
  const { colors, accent, theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<ScanState>('camera');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [servings, setServings] = useState(1);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isCameraReady, setIsCameraReady] = useState(false);

  const onCameraReady = () => {
    console.log('Camera is ready');
    setIsCameraReady(true);
  };

  // Ref to track if we should auto-analyze
  const shouldAutoAnalyze = useRef(false);
  
  // Ref to track component mount state and timer IDs for cleanup
  const isMountedRef = useRef(true);
  const analysisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Cleanup effect to prevent memory leaks and stale callbacks
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (analysisTimerRef.current) {
        clearTimeout(analysisTimerRef.current);
        analysisTimerRef.current = null;
      }
    };
  }, []);

  // Analyze function
  const runAnalysis = async (uri: string) => {
    console.log('runAnalysis called with URI:', uri);
    setIsAnalyzing(true);

    try {
      const scanResult = await identifyFood(uri);
      console.log('Analysis result:', scanResult);

      if (scanResult && scanResult.name) {
        setResult(scanResult);
        setState('result');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Error', 'Could not identify food in the image. Please try with a clearer photo.');
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      Alert.alert(
        'Analysis Failed',
        error?.message || 'Failed to analyze image. Check your internet connection and try again.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Use Gemini AI for food identification
  const analyzeImage = async (uri: string): Promise<ScanResult> => {
    return await identifyFood(uri);
  };

  const takePicture = async () => {
    console.log('takePicture called');
    console.log('cameraRef.current:', !!cameraRef.current);
    console.log('isCameraReady:', isCameraReady);

    if (!cameraRef.current || !isCameraReady) {
      Alert.alert('Error', 'Camera not ready. Please wait a moment and try again.');
      return;
    }

    try {
      console.log('Taking picture...');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });
      console.log('Photo taken:', photo);
      if (photo?.uri) {
        setImageUri(photo.uri);
        setState('preview');
        // Auto-start analysis with mounted check
        analysisTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            runAnalysis(photo.uri);
          }
        }, 300);
      } else {
        Alert.alert('Error', 'Failed to capture photo. Please try again.');
      }
    } catch (error: any) {
      console.error('Error taking picture:', error);
      Alert.alert('Camera Error', error?.message || 'Failed to take picture. Try using gallery instead.');
    }
  };

  const pickImage = async () => {
    console.log('pickImage called');
    try {
      console.log('Requesting media library permission...');
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Permission result:', permissionResult);
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to select images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets && result.assets[0]) {
        const uri = result.assets[0].uri;
        console.log('Selected image URI:', uri);
        setImageUri(uri);
        setState('preview');
        // Auto-start analysis with mounted check
        analysisTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            runAnalysis(uri);
          }
        }, 300);
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Error', error?.message || 'Failed to pick image from gallery.');
    }
  };

  const handleAnalyze = () => {
    console.log('handleAnalyze button pressed');
    if (imageUri) {
      runAnalysis(imageUri);
    }
  };

  // Calculate modifier multiplier for calories
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

  const calculateFinalCalories = (withModifiers = false) => {
    if (!result) return 0;
    let calories = result.calories * servings;
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

  // State to track if adjustments are applied
  const [adjustmentsApplied, setAdjustmentsApplied] = useState(false);

  // Apply adjustments when modifiers change
  const applyAdjustments = () => {
    setAdjustmentsApplied(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Build notes string from quick adds and additional notes
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

  const logMeal = useMutation({
    mutationFn: async () => {
      if (!user || !result) throw new Error('Missing data');

      const notes = buildNotesString();
      const useAdjusted = adjustmentsApplied && selectedModifiers.length > 0;
      const { error } = await supabase.from('food_logs').insert({
        user_id: user.id,
        name: result.name,
        calories: calculateFinalCalories(useAdjusted),
        protein: calculateFinalMacro(result.protein, useAdjusted),
        carbs: calculateFinalMacro(result.carbs, useAdjusted),
        fat: calculateFinalMacro(result.fat, useAdjusted),
        meal_type: mealType,
        image_path: imageUri,
        notes: notes || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['foodLogs'] });
      Alert.alert('Success', 'Meal logged successfully!');
      resetScanner();
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to log meal. Please try again.');
    },
  });

  const resetScanner = () => {
    setState('camera');
    setImageUri(null);
    setResult(null);
    setSelectedModifiers([]);
    setIsCameraReady(false);
    shouldAutoAnalyze.current = false;
    setServings(1);
    setAdditionalNotes('');
    setAdjustmentsApplied(false);
  };

  const toggleModifier = (mod: string) => {
    setSelectedModifiers(prev =>
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    );
  };

  // Handle permission loading state
  if (permission === null) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.surface.primary,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: colors.text.secondary }}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.surface.primary,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
        }}
      >
        <MaterialIcons name="photo-camera" size={64} color={colors.text.tertiary} />
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_600SemiBold',
            fontSize: 20,
            color: colors.text.primary,
            marginTop: 24,
            marginBottom: 8,
          }}
        >
          Camera Access Needed
        </Text>
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_400Regular',
            fontSize: 14,
            color: colors.text.secondary,
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          Allow camera access to scan your meals and track calories automatically.
        </Text>
        <Button title="Grant Permission" onPress={requestPermission} size="lg" />
      </View>
    );
  }

  if (state === 'camera') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing="back"
          onCameraReady={onCameraReady}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: 60,
            }}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(0,0,0,0.5)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Bottom Controls */}
          <View
            style={{
              position: 'absolute',
              bottom: 120,
              left: 0,
              right: 0,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_500Medium',
                fontSize: 14,
                color: '#fff',
                marginBottom: 24,
              }}
            >
              {isCameraReady ? 'Point at your food' : 'Loading camera...'}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 40,
              }}
            >
              <TouchableOpacity
                onPress={pickImage}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 12,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <MaterialIcons name="photo-library" size={24} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={takePicture}
                disabled={!isCameraReady}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: '#fff',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 4,
                  borderColor: isCameraReady ? accent : 'rgba(255,255,255,0.3)',
                  opacity: isCameraReady ? 1 : 0.5,
                }}
              >
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: isCameraReady ? accent : 'rgba(255,255,255,0.3)',
                  }}
                />
              </TouchableOpacity>

              <View style={{ width: 50, height: 50 }} />
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  if (state === 'preview') {
    if (!imageUri) {
      // Safety check - go back to camera if no image
      setState('camera');
      return null;
    }

    return (
      <View style={{ flex: 1, backgroundColor: colors.surface.primary }}>
        <Image
          source={{ uri: imageUri }}
          style={{ flex: 1 }}
          resizeMode="cover"
          onError={(e) => {
            console.error('Image load error:', e.nativeEvent.error);
            Alert.alert('Error', 'Failed to load image. Please try again.');
            resetScanner();
          }}
        />

        {/* Loading Overlay */}
        {isAnalyzing && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.7)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <ActivityIndicator size="large" color={accent} />
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 18,
                color: '#fff',
                marginTop: 16,
              }}
            >
              Analyzing your food...
            </Text>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: 14,
                color: 'rgba(255,255,255,0.7)',
                marginTop: 8,
              }}
            >
              Ustad is identifying the dish
            </Text>
          </View>
        )}

        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: 24,
            paddingBottom: 40,
            backgroundColor: colors.surface.primary,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
        >
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button
              title="Retake"
              onPress={resetScanner}
              variant="outline"
              style={{ flex: 1 }}
              disabled={isAnalyzing}
            />
            <Button
              title={isAnalyzing ? 'Analyzing...' : 'Analyze'}
              onPress={handleAnalyze}
              loading={isAnalyzing}
              style={{ flex: 1 }}
              disabled={isAnalyzing}
            />
          </View>
        </View>
      </View>
    );
  }

  // Result screen
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
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <TouchableOpacity onPress={resetScanner}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_600SemiBold',
              fontSize: 18,
              color: colors.text.primary,
            }}
          >
            Log Meal
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Food Image */}
        {imageUri && (
          <Image
            source={{ uri: imageUri }}
            style={{
              width: '100%',
              height: 200,
              borderRadius: 16,
              marginBottom: 20,
            }}
            resizeMode="cover"
          />
        )}

        {/* Food Info Card */}
        <Card style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_700Bold',
              fontSize: 24,
              color: colors.text.primary,
              marginBottom: 4,
            }}
          >
            {result?.name}
          </Text>
          {result?.nameUrdu && (
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: 14,
                color: colors.text.tertiary,
                marginBottom: 8,
              }}
            >
              {result.nameUrdu}
            </Text>
          )}

          {/* Servings Slider */}
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
              <Text
                style={{
                  fontFamily: 'IBMPlexMono_600SemiBold',
                  fontSize: 18,
                  color: '#FF6B6B',
                }}
              >
                {adjustmentsApplied ? calculateFinalMacro(result?.protein || 0, true) : calculateFinalMacro(result?.protein || 0)}g
              </Text>
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_400Regular',
                  fontSize: 12,
                  color: colors.text.tertiary,
                }}
              >
                Protein
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text
                style={{
                  fontFamily: 'IBMPlexMono_600SemiBold',
                  fontSize: 18,
                  color: '#FFC107',
                }}
              >
                {adjustmentsApplied ? calculateFinalMacro(result?.carbs || 0, true) : calculateFinalMacro(result?.carbs || 0)}g
              </Text>
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_400Regular',
                  fontSize: 12,
                  color: colors.text.tertiary,
                }}
              >
                Carbs
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text
                style={{
                  fontFamily: 'IBMPlexMono_600SemiBold',
                  fontSize: 18,
                  color: '#1BAD66',
                }}
              >
                {adjustmentsApplied ? calculateFinalMacro(result?.fat || 0, true) : calculateFinalMacro(result?.fat || 0)}g
              </Text>
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_400Regular',
                  fontSize: 12,
                  color: colors.text.tertiary,
                }}
              >
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
          {MEAL_TYPES.map(type => (
            <TouchableOpacity
              key={type.value}
              onPress={() => setMealType(type.value)}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor:
                  mealType === type.value ? accent + '20' : colors.surface.secondary,
                borderWidth: mealType === type.value ? 2 : (theme === 'light' ? 1 : 0),
                borderColor: mealType === type.value ? accent : (theme === 'light' ? colors.border : 'transparent'),
                alignItems: 'center',
              }}
            >
              <MaterialIcons
                name={type.icon as any}
                size={20}
                color={mealType === type.value ? accent : colors.text.secondary}
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
              onPress={() => {
                toggleModifier(key);
                setAdjustmentsApplied(false); // Reset when modifiers change
              }}
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

        {/* Readjust Button - Shows when modifiers are selected but not yet applied */}
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
