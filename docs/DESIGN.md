# Pakalorie FYP — Design System Reference

**Status:** P1 Final (June 2026) — light mode only; dark mode deferred. This doc reflects the **Stitch design system** (`stitch_pakalorie_fyp/calorie_tracking_app/DESIGN.md` + 6 screen mockups) adopted in the June UI sprint, mapped onto the existing token structure in `src/constants/`.

**North star:** Apple SwiftUI structural feel + Cal AI / MacroFactor personality, with editorial Instrument Serif headings and "Digital Zen" minimalism. Subtle Pakistani craft cues (Jali pattern watermarks) at near-invisible opacity — never clutter.

---

## 1. Color system — 70 / 20 / 10

| % | Role | Use |
|---|---|---|
| 70% | Surfaces | sage-tinted background + white floating cards |
| 20% | Text | near-black ink for primary content; solid-ink primary buttons |
| 10% | Accent | green for health/save/success; coral warnings; amber streaks |

(Dark mode flips: 70% near-black surfaces, 20% near-white text, 10% accent.)

### Tokens (semantic — never hex-named)

> **Semantics (matches `src/constants/colors.ts` — the code is the source of truth):**
> `surface.primary` = **page background**, `surface.secondary` = **cards**.

#### Light mode (Stitch palette)
| Token | Hex | Use |
|---|---|---|
| `surface.primary` | `#F4FBF2` | Page background (sage tint) |
| `surface.secondary` | `#FFFFFF` | Cards, modal sheets (float via shadow, no border) |
| `surface.tertiary` | `#E9F0E7` | Dividers, soft input fills, disabled fills |
| `text.primary` | `#161D18` | Headings, body copy (ink) |
| `text.secondary` | `#3D4A40` | Inactive icons, supporting text |
| `text.tertiary` | `#6D7A6F` | Placeholders, captions |
| `ink` | `#161D18` | Solid-black pill primary buttons |
| `onAccent` | `#FFFFFF` | Text/icons on accent or ink fills |
| `accentDeep` | `#006D3D` | Active nav, focus states, insights banner |
| `system.error` | `#BA1A1A` | Validation, destructive actions |
| `system.warning` | `#FF6B6B` | Over-limit indicators (coral) |

### Elevation (`Elevation` in colors.ts)
- `ambient` — cards: large-blur, 5%-opacity shadow + Android `elevation: 3`. No hard borders; tonal contrast (white on sage) carries hierarchy where shadows are weak.
- `banner` — deep-green insights/streak banner glow (`#006D3D` at 15%).
- Press feedback: scale to 98% (AnimatedPressable), not color/opacity shifts.

#### Dark mode (defined, not wired in May)
| Token | Hex |
|---|---|
| `surface.primary` | `#121212` |
| `surface.secondary` | `#1E1E1E` |
| `surface.tertiary` | `#2A2A2A` |
| `text.primary` | `#FFFFFF` |
| `text.secondary` | `#E5E5E5` |
| `text.tertiary` | `#A3A3A3` |

### Accents (user-selectable, default = green)

| Accent | Hex | Positioning |
|---|---|---|
| **Green (default)** | `#1BAD66` | Health, growth, achievement |
| **Gold** | `#FFC107` | Energy, clarity, optimism |
| **Coral** | `#FF6B6B` | Warmth, motivation, balance |

Implementation lives in `src/constants/colors.ts` (already in v2 — verified Day 1, no rewrite needed).

Accent applies to: primary CTAs, tab indicators, toggle ON state, focused input bottom border, progress fills, achievement badges, active nav icons.

Accent does **not** apply to: large surface fills, headings, body text, secondary buttons (those use outline + text.primary).

---

## 2. Typography

| Family | License | Use |
|---|---|---|
| **Geist Sans** | OFL (free) | All UI, body, headings |
| **Instrument Serif** | OFL (free) | Hero numerics on Results screen — the big calorie number gets the editorial serif treatment |

Loaded via:
```
@expo-google-fonts/geist
@expo-google-fonts/instrument-serif
```

### Type scale (mobile-first)

| Token | Size / line-height | Family | Weight |
|---|---|---|---|
| `display.hero` | 64 / 68 | Instrument Serif | 400 |
| `display.lg` | 40 / 44 | Geist Sans | 600 |
| `heading.lg` | 28 / 32 | Geist Sans | 600 |
| `heading.md` | 22 / 28 | Geist Sans | 600 |
| `heading.sm` | 18 / 24 | Geist Sans | 500 |
| `body.lg` | 16 / 24 | Geist Sans | 400 |
| `body.md` | 14 / 20 | Geist Sans | 400 |
| `body.sm` | 12 / 16 | Geist Sans | 400 |
| `caption` | 11 / 14 | Geist Sans | 500 |
| `numeric.lg` | 32 / 36 | Instrument Serif | 400 |
| `displaySerifLg` | 48 / 53 | Instrument Serif | 400 |
| `headlineSerifMd` | 32 / 38 | Instrument Serif | 400 |
| `headlineSerifSm` | 24 / 29 | Instrument Serif | 400 |
| `labelCaps` | 12 / 14, +0.6 tracking | Geist Sans | 600 |

`display.hero` is reserved for the single calorie number on Results. Don't reuse it elsewhere.

Stitch additions: serif headlines (`displaySerifLg` for brand/hero moments, `headlineSerifMd/Sm` for screen headers and large numerals) and `labelCaps` for uppercase metadata kickers (add `textTransform: 'uppercase'` at the consumer). Sentence case for headings; serif elevates data into an achievement.

---

## 3. Spacing & radius

8-pt grid: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

Border radius: `card = 24`, `button = 12` (legacy), `input = 16`, `pill = 999` (all new CTAs are pills).

---

