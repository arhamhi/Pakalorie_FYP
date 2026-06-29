import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Pressable,
  Linking,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CameraIcon,
  ImageSquareIcon,
  XIcon,
  ArrowLeftIcon,
  MinusIcon,
  PlusIcon,
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  CoffeeIcon,
  ForkKnifeIcon,
  BowlFoodIcon,
  IceCreamIcon,
  DatabaseIcon,
  SparkleIcon,
} from 'phosphor-react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { identifyFood } from '../../src/lib/gemini';
import {
  recognizeAndGroundFood,
  type GroundedScanResult,
  type GroundedMeta,
} from '../../src/lib/api';
import { getRecognitionEngine } from '../../src/lib/preferences';
import { PillButton } from '../../src/components/ui';
import { FOOD_MODIFIERS } from '../../src/constants/nutrition';
import { Colors, Elevation } from '../../src/constants/colors';
import { Type, FontFamily } from '../../src/constants/fonts';
import { Spacing, Radius } from '../../src/constants/spacing';

type ScanState = 'camera' | 'preview' | 'result';
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

type ScanResult = GroundedScanResult;

const CONFIDENCE_LOW_THRESHOLD = 0.7;

const MEAL_TYPES: { value: MealType; label: string; Icon: typeof CoffeeIcon }[] = [
  { value: 'breakfast', label: 'Breakfast', Icon: CoffeeIcon },
  { value: 'lunch', label: 'Lunch', Icon: ForkKnifeIcon },
  { value: 'dinner', label: 'Dinner', Icon: BowlFoodIcon },
  { value: 'snack', label: 'Snack', Icon: IceCreamIcon },
];

