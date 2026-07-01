/**
 * Firestore data layer (CDX-001) — replaces the deleted Supabase project.
 *
 * All rows live under `users/{uid}/<collection>/<doc>`, so every query is
 * per-user and filters/sorts on a single field (`created_at`/`logged_at` ISO
 * strings compare lexicographically = chronologically) — no composite indexes
 * to manage. Row shapes mirror `src/types/database.ts` so screens keep
 * rendering the same objects they always did.
 *
 * Hydration is one doc per LOCAL day (`users/{uid}/hydration/{YYYY-MM-DD}`)
 * with an atomic `increment()` counter — no read-modify-write races, no
 * duplicate day rows (the failure class behind the old water-count bug).
 */
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit as queryLimit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { firestore } from './firebase';
import { dayBounds } from './analytics';
import type { FoodLog, HydrationLog, Json, Tables, WeightLog } from '../types/database';

export type ChatSession = Tables<'chat_sessions'>;
export type Favorite = Tables<'favorites'>;

const CHAT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const userCollection = (uid: string, name: string) =>
  collection(firestore, 'users', uid, name);

// ─────────────────────────────────────────────────────────────────────────────
// Food logs
// ─────────────────────────────────────────────────────────────────────────────

export async function addFoodLog(
  uid: string,
  log: Pick<FoodLog, 'name' | 'calories' | 'meal_type'> &
    Partial<Omit<FoodLog, 'id' | 'user_id' | 'created_at'>> & { notes?: string | null },
): Promise<void> {
  await addDoc(userCollection(uid, 'food_logs'), {
    ...log,
    user_id: uid,
    created_at: new Date().toISOString(),
  });
}

/** Food logs for the LOCAL days `startDay..endDay` (YYYY-MM-DD), newest first. */
export async function getFoodLogsInRange(
  uid: string,
  startDay: string,
  endDay: string = startDay,
): Promise<FoodLog[]> {
  const { start, end } = dayBounds(startDay, endDay);
  const snap = await getDocs(
    query(
      userCollection(uid, 'food_logs'),
      where('created_at', '>=', start),
      where('created_at', '<', end),
      orderBy('created_at', 'desc'),
    ),
  );
  return snap.docs.map((d) => ({ ...(d.data() as Omit<FoodLog, 'id'>), id: d.id }));
}

/** Cheap "did the user log anything on this local day?" check (limit 1). */
export async function hasFoodLogsOnDay(uid: string, day: string): Promise<boolean> {
  const { start, end } = dayBounds(day);
  const snap = await getDocs(
    query(
      userCollection(uid, 'food_logs'),
      where('created_at', '>=', start),
      where('created_at', '<', end),
      queryLimit(1),
    ),
  );
  return !snap.empty;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hydration — one doc per local day, doc id = YYYY-MM-DD
// ─────────────────────────────────────────────────────────────────────────────

export async function getHydration(uid: string, day: string): Promise<HydrationLog | null> {
  const snap = await getDoc(doc(firestore, 'users', uid, 'hydration', day));
  if (!snap.exists()) return null;
  return {
    id: snap.id,
    user_id: uid,
    log_date: day,
    count: (snap.data().count as number | undefined) ?? 0,
    created_at: null,
  };
}

/** Atomically adds `delta` glasses to the day's counter (creates the doc on
 * first tap). Callers check `count > 0` before passing a negative delta. */
export async function changeHydration(uid: string, day: string, delta: number): Promise<void> {
  await setDoc(
    doc(firestore, 'users', uid, 'hydration', day),
    { count: increment(delta), log_date: day, user_id: uid },
    { merge: true },
  );
}

export async function getHydrationInRange(
  uid: string,
  startDay: string,
  endDay: string,
): Promise<HydrationLog[]> {
  const snap = await getDocs(
    query(
      userCollection(uid, 'hydration'),
      where('log_date', '>=', startDay),
      where('log_date', '<=', endDay),
    ),
  );
  return snap.docs.map((d) => ({
    id: d.id,
    user_id: uid,
    log_date: d.data().log_date as string,
    count: (d.data().count as number | undefined) ?? 0,
    created_at: null,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Weight logs
// ─────────────────────────────────────────────────────────────────────────────

export async function getWeightLogsInRange(
  uid: string,
  startDay: string,
  endDay: string,
): Promise<WeightLog[]> {
  const { start, end } = dayBounds(startDay, endDay);
  const snap = await getDocs(
    query(
      userCollection(uid, 'weight_logs'),
      where('logged_at', '>=', start),
      where('logged_at', '<', end),
      orderBy('logged_at', 'asc'),
    ),
  );
  return snap.docs.map((d) => ({ ...(d.data() as Omit<WeightLog, 'id'>), id: d.id }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Favorites
// ─────────────────────────────────────────────────────────────────────────────

export async function getFavorites(uid: string): Promise<Favorite[]> {
  const snap = await getDocs(
    query(userCollection(uid, 'favorites'), orderBy('created_at', 'desc')),
  );
  return snap.docs.map((d) => ({ ...(d.data() as Omit<Favorite, 'id'>), id: d.id }));
}

export async function addFavorite(
  uid: string,
  foodData: Json,
  isCombination: boolean,
): Promise<void> {
  await addDoc(userCollection(uid, 'favorites'), {
    food_data: foodData,
    is_combination: isCombination,
    user_id: uid,
    created_at: new Date().toISOString(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat sessions
// ─────────────────────────────────────────────────────────────────────────────

/** Newest session, or null if none exists / the newest one has expired. */
export async function getLatestChatSession(uid: string): Promise<ChatSession | null> {
  const snap = await getDocs(
    query(userCollection(uid, 'chat_sessions'), orderBy('created_at', 'desc'), queryLimit(1)),
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  const session = { ...(d.data() as Omit<ChatSession, 'id'>), id: d.id };
  if (session.expires_at && new Date(session.expires_at).getTime() < Date.now()) {
    return null;
  }
  return session;
}

export async function createChatSession(uid: string): Promise<ChatSession> {
  const created_at = new Date().toISOString();
  const expires_at = new Date(Date.now() + CHAT_SESSION_TTL_MS).toISOString();
  const ref = await addDoc(userCollection(uid, 'chat_sessions'), {
    messages: [],
    created_at,
    expires_at,
    user_id: uid,
  });
  return { id: ref.id, user_id: uid, messages: [], created_at, expires_at };
}

export async function updateChatSessionMessages(
  uid: string,
  sessionId: string,
  messages: Json,
): Promise<void> {
  await updateDoc(doc(firestore, 'users', uid, 'chat_sessions', sessionId), { messages });
}
