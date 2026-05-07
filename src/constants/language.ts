// Pakalorie Dynamic Language System
// Supports English (en) and Urban Urdu (urban_urdu)

export type LanguageCode = 'en' | 'urban_urdu';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
export type UserDemographic = 'general' | 'male_young' | 'female_young' | 'professional' | 'senior';

export interface LocalizedString {
  en: string;
  ur: string;
}

export interface HydrationFeedback {
  threshold: number;
  en: string;
  ur: string;
}

export const LanguageConfig = {
  default_language: 'en' as LanguageCode,
  secondary_language: 'urban_urdu' as LanguageCode,
  urdu_probability: 0.3,
  greeting_prefix_weights: {
    'Assalam-o-Alaikum': 0.7,
    'Hello': 0.15,
    'Hey': 0.15,
  },
} as const;

export const TimeRanges: Record<TimeOfDay, { start: number; end: number }> = {
  morning: { start: 5, end: 11 },
  afternoon: { start: 12, end: 16 },
  evening: { start: 17, end: 20 },
  night: { start: 21, end: 4 }, // Wraps around midnight
};

export const DynamicGreetings: Record<TimeOfDay, Record<UserDemographic, LocalizedString[]>> = {
  morning: {
    general: [
      { en: "Morning! Target set?", ur: "Subah bakhair, {name}!" },
      { en: "Good morning! Pani peeyein.", ur: "Assalam-o-Alaikum! Fit rahein." },
      { en: "Morning! Log first meal.", ur: "Morning! Healthy nashta?" },
      { en: "Target: 10k steps.", ur: "Assalam-o-Alaikum! Control today." },
      { en: "Morning! Healthy nashta?", ur: "Morning! Log first meal." },
    ],
    male_young: [
      { en: "Morning Champ! Gym?", ur: "Assalam-o-Alaikum Bhai! Nashta?" },
      { en: "Morning! Let's win.", ur: "Utho ustad! Fitness time." },
      { en: "Utho ustad! Fitness time.", ur: "Morning! Let's win." },
    ],
    female_young: [
      { en: "Morning! Healthy nashta?", ur: "Assalam-o-Alaikum Sis! Ready?" },
      { en: "Morning! Stay fit.", ur: "Assalam-o-Alaikum! Log it." },
    ],
    professional: [
      { en: "Morning! Light breakfast?", ur: "Assalam-o-Alaikum {name} Sahab." },
      { en: "Morning! Balance today.", ur: "Coffee ya Green tea?" },
      { en: "Coffee ya Green tea?", ur: "Morning! Balance today." },
    ],
    senior: [
      { en: "Morning! Halka nashta.", ur: "Assalam-o-Alaikum Uncle! Walk?" },
      { en: "Sehat pehli tarjeeh.", ur: "Morning Aunty! Fruit lein." },
      { en: "Assalam-o-Alaikum! Khush rahein.", ur: "Morning! Halka nashta." },
    ],
  },
  afternoon: {
    general: [
      { en: "Afternoon! Calories check?", ur: "Dopehar bakhair! Lunch?" },
      { en: "Afternoon! Kaisa scene?", ur: "Assalam-o-Alaikum! Light lunch." },
      { en: "Pani pi lo yaar.", ur: "Healthy lunch today." },
      { en: "Afternoon! Log lunch.", ur: "Assalam-o-Alaikum! Limit check?" },
    ],
    male_young: [
      { en: "Afternoon ustad! Control.", ur: "Assalam-o-Alaikum Bhai! Biryani?" },
      { en: "Morning targets done?", ur: "Susti nahi, kaam shuru." },
      { en: "Susti nahi, kaam shuru.", ur: "Afternoon ustad! Control." },
    ],
    female_young: [
      { en: "Afternoon! Protein focus.", ur: "Assalam-o-Alaikum Sis! Lunch?" },
      { en: "Assalam-o-Alaikum! Log it.", ur: "Healthy meals, happy body." },
    ],
    professional: [
      { en: "Afternoon! Stay active.", ur: "Dopehar bakhair {name}." },
      { en: "Lunch walk done?", ur: "Assalam-o-Alaikum! Balance goals." },
    ],
    senior: [
      { en: "Pani ka khayal.", ur: "Assalam-o-Alaikum Uncle! Kam oil." },
      { en: "Sehat hi dunya hai.", ur: "Afternoon Aunty! Sehatmand khana." },
      { en: "Dopehar bakhair! Carbs kam.", ur: "Pani ka khayal." },
    ],
  },
  evening: {
    general: [
      { en: "Evening {name}! Dinner plan?", ur: "Shaam bakhair! No junk." },
      { en: "Evening! Walk ka scene?", ur: "Assalam-o-Alaikum! Exercise done?" },
      { en: "Balance your day.", ur: "Shaam bakhair! Light snacks." },
      { en: "Evening! Tea log?", ur: "Assalam-o-Alaikum! Walk time." },
    ],
    male_young: [
      { en: "Evening Champ! Push it.", ur: "Assalam-o-Alaikum Bhai! Gym?" },
      { en: "Evening ustad! Hisaab barabar.", ur: "Junk ko 'na' bolo." },
      { en: "Junk ko 'na' bolo.", ur: "Evening Champ! Push it." },
    ],
    female_young: [
      { en: "Evening! Dinner light?", ur: "Assalam-o-Alaikum Sis! Walk?" },
      { en: "Assalam-o-Alaikum! Move now.", ur: "Consistent rahein. Target kareeb." },
    ],
    professional: [
      { en: "Evening! Release stress.", ur: "Shaam bakhair! Post-work walk." },
      { en: "Evening! Stay active.", ur: "Assalam-o-Alaikum! Dinner budget?" },
    ],
    senior: [
      { en: "Dinner jaldi karein.", ur: "Assalam-o-Alaikum Uncle! Walk." },
      { en: "Behtari ka safar.", ur: "Evening Aunty! Cheeni kam." },
      { en: "Shaam bakhair! Kaisa guzra?", ur: "Dinner jaldi karein." },
    ],
  },
  night: {
    general: [
      { en: "Good night! No cravings.", ur: "Shab bakhair! Final log?" },
      { en: "Night vibe: Sleep.", ur: "Assalam-o-Alaikum! Recover now." },
      { en: "Kal ki tayari.", ur: "Shab bakhair! Target poora?" },
      { en: "Night! Log dinner.", ur: "Assalam-o-Alaikum! Sukoon." },
    ],
    male_young: [
      { en: "Night ustad! Kal milte.", ur: "Assalam-o-Alaikum Bhai! Control." },
      { en: "Sleep is part of grind.", ur: "Shab bakhair! Rest time." },
    ],
    female_young: [
      { en: "Night {name}! Budget check?", ur: "Assalam-o-Alaikum Sis! Sleep early." },
      { en: "Healthy mind, healthy sleep.", ur: "Shab bakhair! Kal fresh." },
    ],
    professional: [
      { en: "Plan tomorrow's nashta.", ur: "Shab bakhair! Relax now." },
      { en: "Screen break lein.", ur: "Assalam-o-Alaikum! Balanced day." },
    ],
    senior: [
      { en: "Allah sehat de.", ur: "Assalam-o-Alaikum Uncle! Sukoon." },
      { en: "Aaj ki mehnat done.", ur: "Shab bakhair Aunty!" },
      { en: "Assalam-o-Alaikum! Hazam karein.", ur: "Allah sehat de." },
    ],
  },
};

