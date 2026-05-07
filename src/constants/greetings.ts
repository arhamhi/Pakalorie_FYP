// Dynamic Greetings Dataset for Pakalorie
// Localized Urban Urdu + English mix

export const GREETINGS = {
  morning: {
    general: [
      "Subah bakhair! Ready to crush it today?",
      "Good morning! Nashta kar liya?",
      "Rise and shine! Aaj ka din productive banate hain",
      "Subah ho gayi! Let's start strong",
      "Morning vibes! Breakfast ka time hai",
    ],
    motivational: [
      "New day, new gains! Chalo shuru karte hain",
      "Aaj ka target set hai? Let's go!",
      "Fresh start, fresh energy. You got this!",
    ],
  },
  afternoon: {
    general: [
      "Dopeher ho gayi! Lunch time?",
      "Good afternoon! Energy level kaisa hai?",
      "Half day done! Keep going strong",
      "Lunch kar liya? Don't skip meals yaar",
    ],
    motivational: [
      "Halfway through! Consistency is key",
      "Afternoon slump? Grab something healthy",
      "You're doing great! Keep it up",
    ],
  },
  evening: {
    general: [
      "Good evening! Dinner plans ready?",
      "Shaam ho gayi! Kya chal raha hai?",
      "Evening vibes! Almost done for the day",
      "Day's ending strong. How's the progress?",
    ],
    motivational: [
      "End the day right! Smart dinner choices",
      "Almost there! Finish strong",
      "Great day! Let's wrap up healthy",
    ],
  },
  night: {
    general: [
      "Raat ho gayi! Time to wind down",
      "Late night? Don't forget to hydrate",
      "Good night! Rest well, recover strong",
    ],
    motivational: [
      "Day complete! Tomorrow we go again",
      "Rest is important too. Sleep well!",
      "Good progress today! See you tomorrow",
    ],
  },
};

export const getGreeting = (name?: string): string => {
  const hour = new Date().getHours();
  let timeOfDay: keyof typeof GREETINGS;

  if (hour >= 5 && hour < 12) {
    timeOfDay = 'morning';
  } else if (hour >= 12 && hour < 17) {
    timeOfDay = 'afternoon';
  } else if (hour >= 17 && hour < 21) {
    timeOfDay = 'evening';
  } else {
    timeOfDay = 'night';
  }

  const greetings = [
    ...GREETINGS[timeOfDay].general,
    ...GREETINGS[timeOfDay].motivational,
  ];

  const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];

  if (name) {
    // Insert name naturally
    const nameGreetings = [
      `${name}! ${randomGreeting}`,
      `Hey ${name}, ${randomGreeting.toLowerCase()}`,
      `Khush aamdeed, ${name}! ${randomGreeting}`,
    ];
    return nameGreetings[Math.floor(Math.random() * nameGreetings.length)];
  }

  return randomGreeting;
};

export const HYDRATION_MESSAGES = {
  low: [ // 0-25%
    "Pani pi lo yaar",
    "Hydration low hai, let's fix that",
    "Water reminder! Bas ek glass",
  ],
  medium: [ // 26-50%
    "Abhi toh shuru kiya hai",
    "Good start! Keep drinking",
    "Halfway to hydration goal",
  ],
  high: [ // 51-75%
    "Halfway there, lage raho",
    "Great progress on water!",
    "Almost at your goal!",
  ],
  almost: [ // 76-99%
    "Bas thora sa aur",
    "So close! One more glass",
    "Nearly there! Finish strong",
  ],
  complete: [ // 100%+
    "Target poora! Zabardast hydration",
    "Hydration goal smashed! 💧",
    "Water champion! Well done",
  ],
};

export const getHydrationMessage = (percentage: number): string => {
  let level: keyof typeof HYDRATION_MESSAGES;

  if (percentage <= 25) level = 'low';
  else if (percentage <= 50) level = 'medium';
  else if (percentage <= 75) level = 'high';
  else if (percentage < 100) level = 'almost';
  else level = 'complete';

  const messages = HYDRATION_MESSAGES[level];
  return messages[Math.floor(Math.random() * messages.length)];
};
