/**
 * Pakalorie Spacing & Radius System (P1 Mid)
 *
 * Source of truth: docs/DESIGN.md §3 Spacing & radius.
 *
 * 8-pt grid. Use named tokens, not magic numbers.
 */

export const Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export type SpacingToken = keyof typeof Spacing;

export const Radius = {
  card: 16,
  button: 12,
  input: 12,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof Radius;