export const Hydration = {
  label: { en: "Water Intake", ur: "Pani ka hisaab" },
  feedback: [
    { threshold: 0, en: "Drink water", ur: "Pani pi lo yaar" },
    { threshold: 2, en: "Just starting.", ur: "Abhi toh shuru kiya hai" },
    { threshold: 4, en: "Halfway there!", ur: "Halfway there, lage raho" },
    { threshold: 6, en: "Almost done!", ur: "Bas thora sa aur" },
    { threshold: 8, en: "Target reached!", ur: "Target poora! Zabardast" },
  ] as HydrationFeedback[],
};

export const DashboardCards = {
  ustad_advice: { en: "Ustad's Advice", ur: "Ustad ka Mashwara" },
  trends: { en: "Your Trends", ur: "Hafte ka scene" },
};

export const Strings = {
  onboarding: {
    welcome: { en: "Welcome to Pakalorie!", ur: "Pakalorie mein khushamdeed!" },
    start: { en: "Let's start", ur: "Chalo shuru karein" },
    name_prompt: { en: "Your name?", ur: "Aapka naam?" },
    gender_prompt: { en: "Select gender", ur: "Gender kya hai?" },
    male: { en: "Male", ur: "Larka" },
    female: { en: "Female", ur: "Larki" },
    age_prompt: { en: "Your age?", ur: "Umar kitni hai?" },
    height: { en: "Height", ur: "Lambaai (Height)" },
    weight: { en: "Weight", ur: "Wazan batayen" },
    goal_prompt: { en: "What's the goal?", ur: "Scene kya hai? (Goal)" },
    goal_lose: { en: "Lose weight", ur: "Wazan kam karna hai" },
    goal_maintain: { en: "Maintain", ur: "Bas fit rehna hai" },
    goal_build: { en: "Build muscle", ur: "Body banani hai" },
    setup_complete: { en: "Setup complete!", ur: "Scene set ho gaya!" },
    create_profile: { en: "Create profile", ur: "Profile banayein" },
    sync_data: { en: "Sync data", ur: "Data sync karein" },
    almost_there: { en: "Almost there", ur: "Bas thora sa reh gaya" },
    verification: { en: "Verification", ur: "Tasdeeq ho rahi hai" },
    permissions: { en: "Permissions", ur: "Ijazat chahiye" },
  },
  dashboard: {
    greeting_default: "Assalam-o-Alaikum",
    morning: { en: "Good morning", ur: "Subah bakhair" },
    afternoon: { en: "Good afternoon", ur: "Dopehar bakhair" },
    evening: { en: "Good evening", ur: "Shaam bakhair" },
    night: { en: "Good night", ur: "Shab bakhair" },
    calories_left: { en: "Calories left", ur: "Itni gunjayish baqi hai" },
    calories_eaten: { en: "Calories eaten", ur: "Itna kha liya hai" },
    burned: { en: "Burned", ur: "Itni mehnat ki (Burned)" },
    daily_limit: { en: "Daily limit", ur: "Aaj ki limit" },
    on_track: { en: "On track", ur: "Scene bilkul set hai" },
    falling_behind: { en: "Falling behind", ur: "Thora peeche reh gaye ho" },
    water_intake: { en: "Water intake", ur: "Pani ka hisaab" },
    drink_water: { en: "Drink water", ur: "Pani pi lo yaar" },
    steps: { en: "Steps taken", ur: "Kitne qadam chale?" },
    goal_reached: { en: "Goal reached!", ur: "Target poora!" },
    summary: { en: "Daily summary", ur: "Aaj ki report" },
    vibe_check: { en: "Health check-up", ur: "Vibe check" },
    streak: { en: "Daily streak", ur: "Lagaataar ka record" },
    motivation: { en: "Stay motivated", ur: "Himat pakro" },
    week_overview: { en: "Week overview", ur: "Hafte ka scene" },
  },
  scanner: {
    open_camera: { en: "Open scanner", ur: "Scanner kholo" },
    focus: { en: "Point at food", ur: "Khane pe focus karein" },
    detecting: { en: "Detecting...", ur: "Check ho raha hai..." },
    identifying: { en: "Identifying...", ur: "Pehchan raha hoon..." },
    found: { en: "Food found!", ur: "Mil gaya!" },
    query: { en: "What is this?", ur: "Ye kya cheez hai?" },
    confirm: { en: "Confirm food", ur: "Yehi hai na?" },
    failed: { en: "Scan failed", ur: "Nazar nahi aa raha" },
    retry: { en: "Try again", ur: "Dobara koshish karein" },
    low_light: { en: "Too dark", ur: "Thori roshni karein" },
    volume: { en: "Analyzing volume", ur: "Miqdar check ho rahi hai" },
    result: { en: "See result", ur: "Result dekhein" },
    clean_lens: { en: "Clean lens", ur: "Lens saaf karlo" },
    steady: { en: "Hold steady", ur: "Zara hath rokay rakhein" },
    distance: { en: "Too close", ur: "Thora door se dekhein" },
    angle: { en: "Change angle", ur: "Angle badlein" },
    recognition: { en: "Recognition", ur: "Shanakht ho gayi" },
  },
  chat: {
    ask_me: { en: "Ask me anything", ur: "Pucho, kya masla hai?" },
    advice: { en: "Advice", ur: "Mashwara" },
    exercise_tip: { en: "Exercise tip", ur: "Thori exercise ka scene" },
    cheat_meal: { en: "Cheat meal?", ur: "Aaj chaska scene?" },
    hungry: { en: "Feeling hungry?", ur: "Bhook lag rahi hai?" },
    suggest: { en: "Suggest food", ur: "Kuch acha batayein?" },
    late_snack: { en: "Late night snack", ur: "Raat ka chaska" },
    too_oily: { en: "Too much oil", ur: "Bohat zyada oil hai isme" },
    swap: { en: "Healthy swap", ur: "Isse behtar ye hai" },
    no_soda: { en: "Skip the soda", ur: "Cold drink chor do" },
    add_salad: { en: "Add salad", ur: "Thora salad add karein" },
    protein_focus: { en: "Focus on protein", ur: "Protein badhaein" },
    carbs_alert: { en: "High carbs", ur: "Carbs zyada ho gaye" },
    balance: { en: "Balance it", ur: "Hisaab barabar karte hain" },
    walk: { en: "Walk now", ur: "Thori walk ho jaye?" },
    gym_time: { en: "Gym time", ur: "Gym ka time ho gaya" },
    lazy: { en: "Feeling lazy?", ur: "Susti ho rahi hai?" },
    stay_strong: { en: "Stay strong", ur: "Himat nahi harni" },
    recovery: { en: "Recovery", ur: "Thora sukoon karein" },
    no_excuses: { en: "No excuses", ur: "Bahana nahi chalay ga" },
    progress: { en: "Progress", ur: "Behtari aa rahi hai" },
    consistency: { en: "Consistency", ur: "Bas lage raho" },
    reminder: { en: "Reminder", ur: "Yaad dila raha hoon" },
    encouragement: { en: "Encouragement", ur: "Chaye huay ho!" },
    smart_choices: { en: "Smart choices", ur: "Aqalmandi dikhayen" },
  },
  location: {
    near_me: { en: "Near me", ur: "Kareeb ke hotels" },
    eating_out: { en: "Eating out?", ur: "Bahar ka scene?" },
    best_option: { en: "Best option", ur: "Sab se fit option" },
    menu: { en: "Menu", ur: "Menu dekhein" },
    avoid: { en: "Avoid this", ur: "Ye mat khayein" },
    recommendation: { en: "Recommendation", ur: "Mera mashwara" },
    portion_control: { en: "Portion control", ur: "Thora kam khayein" },
    healthiest: { en: "Healthiest spot", ur: "Sab se healthy jagah" },
    dine_in: { en: "Dine-in", ur: "Wahin beth kar" },
    takeaway: { en: "Takeaway", ur: "Pack karwa lo" },
    prices: { en: "Prices", ur: "Daam check karein" },
    reviews: { en: "Reviews", ur: "Log kya kehte hain?" },
  },
  reactions: {
    heavy: { en: "Heavy meal", ur: "Bhai, ye thora heavy hai" },
    light: { en: "Light meal", ur: "Halka phulka scene" },
    protein_high: { en: "Full protein meal", ur: "Full protein meal" },
    junk: { en: "Avoid junk food", ur: "Junk food se parhez" },
    homemade: { en: "Homemade", ur: "Ghar ka khana" },
    street_food: { en: "Street food", ur: "Bahar ka chaska" },
    dessert: { en: "Dessert time", ur: "Meethay ka scene" },
    spicy: { en: "Spicy food", ur: "Chatpata scene" },
    fried: { en: "Deep fried", ur: "Full tila hua" },
    boiled: { en: "Boiled", ur: "Ubla hua" },
    grilled: { en: "Grilled", ur: "Barbecue scene" },
    healthy_snack: { en: "Healthy snack", ur: "Sahi chaska" },
  },
  system: {
    done: { en: "Done", ur: "Done hai" },
    cancel: { en: "Cancel", ur: "Rehne do" },
    edit: { en: "Edit", ur: "Sahi karein" },
    save: { en: "Save", ur: "Save karlo" },
    settings: { en: "Settings", ur: "Settings" },
    profile: { en: "Profile", ur: "Apni info" },
    history: { en: "History", ur: "Purana record" },
    notification: { en: "Notification", ur: "Zaroori baat" },
    reminder: { en: "Reminder", ur: "Yaad-dahani" },
    update: { en: "Update", ur: "Update karein" },
    error: { en: "Error occurred", ur: "Kuch masla aa gaya" },
    internet: { en: "Check internet", ur: "Internet check karein" },
    loading: { en: "Loading...", ur: "Ruko zara..." },
    success: { en: "Success!", ur: "Zabardast!" },
    permission: { en: "Permission", ur: "Ijazat dein" },
    logout: { en: "Log out", ur: "Log out karein" },
    feedback: { en: "Feedback", ur: "App kaisi lagi?" },
    support: { en: "Support", ur: "Madad chahiye?" },
    privacy: { en: "Privacy", ur: "Aapka data" },
    about: { en: "About", ur: "Hamare bare mein" },
    search: { en: "Search", ur: "Dhoondein" },
    share: { en: "Share", ur: "Doston ko batayein" },
    exit: { en: "Exit", ur: "Bahar niklein" },
    restart: { en: "Restart", ur: "Dobara shuru karein" },
  },
  social: {
    community: { en: "Community", ur: "Awam ka scene" },
    leaderboard: { en: "Leaderboard", ur: "Sab se agay kaun?" },
    challenges: { en: "Challenges", ur: "Muqabla shuru" },
    invite: { en: "Invite friends", ur: "Yaaron ko bulao" },
    achievements: { en: "Achievements", ur: "Kya kya ukhara?" },
    rank: { en: "Your rank", ur: "Aapka number" },
  },
} as const;

// Type helpers for accessing strings
export type StringCategory = keyof typeof Strings;
export type OnboardingString = keyof typeof Strings.onboarding;
export type DashboardString = keyof typeof Strings.dashboard;
export type ScannerString = keyof typeof Strings.scanner;
export type ChatString = keyof typeof Strings.chat;
export type LocationString = keyof typeof Strings.location;
export type ReactionString = keyof typeof Strings.reactions;
export type SystemString = keyof typeof Strings.system;
export type SocialString = keyof typeof Strings.social;
