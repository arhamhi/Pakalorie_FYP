import AsyncStorage from '@react-native-async-storage/async-storage';

const HYDRATION_GOAL_KEY = '@pakalorie_hydration_goal';
const DEFAULT_GOAL = 8;

export const getHydrationGoal = async (): Promise<number> => {
  try {
    const stored = await AsyncStorage.getItem(HYDRATION_GOAL_KEY);
    if (!stored) return DEFAULT_GOAL;
    const parsed = Number(stored);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_GOAL;
  } catch (error) {
    console.warn('Failed to load hydration goal', error);
    return DEFAULT_GOAL;
  }
};

export const setHydrationGoal = async (goal: number): Promise<void> => {
  try {
    const normalized = Math.max(1, Math.round(goal));
    await AsyncStorage.setItem(HYDRATION_GOAL_KEY, normalized.toString());
  } catch (error) {
    console.warn('Failed to save hydration goal', error);
  }
};

export const HYDRATION_DEFAULT_GOAL = DEFAULT_GOAL;

const RECOGNITION_ENGINE_KEY = '@pakalorie_recognition_engine';

/** Server-side recognition engine. `gemini` is the default/recommended path;
 * `yolo` runs our own trained model (demo — 217 classes, lower accuracy). */
export type RecognitionEngine = 'gemini' | 'yolo';
export const DEFAULT_RECOGNITION_ENGINE: RecognitionEngine = 'gemini';

export const getRecognitionEngine = async (): Promise<RecognitionEngine> => {
  try {
    const stored = await AsyncStorage.getItem(RECOGNITION_ENGINE_KEY);
    return stored === 'yolo' ? 'yolo' : DEFAULT_RECOGNITION_ENGINE;
  } catch (error) {
    console.warn('Failed to load recognition engine', error);
    return DEFAULT_RECOGNITION_ENGINE;
  }
};

export const setRecognitionEngine = async (engine: RecognitionEngine): Promise<void> => {
  try {
    await AsyncStorage.setItem(RECOGNITION_ENGINE_KEY, engine);
  } catch (error) {
    console.warn('Failed to save recognition engine', error);
  }
};
