# Pakalorie FYP — Design System Reference

**Status:** P1 Mid (May 2026) — light mode only. Dark mode tokens defined but not wired in UI. Animations and micro-interactions deferred to June sprint.

**North star:** Apple SwiftUI structural feel + Cal AI / MacroFactor personality. Editorial, premium, not generic-AI-app.

---

## 1. Color system — 70 / 20 / 10

| % | Role | Use |
|---|---|---|
| 70% | Surfaces | white / off-white backgrounds, cards |
| 20% | Text | charcoal / black for primary content |
| 10% | Accent | user-selected accent for CTAs, active states, progress |

(Dark mode flips: 70% near-black surfaces, 20% near-white text, 10% accent.)

### Tokens (semantic — never hex-named)

#### Light mode
| Token | Hex | Use |
|---|---|---|
| `surface.primary` | `#FFFFFF` | Cards, modal sheets |
| `surface.secondary` | `#F5F5F5` | Page background |
| `surface.tertiary` | `#E5E5E5` | Borders, dividers, disabled fills |
| `text.primary` | `#121212` | Headings, body copy |
| `text.secondary` | `#525252` | Inactive icons, supporting text |
| `text.tertiary` | `#A3A3A3` | Placeholders, captions |
| `error` | `#D32F2F` | Validation, exceeded targets, destructive actions |

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

`display.hero` is reserved for the single calorie number on Results. Don't reuse it elsewhere.

---

## 3. Spacing & radius

8-pt grid: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

Border radius: `card = 16`, `button = 12`, `input = 12`, `pill = 999`.

---

## 4. Component pass (P1 Mid scope)

### Cards
- `surface.primary` background.
- 1px `surface.tertiary` border (light mode) for elevation without heavy shadow.
- Padding: 16. Internal vertical rhythm: 12.

### Buttons
- **Primary:** accent background, `#FFFFFF` text, 12 radius, 14h padding, body.lg semibold.
- **Secondary:** transparent background, 1px `surface.tertiary` border, `text.primary` text.
- **Destructive:** `error` background, white text.
- Pressed state: 90% opacity.
- Disabled: 40% opacity, no press feedback.

### Inputs
- `surface.primary` background, 1px `surface.tertiary` border, 12 radius.
- Focus: 2px accent bottom border (rest of border drops to 0).
- Error: 1px `error` border, helper text below in `error`.
- Placeholder: `text.tertiary`.

### Tab bar
- `surface.primary` background, 1px top border `surface.tertiary`.
- Active label + icon: accent. Inactive: `text.secondary`.
- No blur / liquid-glass for P1 Mid (deferred to June sprint).

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
