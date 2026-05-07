// Nutrition calculation constants and utilities

export const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Sedentary', icon: 'weekend', description: 'Office mein baithe rehte hain' },
  { value: 1.375, label: 'Halka active', icon: 'directions-walk', description: 'Thori exercise weekly' },
  { value: 1.55, label: 'Moderate', icon: 'directions-run', description: 'Regular gym jaate hain' },
  { value: 1.725, label: 'Bohat active', icon: 'fitness-center', description: 'Daily heavy workout' },
  { value: 1.9, label: 'Extreme', icon: 'local-fire-department', description: 'Athlete level' },
] as const;

export const GOALS = [
  {
    value: 'gain',
    label: 'Muscle banana hai',
    icon: 'fitness-center',
    description: 'Build strong muscle aur solid physique with higher calories & protein.',
    calorieModifier: 300,
  },
  {
    value: 'lose',
    label: 'Weight lose karna hai',
    icon: 'local-fire-department',
    description: 'Lose fat, feel lighter aur leaner without crazy diets.',
    calorieModifier: -400,
  },
  {
    value: 'maintain',
    label: 'Maintain karna hai',
    icon: 'balance',
    description: 'Keep your current weight stable, bas healthy habits maintain karo.',
    calorieModifier: 0,
  },
] as const;

export type GoalType = typeof GOALS[number]['value'];
export type ActivityLevel = typeof ACTIVITY_LEVELS[number]['value'];

// Calculate BMR using Mifflin-St Jeor equation
export const calculateBMR = (
  weight: number, // kg
  height: number, // cm
  age: number,
  gender: 'male' | 'female' | 'other'
): number => {
  const baseBMR = 10 * weight + 6.25 * height - 5 * age;

  switch (gender) {
    case 'male':
      return baseBMR + 5;
    case 'female':
      return baseBMR - 161;
    case 'other':
    default:
      return baseBMR - 78; // Average of male and female
  }
};

// Calculate TDEE (Total Daily Energy Expenditure)
export const calculateTDEE = (
  weight: number,
  height: number,
  age: number,
  gender: 'male' | 'female' | 'other',
  activityLevel: number
): number => {
  const bmr = calculateBMR(weight, height, age, gender);
  return Math.round(bmr * activityLevel);
};

// Calculate daily calorie target based on goal
export const calculateDailyTarget = (
  weight: number,
  height: number,
  age: number,
  gender: 'male' | 'female' | 'other',
  activityLevel: number,
  goalType: GoalType
): number => {
  const tdee = calculateTDEE(weight, height, age, gender, activityLevel);
  const goal = GOALS.find(g => g.value === goalType);
  const modifier = goal?.calorieModifier || 0;

  return Math.round(tdee + modifier);
};

// Calculate macros from calorie target
export const calculateMacros = (
  calories: number,
  goalType: GoalType
): { protein: number; carbs: number; fat: number } => {
  // Macro ratios based on goal
  const ratios = {
    gain: { protein: 0.30, carbs: 0.45, fat: 0.25 },
    lose: { protein: 0.35, carbs: 0.35, fat: 0.30 },
    maintain: { protein: 0.25, carbs: 0.50, fat: 0.25 },
  };

  const ratio = ratios[goalType];

  return {
    protein: Math.round((calories * ratio.protein) / 4), // 4 cal per gram protein
    carbs: Math.round((calories * ratio.carbs) / 4), // 4 cal per gram carbs
    fat: Math.round((calories * ratio.fat) / 9), // 9 cal per gram fat
  };
};

// Calculate age from date of birth
export const calculateAge = (dob: string | Date): number => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

// Common Pakistani foods with calorie estimates
export const COMMON_FOODS = {
  biryani: { name: 'Biryani', calories: 350, protein: 15, carbs: 45, fat: 12, unit: '1 plate' },
  paratha: { name: 'Paratha', calories: 280, protein: 6, carbs: 35, fat: 14, unit: '1 piece' },
  roti: { name: 'Roti', calories: 120, protein: 4, carbs: 25, fat: 1, unit: '1 piece' },
  daal: { name: 'Daal', calories: 180, protein: 12, carbs: 28, fat: 4, unit: '1 bowl' },
  karahi: { name: 'Chicken Karahi', calories: 450, protein: 35, carbs: 8, fat: 32, unit: '1 serving' },
  nihari: { name: 'Nihari', calories: 550, protein: 28, carbs: 15, fat: 42, unit: '1 bowl' },
  haleem: { name: 'Haleem', calories: 480, protein: 22, carbs: 45, fat: 24, unit: '1 bowl' },
  chai: { name: 'Chai (with milk)', calories: 80, protein: 3, carbs: 10, fat: 3, unit: '1 cup' },
  lassi: { name: 'Lassi', calories: 150, protein: 5, carbs: 20, fat: 5, unit: '1 glass' },
  samosa: { name: 'Samosa', calories: 250, protein: 5, carbs: 25, fat: 15, unit: '1 piece' },
};

// Food modifiers for AI scanner
export const FOOD_MODIFIERS = {
  extra_oily: { label: 'Extra Oily', calorieMultiplier: 1.3 },
  with_naan: { label: 'With Naan', calorieAdd: 300 },
  with_roti: { label: 'With Roti', calorieAdd: 120 },
  with_rice: { label: 'With Rice', calorieAdd: 200 },
  with_fizzy: { label: 'With Fizzy Drink', calorieAdd: 150 },
  large_portion: { label: 'Large Portion', calorieMultiplier: 1.5 },
  small_portion: { label: 'Small Portion', calorieMultiplier: 0.7 },
};
