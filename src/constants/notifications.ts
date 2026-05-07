// Pakalorie Notification Messages Dataset
// 70% English / 30% Urdu mix - Duolingo-style guilt-tripping
// Dynamic based on time, profile, streak status, and context

import { Profile } from '../types/database';

// ============================================================================
// TYPES
// ============================================================================

export type NotificationType =
  | 'meal_reminder'
  | 'missed_meal'
  | 'streak_warning'
  | 'streak_broken'
  | 'streak_milestone'
  | 'hydration'
  | 'comeback'
  | 'weekly_summary'
  | 'goal_progress'
  | 'achievement';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type NotificationTone = 'guilt_trip' | 'snarky' | 'supportive' | 'celebratory' | 'urgent';

export interface NotificationMessage {
  title: string;
  body: string;
  tone: NotificationTone;
}

// ============================================================================
// MEAL REMINDER MESSAGES (Before missed)
// ============================================================================

export const MEAL_REMINDERS: Record<MealType, NotificationMessage[]> = {
  breakfast: [
    { title: "Nashta Time! 🍳", body: "Subah ka breakfast log karo, metabolism ko jagao", tone: 'supportive' },
    { title: "Good Morning!", body: "Din ki shuruaat healthy se karo. Log your breakfast!", tone: 'supportive' },
    { title: "Rise & Shine ☀️", body: "Breakfast of champions awaits. Don't forget to log!", tone: 'celebratory' },
    { title: "Subah Ho Gayi!", body: "Kahwa pee liya? Paratha khaya? Log it yaar", tone: 'supportive' },
    { title: "Nashta Alert 🔔", body: "First meal = First win. Chalo log karo!", tone: 'supportive' },
  ],
  lunch: [
    { title: "Lunch Time! 🍛", body: "Dopeher ho gayi. Kya khaya? Quick log karo", tone: 'supportive' },
    { title: "Midday Fuel ⛽", body: "Lunch logged? Keep that streak alive!", tone: 'supportive' },
    { title: "Khana Time!", body: "Biryani ya salad? Whatever it is, log it!", tone: 'snarky' },
    { title: "Lunch Break 🍱", body: "Take 30 seconds to log your lunch. Future you will thank you!", tone: 'supportive' },
    { title: "Dopeher Ka Khana", body: "Calories count karo, regret nahi. Log lunch now!", tone: 'guilt_trip' },
  ],
  dinner: [
    { title: "Dinner Time! 🌙", body: "Raat ka khana ready? Log karo before you forget", tone: 'supportive' },
    { title: "Evening Eats 🍽️", body: "Last meal of the day. Make it count, log it!", tone: 'supportive' },
    { title: "Raat Ka Khana", body: "Dinner logged? Don't let today go untracked!", tone: 'guilt_trip' },
    { title: "Shaam Ho Gayi", body: "Khana kha lo aur log karo. Simple!", tone: 'snarky' },
    { title: "Final Log 🔥", body: "Dinner = last chance to hit today's goals. Log it!", tone: 'urgent' },
  ],
  snack: [
    { title: "Snack Attack? 🍿", body: "Kuch khaya? Even small bites count. Log karo!", tone: 'snarky' },
    { title: "Chhoti Bhook", body: "Chai biscuit bhi count hota hai. Quick log!", tone: 'supportive' },
    { title: "Snacking? 👀", body: "That samosa counts too. Be honest, log it!", tone: 'guilt_trip' },
  ],
};

// ============================================================================
// MISSED MEAL - GUILT TRIP MESSAGES (Progressively more intense)
// ============================================================================

