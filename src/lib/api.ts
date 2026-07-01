// Typed client for the Pakalorie FastAPI backend.
//
// Live base URL (verified over public HTTPS): https://api.srv987636.hstgr.cloud
// Endpoint contract: backend/docs/API_CONTRACT.md
//
// This is the real recognition -> grounded-calorie pipeline. The existing
// client-side Gemini path (src/lib/gemini.ts) stays as a fallback until the
// device smoke test passes; the scan screen decides which path to use.

import type { FoodIdentificationResult } from './gemini';
import { DEFAULT_RECOGNITION_ENGINE, type RecognitionEngine } from './preferences';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_API_BASE_URL = 'https://api.srv987636.hstgr.cloud';

/**
 * Base URL for the FastAPI backend. Reads `EXPO_PUBLIC_API_BASE_URL` when set
 * (so the deploy target can change without a code edit) and falls back to the
 * live VPS deploy. No Gemini key is ever sent from the client — recognition
 * runs server-side.
 */
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, '');

const DEFAULT_TIMEOUT_MS = 20_000;
// Recognition runs a server-side vision model, so it needs a longer ceiling.
const RECOGNIZE_TIMEOUT_MS = 30_000;
// Below this top-1 confidence, a YOLO result is treated as "not food" (the
// classifier has no abstain class). Calibrated on the live API: non-food
// probes score 0.015–0.199; a real dish photo scores 0.57.
const YOLO_NOT_FOOD_FLOOR = 0.25;

// ─────────────────────────────────────────────────────────────────────────────
// Wire types (mirror backend/docs/API_CONTRACT.md exactly)
// ─────────────────────────────────────────────────────────────────────────────

interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface PortionData {
  id: number;
  label: string;
  weight_g: number;
  is_default: boolean;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
}

export interface FoodSearchResult {
  id: string;
  name_en: string;
  name_ur: string | null;
  category: string | null;
  source: string;
  default_portion: PortionData | null;
  score: number;
}

export interface FoodModifier {
  id: number;
  name: string;
  kcal_delta: number;
  description: string | null;
}

export interface FoodDetail {
  id: string;
  name_en: string;
  name_ur: string | null;
  category: string | null;
  source: string;
  base_unit: string;
  aliases: string[];
  portions: PortionData[];
  modifiers: FoodModifier[];
}

export interface RecognizeAlternative {
  food_label: string;
  confidence: number;
}

export interface RecognizeData {
  food_label: string;
  confidence: number;
  alternatives: RecognizeAlternative[];
}

export interface AdjustedNutrition {
  food_id: string;
  food_label: string;
  portion: PortionData;
  modifiers: FoodModifier[];
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  formula: string;
}

export interface CalorieSourceRow {
  food_id: string;
  food_label: string;
  source: string;
  portion_id: number | null;
  portion_label: string | null;
  weight_g: number | null;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  modifiers: { name: string; kcal_delta: number }[];
  score: number;
}

export interface CalorieData {
  food_id: string;
  food_label: string;
  portion_label: string | null;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  applied_modifiers: string[];
  ignored_modifiers: string[];
  why: string;
  model_used: string;
  source_rows: CalorieSourceRow[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Result shape consumed by the scan screen
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Provenance for a backend-grounded result. Present only when the result came
 * from the real pipeline; absent on the Gemini fallback path.
 */
export interface GroundedMeta {
  source: 'backend';
  foodId: string;
  portionLabel: string | null;
  why: string;
  modelUsed: string;
  /** `source_rows[0].source`, e.g. `desi_v1` / `usda`. */
  dataSource: string | null;
  /** `source_rows[0].food_label` — the DB row the answer is grounded in. */
  matchedLabel: string | null;
  /** Which recognition engine produced the dish label (for the demo badge). */
  engine: RecognitionEngine;
}

/** The Gemini fallback returns `FoodIdentificationResult`; the backend path
 * returns the same shape plus `grounded` provenance, so the Results UI can
 * render either without branching on the data type. */
export type GroundedScanResult = FoodIdentificationResult & {
  grounded?: GroundedMeta;
};

// ─────────────────────────────────────────────────────────────────────────────
// Errors + fetch helpers
// ─────────────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status?: number;
  /** `not-food` = the pipeline worked and decided the image isn't food; the
   * caller should NOT retry or fall back to another recognizer. */
  code?: 'not-food';
  constructor(message: string, status?: number, code?: 'not-food') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function buildUrl(path: string): string {
  return path.startsWith('/') ? `${API_BASE_URL}${path}` : `${API_BASE_URL}/${path}`;
}

async function fetchWithTimeout(
  path: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(buildUrl(path), { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(`Request to ${path} timed out. Check your connection.`);
    }
    throw new ApiError(
      error instanceof Error ? error.message : `Network request to ${path} failed.`,
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Unwraps the standard `{success,data,error}` envelope and throws on failure. */
async function unwrapEnvelope<T>(response: Response, path: string): Promise<T> {
  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError(`Invalid response from ${path} (HTTP ${response.status}).`, response.status);
  }
  if (!response.ok || !body.success || body.data == null) {
    const message = body?.error || `Request to ${path} failed (HTTP ${response.status}).`;
    throw new ApiError(message, response.status);
  }
  return body.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Endpoint wrappers (one per documented endpoint)
// ─────────────────────────────────────────────────────────────────────────────

/** `GET /healthz` — returns true when the backend is reachable and healthy. */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout('/healthz', { method: 'GET' }, DEFAULT_TIMEOUT_MS);
    if (!response.ok) return false;
    const body = (await response.json()) as { status?: string };
    return body.status === 'ok';
  } catch {
    return false;
  }
}

function inferMimeType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
}

/**
 * `POST /recognize` — multipart upload of the food image (field `image`).
 * `engine` selects the server-side recognizer: `gemini` (default, recommended)
 * or `yolo` (our trained model demo). Both return the same `RecognizeData` shape.
 */
export async function recognizeFood(
  imageUri: string,
  engine: RecognitionEngine = DEFAULT_RECOGNITION_ENGINE,
): Promise<RecognizeData> {
  const form = new FormData();
  form.append('image', {
    uri: imageUri,
    name: `scan.${inferMimeType(imageUri).split('/')[1]}`,
    type: inferMimeType(imageUri),
    // RN's FormData file part is not typed like the DOM's.
  } as unknown as Blob);
  form.append('engine', engine);

  const response = await fetchWithTimeout(
    '/recognize',
    { method: 'POST', body: form },
    RECOGNIZE_TIMEOUT_MS,
  );
  return unwrapEnvelope<RecognizeData>(response, '/recognize');
}

/** `GET /foods/search?q=<text>&limit=<n>` — fuzzy search over the food DB. */
export async function searchFoods(query: string, limit = 10): Promise<FoodSearchResult[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const response = await fetchWithTimeout(
    `/foods/search?${params.toString()}`,
    { method: 'GET' },
    DEFAULT_TIMEOUT_MS,
  );
  return unwrapEnvelope<FoodSearchResult[]>(response, '/foods/search');
}

/** `GET /foods/{id}` — full food detail, aliases, portions, modifiers. */
export async function getFood(id: string): Promise<FoodDetail> {
  const response = await fetchWithTimeout(
    `/foods/${encodeURIComponent(id)}`,
    { method: 'GET' },
    DEFAULT_TIMEOUT_MS,
  );
  return unwrapEnvelope<FoodDetail>(response, `/foods/${id}`);
}

/** `POST /foods/{id}/nutrition` — adjusted kcal/macros for a portion + modifiers. */
export async function getAdjustedNutrition(
  id: string,
  portion: string,
  modifiers: string[] = [],
): Promise<AdjustedNutrition> {
  const response = await fetchWithTimeout(
    `/foods/${encodeURIComponent(id)}/nutrition`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portion, modifiers }),
    },
    DEFAULT_TIMEOUT_MS,
  );
  return unwrapEnvelope<AdjustedNutrition>(response, `/foods/${id}/nutrition`);
}

