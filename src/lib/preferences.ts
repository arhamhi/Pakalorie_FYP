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