export const MISSED_MEAL_MESSAGES: Record<MealType, NotificationMessage[]> = {
  breakfast: [
    { title: "Nashta Skip? 😔", body: "Subah ka khana miss kar diya. Metabolism sad hai", tone: 'guilt_trip' },
    { title: "Breakfast Missed!", body: "Khaali pet kaam? Log karo at least memory ke liye", tone: 'snarky' },
    { title: "Oof Bhai...", body: "Nashta nahi khaya ya log nahi kiya? Dono galat hai 💀", tone: 'guilt_trip' },
    { title: "Hello? Nashta?", body: "Mummy disappointed. Breakfast log karo ab bhi", tone: 'guilt_trip' },
    { title: "Empty Stomach 🚨", body: "No breakfast logged. Your body deserves better tracking!", tone: 'urgent' },
  ],
  lunch: [
    { title: "Lunch Kahan Gaya?", body: "Dopeher ka khana missing hai. Bhool gaye ya chhupa rahe ho? 👀", tone: 'snarky' },
    { title: "Lunch Not Logged!", body: "Half the day gone, no lunch data. We see you 😏", tone: 'guilt_trip' },
    { title: "Hello? Khana?", body: "It's past lunch time. Log karo yaar, progress matters!", tone: 'guilt_trip' },
    { title: "Missing: Lunch 🔍", body: "Your lunch has not been logged. Sus behavior detected", tone: 'snarky' },
  ],
  dinner: [
    { title: "Dinner Missing!", body: "Raat ho gayi, dinner untracked. Ab log kar do please", tone: 'guilt_trip' },
    { title: "Raat Ka Khana? 🌙", body: "Day almost over, dinner not logged. Don't sleep on this!", tone: 'urgent' },
    { title: "Last Chance!", body: "Dinner log nahi kiya. Din incomplete mat rehne do", tone: 'guilt_trip' },
    { title: "Before You Sleep...", body: "Sone se pehle dinner log kar lo. 30 seconds only!", tone: 'supportive' },
  ],
  snack: [
    { title: "Secret Snacking? 🕵️", body: "We know you ate something. Log it, no judgment!", tone: 'snarky' },
  ],
};

// ============================================================================
// STREAK WARNINGS (Same day - no logs yet)
// ============================================================================

export const STREAK_WARNING_9PM: NotificationMessage[] = [
  { title: "Streak in Danger! 🔥", body: "Aaj kuch log nahi hua. 3 ghante bache hain, save your streak!", tone: 'urgent' },
  { title: "Hello? Log Kahan Hai?", body: "Poora din beet gaya, zero logs. Streak bachao!", tone: 'guilt_trip' },
  { title: "Day Almost Over!", body: "Nothing logged today. Your streak is crying 😢", tone: 'guilt_trip' },
  { title: "Warning! ⚠️", body: "No meals logged today. Log something to keep streak alive!", tone: 'urgent' },
  { title: "Time Running Out ⏰", body: "Aaj ka data missing. Quick log karo, streak mat todo!", tone: 'urgent' },
  { title: "Yaar Please 🙏", body: "Ek bhi meal log nahi kiya aaj. Mehnat waste mat karo", tone: 'guilt_trip' },
];

export const STREAK_WARNING_11PM: NotificationMessage[] = [
  { title: "LAST CHANCE! 🚨", body: "1 hour left. Log ANYTHING to save your streak. Do it NOW!", tone: 'urgent' },
  { title: "Final Warning!", body: "Sirf 1 ghanta bacha hai. Streak todna hai kya? LOG KARO!", tone: 'urgent' },
  { title: "Streak Emergency! 🆘", body: "11 baj gaye, zero logs. Kal regret hoga. ACT NOW!", tone: 'urgent' },
  { title: "Ab Ya Kabhi Nahi", body: "Last hour. Either log something or lose everything. Choose wisely.", tone: 'urgent' },
  { title: "One Hour Left ⏳", body: "Your streak is hanging by a thread. Quick, log anything!", tone: 'urgent' },
  { title: "Bhai/Sis PLEASE 😭", body: "Itni mehnat waste mat karo. Just ONE log to save streak!", tone: 'guilt_trip' },
];

// ============================================================================
// STREAK BROKEN MESSAGES (The morning after)
// ============================================================================

export const STREAK_BROKEN_MESSAGES: NotificationMessage[] = [
  { title: "Streak Gone 💔", body: "Kal kuch log nahi hua. Starting fresh today. You got this!", tone: 'supportive' },
  { title: "Oof... Reset 😔", body: "Streak break ho gaya. But legends make comebacks. Start now!", tone: 'supportive' },
  { title: "New Beginning", body: "Yesterday's streak is gone. Today's streak starts NOW. Let's go!", tone: 'celebratory' },
  { title: "It Happens...", body: "Streak ended but your journey continues. Log breakfast to restart!", tone: 'supportive' },
  { title: "Plot Twist 🔄", body: "Streak khatam, but story nahi. New chapter shuru karo!", tone: 'supportive' },
  { title: "Rise Again 🔥", body: "Champions don't stay down. Your comeback starts with one log!", tone: 'celebratory' },
];