## 4. Component pass (P1 Mid scope)

### Cards
- `surface.secondary` (white) background, floating on the sage page.
- **No borders** — `Elevation.ambient` shadow only (Android falls back to `elevation: 3` + tonal contrast).
- Radius 24. Padding: 16 default, 24 for hero cards. Internal vertical rhythm: 12.

### Buttons (Stitch system — `PillButton`)
- **Primary:** solid `ink` (black) pill, `onAccent` text, body.lg semibold.
- **Save/log actions:** solid `accent.green` pill, white text — green is *reserved* for logging/saving/health-positive actions ("Save to history", "Confirm & log").
- **Secondary:** transparent pill, 1px `surface.tertiary` border, `text.primary` text.
- **Destructive:** `system.error` background, white text.
- Pressed state: scale to 98% (not opacity).
- Disabled: 40% opacity, no press feedback.

### Inputs
- Soft `surface.tertiary` fill, **no border**, radius 16.
- Focus: `accentDeep` border/underline + green cursor (`selectionColor`).
- Error: 1px `system.error` border, helper text below in `system.error`.
- Placeholder: `text.tertiary`.

### Tab bar
- Floating pill geometry (kept from v2 — docked mockup variant rejected: it ripples into every screen's bottom padding).
- Solid `surface.secondary` background, no border, `Elevation.ambient`. No blur.
- Active label + icon: `accentDeep` duotone. Inactive: `text.tertiary` regular.
- Center scan FAB: `accent.green` circle, white Phosphor camera icon.

### Hero numeric (Results screen only)
- `display.hero` Instrument Serif, `text.primary`, no decoration.
- Sub-label "kcal" in `body.md` `text.secondary` directly below baseline, 8pt gap.

---

## 5. P1 Mid surfaces — design contract

Only three surfaces are in scope for the light-touch polish pass. Everything else stays as v2 styled it.

### Auth (`app/(auth)/`)
- Welcome screen: full-bleed `surface.secondary`, centered logo + tagline + 2 CTA buttons.
- Login / Signup: 1-column form, primary CTA at bottom, link to other flow above keyboard.
- Forgot password: single email input + primary CTA + back link.

### Capture (`app/(tabs)/scan.tsx`)
- Camera view full-bleed.
- Bottom sheet over camera: capture button (large, accent), gallery upload icon (left), close (right).
- Permission denied state: centered explainer card with "Open settings" CTA.
- Loading state after capture: skeleton card on the Results screen.

### Results (`app/(tabs)/scan.tsx` post-capture or modal)
- Hero card: food name (heading.lg) + confidence pill (caption) + Instrument Serif calorie number + "kcal" sub-label.
- 4-card macro grid: protein / carbs / fat / fiber. Each card = label (caption) + value (heading.md, Geist) + unit "g".
- "Save to history" primary CTA.
- Medical disclaimer footer in `body.sm` `text.tertiary`.

---

## 5b. Icons

Library: **`phosphor-react-native`** (MIT-licensed, 1500+ icons across 6 weights). `react-native-svg` is the runtime peer dep.

Why Phosphor over alternatives:
- React Native–native (proper RN exports, not a web-only port).
- 6 weights — `thin / light / regular / bold / fill / duotone` — let us mimic SF Symbols' filled vs. outlined states without swapping libraries.
- 9000+ glyphs cover everything we need (food, fire/streaks, camera, chat, crown, restaurant, etc.).
- Free and open. No attribution required.

Defaults:

| Use | Size | Weight |
|---|---|---|
| Nav / feature icons | 24 | `duotone` |
| Tab bar | 28 | `duotone` (active) / `regular` (inactive) |
| Inline form glyphs (back chevron, eye toggle) | 20 | `regular` |
| List rows | 24 | `regular` |
| Badges / CTAs (premium crown, success check) | 20–36 | `fill` |
| Streaks fire icon | 28 | `duotone` |

Usage:

```tsx
import { ForkKnifeIcon, CameraIcon, CrownIcon, FireIcon } from 'phosphor-react-native';

<ForkKnifeIcon weight="duotone" size={24} color={accent} />
<CrownIcon weight="fill" size={20} color={accent} />          // premium badge
<FireIcon weight="duotone" size={28} color="#FF6B35" />       // streaks
```

Conventions:
- Use the `*Icon` suffix (`CameraIcon`, not `Camera`). Bare exports are deprecated in v3.
- Color: pull `accent` from `useTheme()`; never hardcode `#1BAD66` for non-brand surfaces.
- Never use `lucide-react` or `@expo/vector-icons` in new code. v2 legacy screens still reference `@expo/vector-icons` and will be swept in Phase 2 polish.

---

## 6. Out of scope for P1 Mid

- Dark mode runtime switching (tokens exist; not wired in `ThemeContext` UI)
- Animations / micro-interactions beyond default press states
- Skeleton loaders beyond the Results screen
- Empty-state illustrations
- Onboarding visual redesign (v2's onboarding stays as-is)
- Accent picker UI (default green, no settings UI to switch yet)
- Liquid glass / blur effects on tab bar
- RTL polish beyond what v2 already has

---

## 7. Skills to invoke during UI work

- `impeccable` — rigid, follow exactly for the polish pass
- `frontend-design` — layout decisions
- `react native best practices` — coding standards
- `typeset` — typography pass

---

## 8. Source-of-truth files

- `src/constants/colors.ts` — color tokens (already exists from v2, verified)
- `src/constants/fonts.ts` — to be created in Week 1; exports type scale and font family constants
- `src/constants/spacing.ts` — to be created in Week 1; exports 8pt grid + radii
- `tailwind.config.js` — extend `theme.colors`, `theme.fontFamily`, `theme.spacing` with the tokens above so NativeWind utility classes match
