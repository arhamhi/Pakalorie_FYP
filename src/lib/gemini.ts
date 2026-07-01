import { File } from 'expo-file-system/next';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
// Using gemini-3.0-flash for stable image analysis
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

const GEMINI_TIMEOUT_MS = 20_000;
// Vision (base64 image upload) needs a longer ceiling, matching api.ts.
const GEMINI_VISION_TIMEOUT_MS = 30_000;

/** All Gemini calls go through here: bare `fetch` has no timeout on RN, so a
 * dropped connection would hang the caller (and its spinner) forever. */
async function fetchGemini(body: unknown, timeoutMs: number = GEMINI_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('The AI request timed out. Check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// Helper to read file as base64 using new API
async function readFileAsBase64(uri: string): Promise<string> {
  const file = new File(uri);
  const base64 = await file.base64();
  return base64;
}

export interface FoodIdentificationResult {
  name: string;
  nameUrdu?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  servingSize: string;
  confidence: number;
  alternatives?: {
    name: string;
    // Gemini fallback supplies a calorie estimate; the backend /recognize path
    // supplies a confidence score instead. Either (or neither) may be present.
    calories?: number;
    confidence?: number;
  }[];
  notes?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

// Optimized prompt for Pakistani food identification
const FOOD_IDENTIFICATION_PROMPT = `You are an expert Pakistani/South Asian food nutritionist and calorie counter with extensive knowledge of desi cuisine.

TASK: Analyze this food image and provide accurate nutritional information.

CRITICAL INSTRUCTIONS:
1. Identify the EXACT dish - not just category. Be specific (e.g., "Chicken Biryani" not just "Biryani")
2. Consider typical Pakistani restaurant/home serving sizes
3. Account for cooking methods common in Pakistan (extra ghee, oil, tarka)
4. If multiple items visible, identify the MAIN dish

PAKISTANI FOOD DATABASE (use as reference):
- Chicken Biryani (1 plate ~300g): 450-550 kcal, P:25g, C:55g, F:15g
- Beef Biryani: 550-650 kcal, P:28g, C:55g, F:22g
- Plain Paratha: 250-300 kcal, P:6g, C:35g, F:12g
- Aloo Paratha: 300-350 kcal, P:7g, C:42g, F:14g
- Chicken Karahi (1 serving): 400-500 kcal, P:35g, C:8g, F:28g
- Nihari (1 bowl): 500-600 kcal, P:28g, C:15g, F:40g
- Haleem (1 bowl): 450-550 kcal, P:22g, C:45g, F:22g
- Chapati/Roti: 100-120 kcal, P:4g, C:22g, F:1g
- Naan: 280-320 kcal, P:8g, C:50g, F:6g
- Daal (1 bowl): 180-220 kcal, P:12g, C:28g, F:4g
- Chicken Tikka (6 pcs): 300-350 kcal, P:40g, C:5g, F:15g
- Seekh Kabab (2 pcs): 250-300 kcal, P:20g, C:8g, F:16g
- Samosa (1 pc): 200-250 kcal, P:5g, C:25g, F:12g
- Pakora (5 pcs): 250-300 kcal, P:6g, C:28g, F:14g
- Chai with milk (1 cup): 70-90 kcal, P:3g, C:10g, F:3g
- Lassi sweet (1 glass): 180-220 kcal, P:6g, C:28g, F:5g

RESPOND IN THIS EXACT JSON FORMAT (no markdown, just raw JSON):
{
  "name": "Dish Name in English",
  "nameUrdu": "Dish Name in Roman Urdu",
  "calories": 450,
  "protein": 25,
  "carbs": 55,
  "fat": 15,
  "fiber": 3,
  "servingSize": "1 plate (300g)",
  "confidence": 0.85,
  "alternatives": [
    {"name": "Alternative dish if unsure", "calories": 400}
  ],
  "notes": "Any relevant notes about the dish or estimation"
}

If you cannot identify the food or it's not food, respond with:
{
  "name": "Unknown",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "servingSize": "N/A",
  "confidence": 0,
  "notes": "Could not identify food in image"
}`;

// Ustad chatbot system prompt
const USTAD_SYSTEM_PROMPT = `You are Ustad, Pakalorie's AI nutrition coach for Pakistani users.

CORE IDENTITY:
- Expert nutritionist who knows desi food (biryani, daal, paratha, mithai)
- Speak like a trusted gym bhai/personal trainer texting a client
- Urban Urdu Dialect: Balance Gen-Z slang with respectful local dialect
- Use "aap" for respect, but "scene", "chaska", "fit" for relatability
- Zero corporate talk. No "I hope this helps!" or "Feel free to ask!"

LANGUAGE RULES:
- Roman Urdu + English mix (70% English, 30% Roman Urdu - natural code-switching)
- Use "aap" for respect, "karo/karein" for commands
- Examples: "Zyada protein chahiye aaj", "Oil kam use karo", "Scene set hai"

RESPONSE STYLE:
- 50-100 words MAX. Get to the point.
- Use bullet points if listing options
- Bold key food names with asterisks: *biryani*, *chicken breast*
- Start with acknowledgment: "Acha", "Samajh gaya", "Theek hai"

WHAT TO DO:
- Give specific portions: "200g *chawal*, not 'ek bowl'"
- Suggest desi swaps: "*Paratha* ki jagah *roti* try karo—300 kcal save hoga"
- Warn about hidden calories: "*Oil mein fry* mat karo, calories double"
- Celebrate wins: "Mashallah! Target hit kiya"
- Course-correct gently: "Thora zyada ho gaya. Dinner mein adjust kar lena"

PAKISTANI FOOD KNOWLEDGE:
- Know common dishes and their calories
- Understand meal patterns: breakfast (chai+paratha), lunch (heavy rice/curry), dinner (lighter roti+salan)
- Ramadan-aware: Adapt advice for roza/sehri/iftar

RESPONSE STRUCTURE:
1. Acknowledge (1 line)
2. Answer (2-3 lines, specific numbers/foods)
3. One actionable tip if relevant (1 line)`;

export async function identifyFood(imageUri: string): Promise<FoodIdentificationResult> {
  // Validate API key
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Please add EXPO_PUBLIC_GEMINI_API_KEY to your .env file.');
  }

  try {
    console.log('identifyFood called with URI:', imageUri);

    // Read image as base64 using new File API
    const base64Image = await readFileAsBase64(imageUri);

    console.log('Image read successfully, base64 length:', base64Image.length);

    console.log('Sending request to Gemini API...');

    const response = await fetchGemini(
      {
        contents: [
          {
            parts: [
              { text: FOOD_IDENTIFICATION_PROMPT },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
          // Thinking model: keep reasoning tokens from eating the JSON output.
          thinkingConfig: { thinkingBudget: 0 },
        },
      },
      GEMINI_VISION_TIMEOUT_MS
    );

    console.log('API response status:', response.status);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('API error response:', errorBody);
      throw new Error(`API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    console.log('API response data:', JSON.stringify(data).substring(0, 500));

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('No text in response:', data);
      throw new Error('No response from AI. The image might not contain recognizable food.');
    }

    console.log('AI response text:', text);

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to parse JSON from:', text);
      throw new Error('Invalid response format from AI');
    }

    const result = JSON.parse(jsonMatch[0]) as FoodIdentificationResult;
    console.log('Parsed result:', result);

    // Validate and set defaults
    return {
      name: result.name || 'Unknown Food',
      nameUrdu: result.nameUrdu,
      calories: Math.max(0, result.calories || 0),
      protein: Math.max(0, result.protein || 0),
      carbs: Math.max(0, result.carbs || 0),
      fat: Math.max(0, result.fat || 0),
      fiber: result.fiber,
      servingSize: result.servingSize || '1 serving',
      confidence: Math.min(1, Math.max(0, result.confidence || 0.5)),
      alternatives: result.alternatives,
      notes: result.notes,
    };
  } catch (error) {
    console.error('Food identification error:', error);
    throw error;
  }
}

export async function chatWithUstad(
  message: string,
  context: {
    userName?: string;
    remainingCalories?: number;
    todaysMacros?: { protein: number; carbs: number; fat: number };
    goal?: string;
    waterCount?: number;
  },
  history: ChatMessage[] = []
): Promise<string> {
  try {
    // Build context string
    const contextStr = `
USER CONTEXT:
- Name: ${context.userName || 'User'}
- Remaining calories today: ${context.remainingCalories ?? 'Unknown'} kcal
- Today's macros: P:${context.todaysMacros?.protein ?? 0}g, C:${context.todaysMacros?.carbs ?? 0}g, F:${context.todaysMacros?.fat ?? 0}g
- Goal: ${context.goal || 'maintain'}
- Water intake: ${context.waterCount ?? 0}/8 glasses
- Current time: ${new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
`;

    const messages = [
      {
        role: 'user',
        parts: [{ text: USTAD_SYSTEM_PROMPT + '\n\n' + contextStr }],
      },
      {
        role: 'model',
        parts: [{ text: 'Samajh gaya! Main Ustad hoon, aap ka nutrition coach. Kya help chahiye?' }],
      },
      ...history,
      {
        role: 'user',
        parts: [{ text: message }],
      },
    ];

    const response = await fetchGemini({
      contents: messages,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
        // gemini-3-flash-preview is a thinking model; reasoning tokens count
        // against maxOutputTokens, which truncated replies mid-sentence at
        // 256. Same fix the backend already applied (see STATE.md 2026-06-04).
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    // Thinking models can split output across multiple parts; join them all.
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const text = parts.map((p: { text?: string }) => p.text ?? '').join('').trim();

    if (!text) {
      throw new Error('No response from AI');
    }

    return text;
  } catch (error) {
    console.error('Chat error:', error);
    return 'Acha, kuch technical issue hai. Thori der baad try karo.';
  }
}

export async function generateMealFromDescription(
  name: string,
  description?: string
): Promise<FoodIdentificationResult> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const prompt = `You are an expert Pakistani/South Asian food nutritionist. Estimate nutrition for this meal:

MEAL NAME: ${name}
DESCRIPTION: ${description || 'Standard Pakistani/South Asian preparation'}

INSTRUCTIONS:
1. Consider typical Pakistani cooking methods (ghee, oil, masalas, tarka)
2. Use realistic home-cooked or restaurant portion sizes
3. Account for any modifiers mentioned (extra oily, small portion, etc.)

PAKISTANI FOOD REFERENCE:
- Chicken Biryani (1 plate ~300g): 450-550 kcal, P:25g, C:55g, F:15g
- Beef Biryani: 550-650 kcal, P:28g, C:55g, F:22g
- Plain Paratha: 250-300 kcal, P:6g, C:35g, F:12g
- Aloo Paratha: 300-350 kcal, P:7g, C:42g, F:14g
- Chicken Karahi (1 serving): 400-500 kcal, P:35g, C:8g, F:28g
- Nihari (1 bowl): 500-600 kcal, P:28g, C:15g, F:40g
- Haleem (1 bowl): 450-550 kcal, P:22g, C:45g, F:22g
- Chapati/Roti: 100-120 kcal, P:4g, C:22g, F:1g
- Naan: 280-320 kcal, P:8g, C:50g, F:6g
- Daal (1 bowl): 180-220 kcal, P:12g, C:28g, F:4g
- Chai with milk (1 cup): 70-90 kcal, P:3g, C:10g, F:3g

RESPOND IN EXACT JSON FORMAT (no markdown):
{
  "name": "${name}",
  "calories": <number>,
  "protein": <number in grams>,
  "carbs": <number in grams>,
  "fat": <number in grams>,
  "servingSize": "<string like '1 plate' or '1 bowl'>"
}`;

  try {
    const response = await fetchGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 512,
        // Thinking model: keep reasoning tokens from eating the JSON output.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const text = parts.map((p: { text?: string }) => p.text ?? '').join('');

    if (!text) {
      throw new Error('No response from AI');
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format');
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      name: result.name || name,
      calories: Math.max(0, result.calories || 0),
      protein: Math.max(0, result.protein || 0),
      carbs: Math.max(0, result.carbs || 0),
      fat: Math.max(0, result.fat || 0),
      servingSize: result.servingSize || '1 serving',
      confidence: 0.7,
    };
  } catch (error) {
    console.error('Meal generation error:', error);
    throw error;
  }
}

export async function getUstadAdvice(context: {
  remainingCalories: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  goal: string;
  waterCount: number;
}): Promise<string> {
  const prompt = `Generate a single motivational one-liner advice for a Pakistani user.

Context:
- Remaining calories: ${context.remainingCalories} kcal
- Time: ${context.timeOfDay}
- Goal: ${context.goal}
- Water intake: ${context.waterCount}/8 glasses

Rules:
- Max 15 words
- 70% English, 30% Roman Urdu mix
- Be motivational but realistic
- Reference their current status
- No greetings, just advice

Example outputs:
- "Protein pe focus karo aaj, target almost done!"
- "Pani kam hai yaar, 2 aur glasses pi lo"
- "Dinner mein light rakhna, on track ho"`;

  try {
    const response = await fetchGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 256,
        // Thinking model: 64 tokens were entirely consumed by reasoning,
        // returning empty advice. Disable thinking for this one-liner.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const text = parts.map((p: { text?: string }) => p.text ?? '').join('').trim();
    return text || "Lage raho, consistency is key!";
  } catch {
    return "Lage raho, consistency is key!";
  }
}