// ============================================================================
// STREAK MILESTONE CELEBRATIONS
// ============================================================================

export const STREAK_MILESTONES: Record<number, NotificationMessage[]> = {
  3: [
    { title: "3 Days Strong! 🔥", body: "Teen din ka streak! Consistency is key, keep going!", tone: 'celebratory' },
    { title: "Hat-trick! 🎯", body: "3 din straight logging. You're building a habit!", tone: 'celebratory' },
  ],
  7: [
    { title: "ONE WEEK! 🏆", body: "7 din ka streak! Ek hafte ki consistency. Zabardast!", tone: 'celebratory' },
    { title: "Week Streak! 💪", body: "Poora hafta logged! You're officially serious about this!", tone: 'celebratory' },
  ],
  14: [
    { title: "2 WEEKS! 🌟", body: "14 din streak! Habit forming ho rahi hai. Keep it up!", tone: 'celebratory' },
    { title: "Fortnight Fire! 🔥🔥", body: "2 weeks strong! You're unstoppable!", tone: 'celebratory' },
  ],
  21: [
    { title: "21 Days = HABIT! 🧠", body: "Research kehti hai 21 din se habit ban'ti hai. You did it!", tone: 'celebratory' },
    { title: "Habit Unlocked! 🔓", body: "3 weeks of logging. This is your lifestyle now!", tone: 'celebratory' },
  ],
  30: [
    { title: "ONE MONTH! 👑", body: "30 din ka streak! Ek mahine ki dedication. LEGEND!", tone: 'celebratory' },
    { title: "Monthly Master! 🏅", body: "Poora month logged! You're in the top 1%!", tone: 'celebratory' },
  ],
  50: [
    { title: "50 DAYS! 🎖️", body: "Half century streak! Aap toh pro nikle!", tone: 'celebratory' },
  ],
  100: [
    { title: "💯 CENTURY 💯", body: "100 DIN KA STREAK! Absolute madlad energy. GOAT status!", tone: 'celebratory' },
    { title: "100 Days Strong! 🏆", body: "Sau din. You're an inspiration. Never stop!", tone: 'celebratory' },
  ],
};

// ============================================================================
// HYDRATION REMINDERS
// ============================================================================

export const HYDRATION_REMINDERS: NotificationMessage[] = [
  { title: "Pani Pi Lo! 💧", body: "Stay hydrated. One glass of water right now!", tone: 'supportive' },
  { title: "Water Break 💦", body: "Hydration check! Have you drunk enough water today?", tone: 'supportive' },
  { title: "H2O Time!", body: "Paani peena yaad hai? Quick glass pee lo!", tone: 'supportive' },
  { title: "Thirsty Yet? 🚰", body: "Your body needs water. Drink up!", tone: 'supportive' },
  { title: "Hydrate Alert", body: "Dehydration = low energy. Paani pee ke active raho!", tone: 'snarky' },
  { title: "Glass Pee Lo", body: "Simple task: drink one glass of water. Do it now!", tone: 'supportive' },
  { title: "Sip Sip!", body: "Thoda paani pee lo. Your skin will thank you too! ✨", tone: 'supportive' },
];

// ============================================================================
// COMEBACK MESSAGES (User returns after long absence)
// ============================================================================

export const COMEBACK_MESSAGES: Record<number, NotificationMessage[]> = {
  3: [ // 3 days away
    { title: "Welcome Back! 👋", body: "3 din ho gaye. No judgment, just log something today!", tone: 'supportive' },
    { title: "Missed You!", body: "Teen din kahan the? Chalo fresh start karte hain!", tone: 'supportive' },
  ],
  7: [ // 1 week away
    { title: "Long Time! 🎉", body: "Ek hafta ho gaya. Welcome back, let's restart together!", tone: 'supportive' },
    { title: "The Return! 🦅", body: "1 week away but you came back. That takes courage!", tone: 'celebratory' },
  ],
  14: [ // 2 weeks away
    { title: "You're Back! 🙌", body: "2 weeks is nothing. Your health journey continues NOW!", tone: 'celebratory' },
  ],
  30: [ // 1 month away
    { title: "The Comeback! 🔥", body: "One month break? Doesn't matter. Champions return. Like YOU!", tone: 'celebratory' },
    { title: "Welcome Home!", body: "Poora mahina guzar gaya but you're here now. Let's GO!", tone: 'celebratory' },
  ],
};

