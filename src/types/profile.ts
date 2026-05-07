/**
 * Firestore `users/{uid}` document shape.
 *
 * This replaces the Supabase-generated `Profile = Tables<'profiles'>` type
 * during the P1 Mid migration. Field names mirror the previous Supabase
 * schema (snake_case) to minimize churn in consumer screens — we only
 * change WHERE the data lives, not its shape.
 *
 * `onboarding_complete` is new for P1 Mid (FYP doc requires gating onboarding).
 */
export interface Profile {
  id: string;                          // Firebase UID
  display_name: string | null;
  avatar_url: string | null;
  dob: string | null;                  // ISO date "YYYY-MM-DD"
  gender: 'male' | 'female' | 'other' | null;
  current_weight_kg: number | null;
  height_cm: number | null;
  goal_type: 'lose' | 'maintain' | 'gain' | null;
  activity_level: number | null;       // 1.2 – 1.9 multiplier
  daily_target_kcal: number | null;
  streak_count: number;
  theme_preference: 'light' | 'dark' | 'system';
  accent_preference: 'green' | 'gold' | 'coral';
  onboarding_complete: boolean;
  is_premium: boolean;                 // gating for premium features (P2 scope)
  updated_at: string;                  // ISO timestamp
}

export type ProfileUpdate = Partial<Omit<Profile, 'id'>>;

export const DEFAULT_PROFILE: Omit<Profile, 'id' | 'updated_at'> = {
  display_name: null,
  avatar_url: null,
  dob: null,
  gender: null,
  current_weight_kg: null,
  height_cm: null,
  goal_type: null,
  activity_level: null,
  daily_target_kcal: null,
  streak_count: 0,
  theme_preference: 'system',
  accent_preference: 'green',
  onboarding_complete: false,
  is_premium: false,
};
