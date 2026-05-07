import { FoodLog, HydrationLog, WeightLog } from '../types/database';
import { HYDRATION_DEFAULT_GOAL } from './preferences';

export interface DailyCalories {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: number;
}

export interface DailyHydration {
  date: string;
  count: number;
}

export type TrendRange = '7d' | '30d' | '90d';

export const dateKey = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
};

export const buildDateRange = (days: number, end: Date = new Date()): string[] => {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    dates.push(dateKey(d));
  }
  return dates;
};

export const aggregateCalories = (logs: FoodLog[]): DailyCalories[] => {
  const byDate: Record<string, DailyCalories> = {};

  logs.forEach((log) => {
    const key = dateKey(log.created_at || new Date());
    if (!byDate[key]) {
      byDate[key] = { date: key, calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 };
    }
    byDate[key].calories += log.calories || 0;
    byDate[key].protein += log.protein || 0;
    byDate[key].carbs += log.carbs || 0;
    byDate[key].fat += log.fat || 0;
    byDate[key].meals += 1;
  });

  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
};

export const aggregateHydration = (logs: HydrationLog[]): DailyHydration[] => {
  const byDate: Record<string, DailyHydration> = {};

  logs.forEach((log) => {
    const key = dateKey(log.log_date);
    if (!byDate[key]) {
      byDate[key] = { date: key, count: 0 };
    }
    byDate[key].count += log.count || 0;
  });

  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
};

export const normalizeSeries = <T extends { date: string }>(
  series: T[],
  range: string[],
  fill: (date: string) => T
): T[] => {
  const map = new Map(series.map((item) => [item.date, item]));
  return range.map((date) => map.get(date) || fill(date));
};

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number; // 0-1
  unlocked: boolean;
  highlight?: string;
}

const percentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.min(1, Math.max(0, value / total));
};

export const computeAchievements = ({
  calories,
  hydration,
  weight,
  targetCalories,
  waterGoal,
  streak,
  hasAvatar,
}: {
  calories: DailyCalories[];
  hydration: DailyHydration[];
  weight: WeightLog[];
  targetCalories: number;
  waterGoal?: number;
  streak?: number | null;
  hasAvatar?: boolean;
}): Achievement[] => {
  const range7 = buildDateRange(7);
  const calMap = new Map(calories.map((c) => [c.date, c]));
  const hydMap = new Map(hydration.map((h) => [h.date, h]));

  const loggedDays = range7.filter((d) => (calMap.get(d)?.meals || 0) > 0).length;
  const hydratedDays = range7.filter((d) => (hydMap.get(d)?.count || 0) >= (waterGoal || HYDRATION_DEFAULT_GOAL)).length;
  const controlledDays = range7.filter((d) => {
    const cals = calMap.get(d)?.calories || 0;
    if (!cals) return false;
    const lower = targetCalories * 0.9;
    const upper = targetCalories * 1.1;
    return cals >= lower && cals <= upper;
  }).length;

  // Filter for valid logs and sort by date (logged_at)
  const sortedWeight = [...weight]
    .filter(w => w.weight_kg > 0)
    .sort((a, b) => {
      const dateA = new Date(a.logged_at || 0).getTime();
      const dateB = new Date(b.logged_at || 0).getTime();
      return dateA - dateB;
    });

  const weightDelta = sortedWeight.length > 1
      ? sortedWeight[sortedWeight.length - 1].weight_kg - sortedWeight[0].weight_kg
      : 0;

  const achievements: Achievement[] = [
    {
      id: 'logging',
      title: 'Consistent Logger',
      description: 'Logged meals on 5 of the last 7 days.',
      icon: 'edit-calendar',
      progress: percentage(loggedDays, 5),
      unlocked: loggedDays >= 5,
      highlight: `${loggedDays}/7 days`,
    },
    {
      id: 'hydration',
      title: 'Hydration Hero',
      description: 'Hit your water goal most days this week.',
      icon: 'water-drop',
      progress: percentage(hydratedDays, 5),
      unlocked: hydratedDays >= 5,
      highlight: `${hydratedDays}/7 days`,
    },
    {
      id: 'calorie-control',
      title: 'Calorie Control',
      description: 'Stayed within 10% of target at least 4 days.',
      icon: 'verified',
      progress: percentage(controlledDays, 4),
      unlocked: controlledDays >= 4,
      highlight: `${controlledDays}/7 days`,
    },
    {
      id: 'streak',
      title: 'Streak Keeper',
      description: 'Keep a streak of healthy logging going.',
      icon: 'local-fire-department',
      progress: percentage(streak || 0, 7),
      unlocked: (streak || 0) >= 7,
      highlight: `${streak || 0} days`,
    },
    {
      id: 'avatar',
      title: 'Profile Glow-up',
      description: 'Upload a profile picture to personalize your space.',
      icon: 'face-retouching-natural',
      progress: hasAvatar ? 1 : 0,
      unlocked: !!hasAvatar,
    },
    {
      id: 'weight-trend',
      title: 'Trend Tracker',
      description: 'Log weight at least twice to see your trajectory.',
      icon: 'monitor-weight',
      progress: percentage(sortedWeight.length, 2),
      unlocked: sortedWeight.length >= 2,
      highlight: sortedWeight.length >= 2 ? `${weightDelta >= 0 ? '+' : ''}${weightDelta.toFixed(1)} kg` : undefined,
    },
  ];

  return achievements;
};