export interface GroundCaloriesParams {
  recognized_dish: string;
  portion?: string;
  modifiers?: string[];
  top_k?: number;
}

/** `POST /calories` — RAG-grounded calorie/macro breakdown with `why` + sources. */
export async function groundCalories(params: GroundCaloriesParams): Promise<CalorieData> {
  const response = await fetchWithTimeout(
    '/calories',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    DEFAULT_TIMEOUT_MS,
  );
  return unwrapEnvelope<CalorieData>(response, '/calories');
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestration: image -> recognize -> grounded calories -> UI result shape
// ─────────────────────────────────────────────────────────────────────────────

function clampConfidence(value: number | undefined): number {
  if (value == null || Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function roundOrNull(value: number | null | undefined): number | undefined {
  // The Results UI treats `null`/`undefined` fiber as "—"; never fabricate it.
  if (value == null || Number.isNaN(value)) return undefined;
  return Math.round(value);
}

/**
 * The real pipeline: recognize the dish server-side, then ground its calories
 * and macros in the food database. Maps the two backend responses into the
 * `FoodIdentificationResult` shape the Results screen already renders, plus
 * `grounded` provenance.
 *
 * Throws on any failure (no recognition, "Unknown", or a backend error) so the
 * caller can fall back to the Gemini client and still show a full result.
 */
export async function recognizeAndGroundFood(
  imageUri: string,
  engine: RecognitionEngine = DEFAULT_RECOGNITION_ENGINE,
): Promise<GroundedScanResult> {
  const recognition = await recognizeFood(imageUri, engine);

  const label = recognition.food_label?.trim();
  if (!label || label.toLowerCase() === 'unknown') {
    throw new ApiError('No food recognized in the image.', undefined, 'not-food');
  }
  // ponytail: client-side abstain floor. The 217-class YOLO model always names
  // SOME dish (live calibration 2026-07-02: sky 0.199 "Misti Doi", noise 0.091,
  // wall 0.015 vs real haleem 0.570). Proper fix is a server-side abstain in
  // yolo_recognition.py — handed to Codex.
  if (engine === 'yolo' && recognition.confidence < YOLO_NOT_FOOD_FLOOR) {
    throw new ApiError('No food recognized in the image.', undefined, 'not-food');
  }

  const grounded = await groundCalories({ recognized_dish: label, top_k: 3 });
  const topRow = grounded.source_rows?.[0] ?? null;

  return {
    name: grounded.food_label || label,
    calories: Math.round(grounded.calories_kcal),
    protein: Math.round(grounded.protein_g),
    carbs: Math.round(grounded.carbs_g),
    fat: Math.round(grounded.fat_g),
    fiber: roundOrNull(grounded.fiber_g),
    servingSize: grounded.portion_label || '1 serving',
    confidence: clampConfidence(recognition.confidence),
    alternatives: recognition.alternatives?.map((alt) => ({
      name: alt.food_label,
      confidence: clampConfidence(alt.confidence),
    })),
    notes: grounded.why,
    grounded: {
      source: 'backend',
      foodId: grounded.food_id,
      portionLabel: grounded.portion_label,
      why: grounded.why,
      modelUsed: grounded.model_used,
      dataSource: topRow?.source ?? null,
      matchedLabel: topRow?.food_label ?? null,
      engine,
    },
  };
}