// ============================================================================
// GOAL-SPECIFIC MOTIVATION
// ============================================================================

export const GOAL_MESSAGES: Record<'lose' | 'maintain' | 'gain', NotificationMessage[]> = {
  lose: [
    { title: "Weight Loss Tip 💡", body: "Small deficit daily = big results monthly. Keep logging!", tone: 'supportive' },
    { title: "Stay Strong! 💪", body: "Losing weight is hard. Logging makes it easier. You got this!", tone: 'supportive' },
    { title: "Every Calorie Counts", body: "Track today, slim tomorrow. Keep going!", tone: 'supportive' },
  ],
  maintain: [
    { title: "Balance Check ⚖️", body: "Maintaining is about consistency. Log to stay aware!", tone: 'supportive' },
    { title: "Steady Wins! 🎯", body: "Weight maintenance needs attention. Keep tracking!", tone: 'supportive' },
  ],
  gain: [
    { title: "Gains Check! 💪", body: "Building muscle needs fuel. Are you eating enough? Log it!", tone: 'supportive' },
    { title: "Bulk Mode 🏋️", body: "More calories = more gains. Track everything!", tone: 'supportive' },
    { title: "Protein Check", body: "Getting enough protein for gains? Log and find out!", tone: 'supportive' },
  ],
};

// ============================================================================
// WEEKLY SUMMARY TEASERS
// ============================================================================

export const WEEKLY_SUMMARY_MESSAGES: NotificationMessage[] = [
  { title: "Week in Review 📊", body: "Your weekly stats are ready! See how you did.", tone: 'supportive' },
  { title: "Hafta Khatam!", body: "Weekly report ready. Tap to see your progress!", tone: 'celebratory' },
  { title: "Sunday Stats 📈", body: "Check your weekly calorie and macro trends!", tone: 'supportive' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a random notification message from an array
 * Throws an error if the messages array is empty
 */
export const getRandomMessage = (messages: NotificationMessage[]): NotificationMessage => {
  if (!messages || messages.length === 0) {
    throw new Error('getRandomMessage called with empty messages array');
  }
  return messages[Math.floor(Math.random() * messages.length)];
};

/**
 * Get appropriate greeting based on gender and age
 */
export const getGenderAgeGreeting = (profile: Profile | null): string => {
  if (!profile) return 'there';
  
  const { gender, year_of_birth, display_name } = profile;
  
  // Use display name if available
  if (display_name) {
    return display_name.split(' ')[0]; // First name only
  }
  
  // Calculate age based on year of birth
  let age = 25; // default
  if (year_of_birth) {
    const currentYear = new Date().getFullYear();
    age = currentYear - year_of_birth;
  }
  
  // Gender + age based greetings
  if (gender === 'male') {
    if (age < 26) return 'Bhai';
    if (age < 45) return 'Boss';
    return 'Sir';
  } else if (gender === 'female') {
    if (age < 26) return 'Sis';
    if (age < 45) return 'Ma\'am';
    return 'Aunty';
  }
  
  return 'there';
};

/**
 * Get streak milestone message if applicable
 */
export const getStreakMilestoneMessage = (streakCount: number): NotificationMessage | null => {
  const milestones = Object.keys(STREAK_MILESTONES)
    .map(Number)
    .sort((a, b) => b - a);
  
  for (const milestone of milestones) {
    if (streakCount === milestone) {
      return getRandomMessage(STREAK_MILESTONES[milestone]);
    }
  }
  
  return null;
};

/**
 * Get comeback message based on days away
 */
export const getComebackMessage = (daysAway: number): NotificationMessage | null => {
  if (daysAway >= 30) return getRandomMessage(COMEBACK_MESSAGES[30]);
  if (daysAway >= 14) return getRandomMessage(COMEBACK_MESSAGES[14]);
  if (daysAway >= 7) return getRandomMessage(COMEBACK_MESSAGES[7]);
  if (daysAway >= 3) return getRandomMessage(COMEBACK_MESSAGES[3]);
  return null;
};

/**
 * Get meal type based on current hour
 */
export const getCurrentMealType = (): MealType => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 18) return 'snack';
  return 'dinner';
};
