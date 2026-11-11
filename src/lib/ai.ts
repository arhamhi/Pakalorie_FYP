/**
 * Ustad chat, the Home advice line, Create Custom Meal and the scan fallback.
 * These used to call Gemini from the phone with a client-side key. They now
 * call the backend (`/ai/*`), which runs Claude with the server's key, so the
 * app needs no AI key at all. Function names and shapes are unchanged.
 */
import { ApiError, fetchWithTimeout, inferMimeType, unwrapEnvelope } from './api';

const AI_TIMEOUT_MS = 30_000;
const VISION_TIMEOUT_MS = 45_000;
const CHAT_ERROR_REPLY = 'Acha, kuch technical issue hai. Thori der baad try karo.';
const FALLBACK_ADVICE = 'Lage raho, consistency is key!';

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
    // The /ai/identify fallback supplies a calorie estimate; the /recognize
    // path supplies a confidence score instead. Either (or neither) may be present.
    calories?: number;
    confidence?: number;
  }[];
  notes?: string;
}

/** Chat turn as stored by the chat screen. `model` = Ustad's reply. */
export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface NutritionEstimateWire {
  name: string;
  name_urdu?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number | null;
  serving_size: string;
  confidence: number;
  alternatives?: { name: string; calories?: number | null }[];
  notes?: string | null;
}

function fromWire(data: NutritionEstimateWire): FoodIdentificationResult {
  return {
    name: data.name || 'Unknown Food',
    nameUrdu: data.name_urdu ?? undefined,
    calories: Math.round(Math.max(0, data.calories || 0)),
    protein: Math.round(Math.max(0, data.protein || 0)),
    carbs: Math.round(Math.max(0, data.carbs || 0)),
    fat: Math.round(Math.max(0, data.fat || 0)),
    fiber: data.fiber == null ? undefined : Math.round(data.fiber),
    servingSize: data.serving_size || '1 serving',
    confidence: Math.min(1, Math.max(0, data.confidence || 0)),
    alternatives: data.alternatives?.map((alt) => ({
      name: alt.name,
      calories: alt.calories ?? undefined,
    })),
    notes: data.notes ?? undefined,
  };
}

async function postJson<T>(path: string, body: unknown, timeoutMs = AI_TIMEOUT_MS): Promise<T> {
  const response = await fetchWithTimeout(
    path,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    timeoutMs,
  );
  return unwrapEnvelope<T>(response, path);
}

/** One-shot photo -> nutrition estimate (not DB-grounded). The scan screen
 * only uses this when the /recognize + /calories pipeline fails. */
export async function identifyFood(imageUri: string): Promise<FoodIdentificationResult> {
  const mime = inferMimeType(imageUri);
  const form = new FormData();
  form.append('image', {
    uri: imageUri,
    name: `scan.${mime.split('/')[1]}`,
    type: mime,
    // RN's FormData file part is not typed like the DOM's.
  } as unknown as Blob);
  const response = await fetchWithTimeout(
    '/ai/identify',
    { method: 'POST', body: form },
    VISION_TIMEOUT_MS,
  );
  return fromWire(await unwrapEnvelope<NutritionEstimateWire>(response, '/ai/identify'));
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
  history: ChatMessage[] = [],
): Promise<string> {
  try {
    const data = await postJson<{ reply: string }>('/ai/chat', {
      message,
      context: {
        user_name: context.userName,
        remaining_calories: context.remainingCalories,
        protein: context.todaysMacros?.protein,
        carbs: context.todaysMacros?.carbs,
        fat: context.todaysMacros?.fat,
        goal: context.goal,
        water_count: context.waterCount,
        local_time: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }),
      },
      // Last 20 turns are plenty for context and keep the request small.
      history: history.slice(-20).map((turn) => ({
        role: turn.role === 'model' ? 'assistant' : 'user',
        text: turn.parts.map((p) => p.text).join('').slice(0, 4000),
      })),
    });
    return data.reply?.trim() || CHAT_ERROR_REPLY;
  } catch (error) {
    console.error('Chat error:', error);
    return CHAT_ERROR_REPLY;
  }
}

export async function generateMealFromDescription(
  name: string,
  description?: string,
): Promise<FoodIdentificationResult> {
  try {
    const data = await postJson<NutritionEstimateWire>('/ai/meal-estimate', {
      name,
      description: description?.trim() || undefined,
    });
    return fromWire(data);
  } catch (error) {
    console.error('Meal generation error:', error);
    throw error instanceof ApiError ? error : new Error('Could not estimate this meal.');
  }
}

export async function getUstadAdvice(context: {
  remainingCalories: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  goal: string;
  waterCount: number;
}): Promise<string> {
  try {
    const data = await postJson<{ text: string }>('/ai/advice', {
      remaining_calories: context.remainingCalories,
      time_of_day: context.timeOfDay,
      goal: context.goal,
      water_count: context.waterCount,
    });
    return data.text?.trim() || FALLBACK_ADVICE;
  } catch {
    return FALLBACK_ADVICE;
  }
}
