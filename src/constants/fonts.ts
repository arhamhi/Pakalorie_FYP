/**
 * Pakalorie Typography System (P1 Mid)
 *
 * Source of truth: docs/DESIGN.md §2 Typography.
 *
 * Geist Sans  → all UI / body / headings
 * Instrument Serif → hero numerics on Results, large editorial numerics
 *
 * Loaded via @expo-google-fonts/{geist,instrument-serif} in app/_layout.tsx.
 */

export const FontFamily = {
  // Geist Sans weights actually loaded
  geistRegular: 'Geist_400Regular',
  geistMedium: 'Geist_500Medium',
  geistSemiBold: 'Geist_600SemiBold',
  geistBold: 'Geist_700Bold',
  // Instrument Serif (single weight)
  instrumentSerif: 'InstrumentSerif_400Regular',
} as const;

export type FontFamilyToken = keyof typeof FontFamily;

export interface TypeStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
}

/**
 * Type scale tokens.
 *
 * `display.hero` is reserved for the single calorie number on Results — do
 * not reuse it elsewhere.
 */
export const Type: Record<
  | 'displayHero'
  | 'displayLg'
  | 'headingLg'
  | 'headingMd'
  | 'headingSm'
  | 'bodyLg'
  | 'bodyMd'
  | 'bodySm'
  | 'caption'
  | 'numericLg'
  | 'displaySerifLg'
  | 'headlineSerifMd'
  | 'headlineSerifSm'
  | 'labelCaps',
  TypeStyle
> = {
  displayHero: { fontFamily: FontFamily.instrumentSerif, fontSize: 64, lineHeight: 68 },
  displayLg: { fontFamily: FontFamily.geistSemiBold, fontSize: 40, lineHeight: 44 },
  headingLg: { fontFamily: FontFamily.geistSemiBold, fontSize: 28, lineHeight: 32 },
  headingMd: { fontFamily: FontFamily.geistSemiBold, fontSize: 22, lineHeight: 28 },
  headingSm: { fontFamily: FontFamily.geistMedium, fontSize: 18, lineHeight: 24 },
  bodyLg: { fontFamily: FontFamily.geistRegular, fontSize: 16, lineHeight: 24 },
  bodyMd: { fontFamily: FontFamily.geistRegular, fontSize: 14, lineHeight: 20 },
  bodySm: { fontFamily: FontFamily.geistRegular, fontSize: 12, lineHeight: 16 },
  caption: { fontFamily: FontFamily.geistMedium, fontSize: 11, lineHeight: 14 },
  numericLg: { fontFamily: FontFamily.instrumentSerif, fontSize: 32, lineHeight: 36 },
  // Stitch additions (DESIGN.md §typography) — serif headings + caps labels.
  // Additive only: existing tokens keep their metrics so legacy layouts
  // don't clip; only restyled screens consume these.
  displaySerifLg: { fontFamily: FontFamily.instrumentSerif, fontSize: 48, lineHeight: 53 },
  headlineSerifMd: { fontFamily: FontFamily.instrumentSerif, fontSize: 32, lineHeight: 38 },
  headlineSerifSm: { fontFamily: FontFamily.instrumentSerif, fontSize: 24, lineHeight: 29 },
  // Consumers add textTransform: 'uppercase'.
  labelCaps: { fontFamily: FontFamily.geistSemiBold, fontSize: 12, lineHeight: 14, letterSpacing: 0.6 },
};

export type TypeToken = keyof typeof Type;
