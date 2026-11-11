/**
 * Calorie compensation (P2 Mid) — the only place the adjusted daily target is
 * computed.
 *
 *   target(today) = base + carryOver + burnedToday
 *
 * carryOver: for each of the last COMPENSATION_DAYS days that have food logged
 * (days with no logs are ignored; the user probably did not track them), the
 * surplus is `eaten - (base + burned that day)`. The summed surplus is spread
 * over the same number of days and subtracted from today's target, so eating
 * 600 kcal over spreads to -200 today. Under-eating adds allowance the same
 * way. The adjustment is capped at ±CAP_FRACTION of the base target.
 *
 * The divisor is always COMPENSATION_DAYS (3), NOT the number of days used: each
 * day's surplus is repaid at 1/3 per day while it stays in the 3-day window, so it
 * is fully repaid after 3 days. With only one logged day the adjustment is
 * therefore gentler (one third), by design.
 *
 * Burned calories are manual estimates (MET x weight x time), not measured.
 */

export const COMPENSATION_DAYS = 3;
export const CAP_FRACTION = 0.15;

export interface DayTotals {
  date: string; // YYYY-MM-DD local
  eaten: number;
  logged: boolean;
  burned: number;
}

export interface Compensation {
  base: number;
  carryOver: number; // negative = eat less today, positive = extra allowance
  burnedToday: number;
  target: number;
  capped: boolean;
  daysUsed: number;
}

export const ACTIVITIES = [
  { key: 'walking', label: 'Walking', met: 3.5 },
  { key: 'running', label: 'Running', met: 9.8 },
  { key: 'cycling', label: 'Cycling', met: 7.5 },
  { key: 'gym', label: 'Gym', met: 5 },
  { key: 'swimming', label: 'Swimming', met: 7 },
  { key: 'sports', label: 'Cricket / football', met: 6 },
] as const;

export type ActivityKey = (typeof ACTIVITIES)[number]['key'];

/** kcal = MET x weight(kg) x hours. Falls back to 70 kg if weight is unknown. */
export function estimateBurn(key: ActivityKey, minutes: number, weightKg?: number | null): number {
  const met = ACTIVITIES.find((a) => a.key === key)?.met ?? 3.5;
  return Math.round(met * (weightKg && weightKg > 0 ? weightKg : 70) * (minutes / 60));
}

/** `previous` = the days before today, any order. Today's burn is `burnedToday`. */
export function computeCompensation(
  base: number,
  previous: DayTotals[],
  burnedToday: number,
): Compensation {
  const used = [...previous]
    .filter((d) => d.logged)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, COMPENSATION_DAYS);

  const surplus = used.reduce((sum, d) => sum + (d.eaten - (base + d.burned)), 0);
  let carryOver = used.length ? -surplus / COMPENSATION_DAYS : 0;
  const cap = base * CAP_FRACTION;
  const capped = Math.abs(carryOver) > cap;
  carryOver = Math.round(Math.max(-cap, Math.min(cap, carryOver)));

  return {
    base,
    carryOver,
    burnedToday,
    target: Math.round(base + carryOver + burnedToday),
    capped,
    daysUsed: used.length,
  };
}

/** One-line honest explanation for the UI. */
export function explainCompensation(c: Compensation): string {
  const parts: string[] = [];
  if (c.carryOver !== 0) {
    parts.push(
      `${c.carryOver > 0 ? '+' : ''}${c.carryOver} kcal carried over from your last ${c.daysUsed} logged day${c.daysUsed === 1 ? '' : 's'}${c.capped ? ' (capped at 15%)' : ''}`,
    );
  }
  if (c.burnedToday > 0) parts.push(`+${c.burnedToday} kcal from logged activity`);
  return parts.length ? `${c.base} base ${parts.join(', ')}.` : '';
}