export default function ScanScreen() {
  const { colors, accent } = useTheme();
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
  const [adjustmentsApplied, setAdjustmentsApplied] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [logged, setLogged] = useState(false);

  const isMountedRef = useRef(true);
  const analysisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against the 300ms auto-run and a manual "Analyze"/"Try again" tap
  // firing recognition twice for the same image.
  const analyzingRef = useRef(false);

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

  // Preview with no image is an invalid state (e.g. a failed capture); bounce
  // back to the camera from an effect, never with a setState during render.
  useEffect(() => {
    if (state === 'preview' && !imageUri) setState('camera');
  }, [state, imageUri]);

  const onCameraReady = () => setIsCameraReady(true);

  const runAnalysis = async (uri: string) => {
    if (analyzingRef.current) return; // a run is already in flight for this image
    analyzingRef.current = true;
    setScanError(null);
    setIsAnalyzing(true);
    try {
      let scanResult: ScanResult;
      // Read the engine pref outside the backend try so an AsyncStorage failure
      // isn't misattributed to the backend pipeline (it never throws anyway).
      const engine = await getRecognitionEngine();
      try {
        // Primary path: live FastAPI pipeline (recognize -> grounded calories).
        // The recognition engine is the user's Settings choice (Gemini default).
        scanResult = await recognizeAndGroundFood(uri, engine);
      } catch (backendError) {
        // Fallback: keep the demo alive with the on-device Gemini path until the
        // backend pipeline is smoke-tested on device (Phase 5 guardrail). The
        // result carries no `grounded` provenance, which the UI surfaces as an
        // "AI estimate" badge instead of the DB-grounded card.
        console.warn('[scan] backend pipeline failed, using Gemini fallback:', backendError);
        scanResult = await identifyFood(uri);
      }

      const identified =
        !!scanResult?.name && scanResult.name.toLowerCase() !== 'unknown';
      if (identified) {
        setResult(scanResult);
        setState('result');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // Stay on the preview and surface an inline, recoverable error instead
        // of a blocking alert that strands the user with no path forward.
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setScanError("We couldn't identify the food in this photo. Try a clearer, well-lit shot.");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to analyze image.';
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setScanError(`${msg} Check your connection and try again.`);
    } finally {
      analyzingRef.current = false;
      setIsAnalyzing(false);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || !isCameraReady) {
      Alert.alert('Camera not ready', 'Wait a moment and try again.');
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, skipProcessing: false });
      if (photo?.uri) {
        setImageUri(photo.uri);
        setState('preview');
        analysisTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) runAnalysis(photo.uri);
        }, 300);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to take picture.';
      Alert.alert('Camera error', `${msg} Try the gallery instead.`);
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'Allow photo library access to upload an image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        setState('preview');
        analysisTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) runAnalysis(uri);
        }, 300);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to pick image.';
      Alert.alert('Error', msg);
    }
  };

  const getModifierMultiplier = () => {
    let multiplier = 1;
    let addition = 0;
    selectedModifiers.forEach((mod) => {
      const modifier = FOOD_MODIFIERS[mod as keyof typeof FOOD_MODIFIERS];
      if (modifier && 'calorieMultiplier' in modifier) multiplier *= modifier.calorieMultiplier;
      if (modifier && 'calorieAdd' in modifier) addition += modifier.calorieAdd;
    });
    return { multiplier, addition };
  };

  const calculateFinalCalories = (withModifiers = false) => {
    if (!result) return 0;
    let calories = result.calories * servings;
    if (withModifiers) {
      const { multiplier, addition } = getModifierMultiplier();
      calories = calories * multiplier + addition;
    }
    return Math.round(calories);
  };

  const calculateFinalMacro = (value: number, withModifiers = false) => {
    let r = value * servings;
    if (withModifiers) {
      const { multiplier } = getModifierMultiplier();
      r *= multiplier;
    }
    return Math.round(r);
  };

  const applyAdjustments = () => {
    setAdjustmentsApplied(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const logMeal = useMutation({
    mutationFn: async () => {
      if (!user || !result) throw new Error('Missing data');
      const useAdjusted = adjustmentsApplied && selectedModifiers.length > 0;
      // NOTE: still writes to Supabase until CDX-001 ships. The history-reading
      // surfaces (home tab, calendar log) read from Supabase too, so flipping
      // to Firestore in isolation would break them. Migration is paired work.
      const { error } = await supabase.from('food_logs').insert({
        user_id: user.id,
        name: result.name,
        calories: calculateFinalCalories(useAdjusted),
        protein: calculateFinalMacro(result.protein, useAdjusted),
        carbs: calculateFinalMacro(result.carbs, useAdjusted),
        fat: calculateFinalMacro(result.fat, useAdjusted),
        meal_type: mealType,
        image_path: imageUri,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['foodLogs'] });
      // Brief on-brand confirmation instead of a blocking alert, then reset.
      setLogged(true);
      setTimeout(() => {
        if (isMountedRef.current) resetScanner();
      }, 1300);
    },
    onError: (error) => {
      console.error('Failed to log meal:', error);
      Alert.alert('Error', 'Failed to log meal. Please try again.');
    },
  });

  const resetScanner = () => {
    setState('camera');
    setImageUri(null);
    setResult(null);
    setSelectedModifiers([]);
    setIsCameraReady(false);
    setServings(1);
    setAdditionalNotes('');
    setAdjustmentsApplied(false);
    setScanError(null);
    setLogged(false);
  };

  // Leaving the result screen discards the scan. Confirm only when the user has
  // made changes worth losing; otherwise go straight back to the camera.
  const handleLeaveResult = () => {
    const hasEdits =
      servings !== 1 || selectedModifiers.length > 0 || additionalNotes.trim().length > 0;
    if (!hasEdits) {
      resetScanner();
      return;
    }
    Alert.alert('Discard this scan?', 'Your adjustments and notes will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: resetScanner },
    ]);
  };

  const toggleModifier = (mod: string) => {
    Haptics.selectionAsync();
    setSelectedModifiers((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
    setAdjustmentsApplied(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Permission states
  // ─────────────────────────────────────────────────────────────────────────

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
        <ActivityIndicator color={accent} />
      </View>
    );
  }

  if (!permission.granted) {
    return <CameraPermissionCard onGrant={requestPermission} canAskAgain={permission.canAskAgain} />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Camera state
  // ─────────────────────────────────────────────────────────────────────────

  if (state === 'camera') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing="back"
          onCameraReady={onCameraReady}
        >
          {/* Top bar — close button */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              paddingHorizontal: Spacing.lg,
              paddingTop: Platform.OS === 'ios' ? 60 : Spacing['2xl'],
            }}
          >
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close scanner"
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: Radius.pill,
                backgroundColor: 'rgba(0,0,0,0.5)',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <XIcon size={20} color="#FFFFFF" weight="bold" />
            </Pressable>
          </View>

          {/* Bottom sheet over camera — capture button + gallery */}
          <View
            style={{
              position: 'absolute',
              bottom: Platform.OS === 'ios' ? 130 : 110,
              left: 0,
              right: 0,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                ...Type.bodyMd,
                color: '#FFFFFF',
                marginBottom: Spacing.lg,
                textAlign: 'center',
                opacity: 0.9,
              }}
            >
              {isCameraReady ? 'Point at your food' : 'Loading camera…'}
            </Text>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing['3xl'],
              }}
            >
              <Pressable
                onPress={pickImage}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Choose a photo from your gallery"
                style={({ pressed }) => ({
                  width: 52,
                  height: 52,
                  borderRadius: Radius.button,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <ImageSquareIcon size={24} color="#FFFFFF" weight="duotone" />
              </Pressable>

              <Pressable
                onPress={takePicture}
                disabled={!isCameraReady}
                accessibilityRole="button"
                accessibilityLabel="Take photo"
                style={({ pressed }) => ({
                  width: 80,
                  height: 80,
                  borderRadius: Radius.pill,
                  backgroundColor: '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 4,
                  borderColor: isCameraReady ? accent : 'rgba(255,255,255,0.3)',
                  opacity: !isCameraReady ? 0.5 : pressed ? 0.85 : 1,
                })}
              >
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: Radius.pill,
                    backgroundColor: isCameraReady ? accent : 'rgba(255,255,255,0.3)',
                  }}
                />
              </Pressable>

              <View style={{ width: 52, height: 52 }} />
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Preview state — image + analyzing overlay + retake/analyze CTAs
  // ─────────────────────────────────────────────────────────────────────────

  if (state === 'preview') {
    if (!imageUri) return null; // the effect above bounces this back to camera
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <Image
          source={{ uri: imageUri }}
          style={{ flex: 1 }}
          resizeMode="cover"
          onError={() => {
            Alert.alert('Error', 'Failed to load image.');
            resetScanner();
          }}
        />

        {isAnalyzing && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              // Ink-tinted scrim (brand hue) rather than flat black.
              backgroundColor: 'rgba(22,29,24,0.82)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <ActivityIndicator size="large" color={accent} />
            <Text
              style={{
                ...Type.headingSm,
                color: '#FFFFFF',
                marginTop: Spacing.md,
              }}
            >
              Analyzing your food…
            </Text>
            <Text
              style={{
                ...Type.bodyMd,
                color: 'rgba(255,255,255,0.7)',
                marginTop: Spacing.xs,
              }}
            >
              Identifying the dish
            </Text>
          </View>
        )}

        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: Spacing.xl,
            paddingTop: Spacing.xl,
            paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl,
            backgroundColor: colors.surface.secondary,
            borderTopLeftRadius: Radius.card * 1.5,
            borderTopRightRadius: Radius.card * 1.5,
          }}
        >
          {scanError && !isAnalyzing && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: Spacing.xs,
                marginBottom: Spacing.md,
              }}
            >
              <WarningCircleIcon size={20} color={Colors.system.warning} weight="fill" />
              <Text style={{ ...Type.bodyMd, color: colors.text.secondary, flex: 1 }}>
                {scanError}
              </Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <PillButton
              variant="secondary"
              label="Retake"
              onPress={resetScanner}
              disabled={isAnalyzing}
              flex
            />
            <PillButton
              variant="primary"
              label={isAnalyzing ? 'Analyzing…' : scanError ? 'Try again' : 'Analyze'}
              onPress={() => imageUri && runAnalysis(imageUri)}
              loading={isAnalyzing}
              disabled={isAnalyzing}
              flex
            />
          </View>
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Result state — DESIGN.md §5: hero card + 4-card macro grid + adjust + save
  // ─────────────────────────────────────────────────────────────────────────

  const useAdjusted = adjustmentsApplied && selectedModifiers.length > 0;
  const heroCalories = calculateFinalCalories(useAdjusted);
  const baseCalories = calculateFinalCalories(false);
  const confidence = result?.confidence ?? 0;
  const isLowConfidence = confidence > 0 && confidence < CONFIDENCE_LOW_THRESHOLD;
  const grounded = result?.grounded;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.primary }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: Spacing.xl,
          paddingTop: Platform.OS === 'ios' ? 60 : Spacing['2xl'],
          paddingBottom: 180,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: Spacing.xl,
          }}
        >
          <Pressable
            onPress={handleLeaveResult}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back to camera"
          >
            <ArrowLeftIcon size={24} color={colors.text.primary} weight="regular" />
          </Pressable>
          <Text style={{ ...Type.headingSm, color: colors.text.primary }}>Log meal</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Food image */}
        {imageUri && (
          <Image
            source={{ uri: imageUri }}
            style={{
              width: '100%',
              height: 200,
              borderRadius: Radius.card,
              marginBottom: Spacing.lg,
            }}
            resizeMode="cover"
          />
        )}

        {/* Hero card */}
        <View
          style={{
            backgroundColor: colors.surface.secondary,
            borderRadius: Radius.card,
            ...Elevation.ambient,
            padding: Spacing.lg,
            marginBottom: Spacing.lg,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: Spacing.sm,
            }}
          >
            <View style={{ flex: 1, paddingRight: Spacing.sm }}>
              <Text style={{ ...Type.headingLg, color: colors.text.primary }}>
                {result?.name}
              </Text>
              {result?.nameUrdu && (
                <Text
                  style={{
                    ...Type.bodyMd,
                    color: colors.text.tertiary,
                    marginTop: Spacing.xxs,
                  }}
                >
                  {result.nameUrdu}
                </Text>
              )}
              <SourcePill isGrounded={!!grounded} accent={accent} colors={colors} />
            </View>
            {confidence > 0 && (
              <ConfidencePill confidence={confidence} accent={accent} colors={colors} />
            )}
          </View>

          {/* Hero calorie number — Instrument Serif */}
          <View style={{ alignItems: 'center', marginVertical: Spacing.lg }}>
            <Text
              style={{
                ...Type.displayHero,
                color: colors.text.primary,
                textAlign: 'center',
              }}
            >
              {heroCalories}
            </Text>
            <Text
              style={{
                ...Type.bodyMd,
                color: colors.text.secondary,
                marginTop: Spacing.xs,
              }}
            >
              kcal
            </Text>
            {useAdjusted && heroCalories !== baseCalories && (
              <Text
                style={{
                  ...Type.bodySm,
                  color: colors.text.tertiary,
                  marginTop: Spacing.xxs,
                }}
              >
                adjusted from {baseCalories} kcal
              </Text>
            )}
          </View>

          {/* Servings stepper */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: Spacing.lg,
              paddingTop: Spacing.md,
              borderTopWidth: 1,
              borderTopColor: colors.surface.tertiary,
            }}
          >
            <StepperButton
              icon={<MinusIcon size={16} color={colors.text.primary} weight="bold" />}
              onPress={() => {
                Haptics.selectionAsync();
                setServings(Math.max(0.5, servings - 0.5));
              }}
              colors={colors}
              accessibilityLabel="Decrease servings"
            />
            <View style={{ alignItems: 'center', minWidth: 80 }}>
              <Text style={{ ...Type.headingMd, color: colors.text.primary }}>{servings}</Text>
              <Text style={{ ...Type.caption, color: colors.text.tertiary }}>
                {servings === 1 ? 'serving' : 'servings'}
              </Text>
            </View>
            <StepperButton
              icon={<PlusIcon size={16} color={colors.text.primary} weight="bold" />}
              onPress={() => {
                Haptics.selectionAsync();
                setServings(Math.min(10, servings + 0.5));
              }}
              colors={colors}
              accessibilityLabel="Increase servings"
            />
          </View>
        </View>

        {/* 4-card macro grid */}
        <View
          style={{
            flexDirection: 'row',
            gap: Spacing.sm,
            marginBottom: Spacing.lg,
          }}
        >
          <MacroCard
            label="Protein"
            value={calculateFinalMacro(result?.protein ?? 0, useAdjusted)}
            colors={colors}
          />
          <MacroCard
            label="Carbs"
            value={calculateFinalMacro(result?.carbs ?? 0, useAdjusted)}
            colors={colors}
          />
          <MacroCard
            label="Fat"
            value={calculateFinalMacro(result?.fat ?? 0, useAdjusted)}
            colors={colors}
          />
          <MacroCard
            label="Fiber"
            value={
              result?.fiber != null
                ? calculateFinalMacro(result.fiber, useAdjusted)
                : null
            }
            colors={colors}
          />
        </View>

        {/* Grounding card — shows the real RAG pipeline output (backend path only) */}
        {grounded && (
          <GroundedSourceCard grounded={grounded} accent={accent} colors={colors} />
        )}

        {/* Alternatives card — shown when confidence is shaky */}
        {isLowConfidence && result?.alternatives && result.alternatives.length > 0 && (
          <View
            style={{
              backgroundColor: colors.surface.secondary,
              borderRadius: Radius.card,
              ...Elevation.ambient,
              padding: Spacing.md,
              marginBottom: Spacing.lg,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}>
              <WarningCircleIcon size={18} color={colors.text.secondary} weight="duotone" />
              <Text
                style={{
                  ...Type.bodySm,
                  fontFamily: FontFamily.geistMedium,
                  color: colors.text.secondary,
                  marginLeft: Spacing.xs,
                }}
              >
                Not quite sure — also could be:
              </Text>
            </View>
            {result.alternatives.slice(0, 3).map((alt) => (
              <View
                key={alt.name}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: Spacing.xs,
                }}
              >
                <Text style={{ ...Type.bodyMd, color: colors.text.primary }}>{alt.name}</Text>
                <Text style={{ ...Type.bodyMd, color: colors.text.tertiary }}>
                  {alt.calories != null
                    ? `~${alt.calories} kcal`
                    : alt.confidence != null
                      ? `${Math.round(alt.confidence * 100)}% match`
                      : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Meal type */}
        <SectionLabel colors={colors}>Meal type</SectionLabel>
        <View style={{ flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.lg }}>
          {MEAL_TYPES.map((m) => {
            const active = mealType === m.value;
            const IconCmp = m.Icon;
            return (
              <Pressable
                key={m.value}
                onPress={() => {
                  Haptics.selectionAsync();
                  setMealType(m.value);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Meal type: ${m.label}`}
                accessibilityState={{ selected: active }}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: Spacing.sm,
                  borderRadius: Radius.button,
                  backgroundColor: active ? accent + '1F' : colors.surface.secondary,
                  borderWidth: 1,
                  borderColor: active ? accent : colors.surface.tertiary,
                  alignItems: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <IconCmp
                  size={20}
                  color={active ? accent : colors.text.secondary}
                  weight={active ? 'fill' : 'duotone'}
                />
                <Text
                  style={{
                    ...Type.caption,
                    color: active ? accent : colors.text.secondary,
                    marginTop: Spacing.xxs,
                  }}
                >
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Modifiers */}
        <SectionLabel colors={colors}>Adjustments</SectionLabel>
        <Text
          style={{
            ...Type.bodySm,
            color: colors.text.tertiary,
            marginTop: -Spacing.xs,
            marginBottom: Spacing.sm,
          }}
        >
          Tap to log how this dish was prepared.
        </Text>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: Spacing.xs,
            marginBottom: Spacing.md,
          }}
        >
          {Object.entries(FOOD_MODIFIERS).map(([key, mod]) => {
            const active = selectedModifiers.includes(key);
            return (
              <Pressable
                key={key}
                onPress={() => toggleModifier(key)}
                accessibilityRole="button"
                accessibilityLabel={mod.label}
                accessibilityState={{ selected: active }}
                style={({ pressed }) => ({
                  paddingHorizontal: Spacing.md,
                  paddingVertical: Spacing.sm,
                  borderRadius: Radius.pill,
                  backgroundColor: active ? accent + '1F' : colors.surface.secondary,
                  borderWidth: 1,
                  borderColor: active ? accent : colors.surface.tertiary,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    ...Type.bodySm,
                    fontFamily: FontFamily.geistMedium,
                    color: active ? accent : colors.text.primary,
                  }}
                >
                  {mod.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Apply / Applied banner */}
        {selectedModifiers.length > 0 && !adjustmentsApplied && (
          <Pressable
            onPress={applyAdjustments}
            accessibilityRole="button"
            accessibilityLabel="Recalculate calories and macros with adjustments"
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: Spacing.xs,
              backgroundColor: accent + '15',
              borderWidth: 1,
              borderColor: accent + '40',
              paddingVertical: Spacing.sm,
              borderRadius: Radius.button,
              marginBottom: Spacing.lg,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <ArrowsClockwiseIcon size={18} color={accent} weight="bold" />
            <Text
              style={{
                ...Type.bodyMd,
                fontFamily: FontFamily.geistSemiBold,
                color: accent,
              }}
            >
              Recalculate calories &amp; macros
            </Text>
          </Pressable>
        )}
        {selectedModifiers.length > 0 && adjustmentsApplied && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: Spacing.xs,
              backgroundColor: accent + '12',
              paddingVertical: Spacing.sm,
              borderRadius: Radius.button,
              marginBottom: Spacing.lg,
            }}
          >
            <CheckCircleIcon size={18} color={accent} weight="fill" />
            <Text
              style={{
                ...Type.bodySm,
                fontFamily: FontFamily.geistMedium,
                color: accent,
              }}
            >
              Adjustments applied
            </Text>
          </View>
        )}

        {/* Notes */}
        <SectionLabel colors={colors}>Notes</SectionLabel>
        <TextInput
          value={additionalNotes}
          onChangeText={setAdditionalNotes}
          placeholder="Anything else? (e.g., homemade, extra naan)"
          placeholderTextColor={colors.text.tertiary}
          accessibilityLabel="Notes about this meal"
          multiline
          numberOfLines={3}
          style={{
            ...Type.bodyLg,
            color: colors.text.primary,
            backgroundColor: colors.surface.tertiary,
            borderRadius: Radius.input,
            padding: Spacing.md,
            minHeight: 84,
            textAlignVertical: 'top',
            marginBottom: Spacing.lg,
          }}
        />

        {/* Medical disclaimer */}
        <Text
          style={{
            ...Type.bodySm,
            color: colors.text.tertiary,
            textAlign: 'center',
            paddingHorizontal: Spacing.md,
            marginTop: Spacing.sm,
          }}
        >
          Estimates only. Not a substitute for medical advice.
        </Text>
      </ScrollView>

      {/* Sticky save bar */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: Spacing.xl,
          paddingTop: Spacing.md,
          paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl,
          backgroundColor: colors.surface.primary,
          borderTopWidth: 1,
          borderTopColor: colors.surface.tertiary,
        }}
      >
        <PillButton
          variant="save"
          label="Log meal"
          onPress={() => logMeal.mutate()}
          loading={logMeal.isPending}
          disabled={!user}
        />
      </View>

      {/* Logged confirmation — brief on-brand banner before the reset */}
      {logged && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(22,29,24,0.55)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.sm,
              backgroundColor: colors.surface.secondary,
              paddingVertical: Spacing.md,
              paddingHorizontal: Spacing.lg,
              borderRadius: Radius.pill,
              ...Elevation.banner,
            }}
          >
            <CheckCircleIcon size={22} color={accent} weight="fill" />
            <Text
              style={{
                ...Type.bodyLg,
                fontFamily: FontFamily.geistSemiBold,
                color: colors.text.primary,
              }}
            >
              Logged to history
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Local components — kept inline since they're not reused outside this screen
// ─────────────────────────────────────────────────────────────────────────────

interface PermissionCardProps {
  onGrant: () => void;
  canAskAgain: boolean;
}

function CameraPermissionCard({ onGrant, canAskAgain }: PermissionCardProps) {
  const { colors, accent } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface.primary,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
      }}
    >
      <View
        style={{
          width: '100%',
          backgroundColor: colors.surface.secondary,
          borderRadius: Radius.card,
          ...Elevation.ambient,
          padding: Spacing.xl,
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: Radius.pill,
            backgroundColor: accent + '15',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: Spacing.lg,
          }}
        >
          <CameraIcon size={28} color={accent} weight="duotone" />
        </View>

        <Text
          style={{
            ...Type.headingSm,
            color: colors.text.primary,
            marginBottom: Spacing.xs,
            textAlign: 'center',
          }}
        >
          Camera access needed
        </Text>
        <Text
          style={{
            ...Type.bodyMd,
            color: colors.text.secondary,
            textAlign: 'center',
            marginBottom: Spacing.xl,
          }}
        >
          Allow camera access to scan your meals and track calories automatically.
        </Text>

        <View style={{ width: '100%' }}>
          <PillButton
            variant="primary"
            label={canAskAgain ? 'Grant permission' : 'Open settings'}
            onPress={canAskAgain ? onGrant : () => Linking.openSettings()}
          />
        </View>
      </View>
    </View>
  );
}

interface ConfidencePillProps {
  confidence: number;
  accent: string;
  colors: ReturnType<typeof useTheme>['colors'];
}

function ConfidencePill({ confidence, accent, colors }: ConfidencePillProps) {
  const pct = Math.round(confidence * 100);
  const isLow = confidence < CONFIDENCE_LOW_THRESHOLD;
  const tint = isLow ? colors.text.secondary : accent;
  const bg = isLow ? colors.surface.tertiary : accent + '1F';
  return (
    <View
      style={{
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: Radius.pill,
        backgroundColor: bg,
      }}
    >
      <Text
        style={{
          ...Type.caption,
          color: tint,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        }}
      >
        {pct}% sure
      </Text>
    </View>
  );
}

interface SourcePillProps {
  isGrounded: boolean;
  accent: string;
  colors: ReturnType<typeof useTheme>['colors'];
}

// Small provenance badge under the dish name: backend = DB-grounded, Gemini
// fallback = on-device AI estimate. Keeps the demo honest about which path ran.
function SourcePill({ isGrounded, accent, colors }: SourcePillProps) {
  const tint = isGrounded ? accent : colors.text.tertiary;
  const bg = isGrounded ? accent + '14' : colors.surface.tertiary;
  const label = isGrounded ? 'DB-grounded' : 'AI estimate';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        marginTop: Spacing.xs,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: Radius.pill,
        backgroundColor: bg,
      }}
    >
      {isGrounded ? (
        <DatabaseIcon size={12} color={tint} weight="duotone" />
      ) : (
        <SparkleIcon size={12} color={tint} weight="duotone" />
      )}
      <Text
        style={{
          ...Type.caption,
          color: tint,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

interface GroundedSourceCardProps {
  grounded: GroundedMeta;
  accent: string;
  colors: ReturnType<typeof useTheme>['colors'];
}

function dataSourceLabel(source: string | null): string {
  if (source === 'desi_v1') return 'Pakistani food database';
  if (source === 'usda') return 'USDA reference';
  return source ? source : 'Food database';
}

function modelLabel(model: string): string {
  if (model === 'gemini_grounded') return 'AI grounded in DB';
  if (model === 'local_grounded_fallback') return 'DB lookup';
  return model;
}

const ENGINE_LABELS: Record<GroundedMeta['engine'], string> = {
  gemini: 'Recognized by Gemini',
  yolo: 'Recognized by our YOLOv8 model',
};

function engineLabel(engine: GroundedMeta['engine']): string {
  return ENGINE_LABELS[engine] ?? ENGINE_LABELS.gemini;
}

// Shows the real RAG output: which DB row the calories were grounded in, the
// data source, the model that did the grounding, and the engine's "why".
function GroundedSourceCard({ grounded, accent, colors }: GroundedSourceCardProps) {
  return (
    <View
      style={{
        backgroundColor: colors.surface.secondary,
        borderRadius: Radius.card,
        ...Elevation.ambient,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}>
        <DatabaseIcon size={18} color={accent} weight="duotone" />
        <Text
          style={{
            ...Type.bodySm,
            fontFamily: FontFamily.geistMedium,
            color: colors.text.secondary,
            marginLeft: Spacing.xs,
          }}
        >
          How we got this
        </Text>
      </View>

      {grounded.matchedLabel && (
        <Text style={{ ...Type.bodyMd, color: colors.text.primary, marginBottom: Spacing.xxs }}>
          Matched{' '}
          <Text style={{ fontFamily: FontFamily.geistSemiBold }}>{grounded.matchedLabel}</Text>
          {grounded.portionLabel ? ` · ${grounded.portionLabel}` : ''}
        </Text>
      )}

      {grounded.why ? (
        <Text style={{ ...Type.bodySm, color: colors.text.tertiary, marginBottom: Spacing.sm }}>
          {grounded.why}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
        <GroundedTag label={engineLabel(grounded.engine)} accent={accent} colors={colors} />
        <GroundedTag label={dataSourceLabel(grounded.dataSource)} accent={accent} colors={colors} />
        <GroundedTag label={modelLabel(grounded.modelUsed)} accent={accent} colors={colors} />
      </View>
    </View>
  );
}

interface GroundedTagProps {
  label: string;
  accent: string;
  colors: ReturnType<typeof useTheme>['colors'];
}

function GroundedTag({ label, accent, colors }: GroundedTagProps) {
  return (
    <View
      style={{
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: Radius.pill,
        backgroundColor: accent + '12',
      }}
    >
      <Text
        style={{
          ...Type.caption,
          color: accent,
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

interface MacroCardProps {
  label: string;
  value: number | null;
  colors: ReturnType<typeof useTheme>['colors'];
}

function MacroCard({ label, value, colors }: MacroCardProps) {
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={value != null ? `${label}, ${value} grams` : `${label}, not available`}
      style={{
        flex: 1,
        backgroundColor: colors.surface.secondary,
        borderRadius: Radius.card,
        ...Elevation.ambient,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.xs,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          ...Type.caption,
          color: colors.text.tertiary,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          marginBottom: Spacing.xxs,
        }}
      >
        {label}
      </Text>
      <Text style={{ ...Type.headingMd, color: colors.text.primary }}>
        {value != null ? value : '—'}
      </Text>
      <Text style={{ ...Type.bodySm, color: colors.text.tertiary }}>g</Text>
    </View>
  );
}

interface SectionLabelProps {
  children: React.ReactNode;
  colors: ReturnType<typeof useTheme>['colors'];
}

function SectionLabel({ children, colors }: SectionLabelProps) {
  return (
    <Text
      style={{
        ...Type.headingSm,
        color: colors.text.primary,
        marginBottom: Spacing.sm,
      }}
    >
      {children}
    </Text>
  );
}

interface StepperButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  accessibilityLabel: string;
}

function StepperButton({ icon, onPress, colors, accessibilityLabel }: StepperButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: Radius.pill,
        backgroundColor: colors.surface.tertiary,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {icon}
    </Pressable>
  );
}

