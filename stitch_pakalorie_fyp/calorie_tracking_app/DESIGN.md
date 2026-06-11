---
name: Calorie Tracking App
colors:
  surface: '#f4fbf2'
  surface-dim: '#d5dcd3'
  surface-bright: '#f4fbf2'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef6ec'
  surface-container: '#e9f0e7'
  surface-container-high: '#e3eae1'
  surface-container-highest: '#dde4db'
  on-surface: '#161d18'
  on-surface-variant: '#3d4a40'
  inverse-surface: '#2b322c'
  inverse-on-surface: '#ecf3ea'
  outline: '#6d7a6f'
  outline-variant: '#bccabd'
  surface-tint: '#006d3d'
  primary: '#006d3d'
  on-primary: '#ffffff'
  primary-container: '#1bad66'
  on-primary-container: '#00381d'
  inverse-primary: '#5cde91'
  secondary: '#ae2f34'
  on-secondary: '#ffffff'
  secondary-container: '#ff6b6b'
  on-secondary-container: '#6d0010'
  tertiary: '#785900'
  on-tertiary: '#ffffff'
  tertiary-container: '#bf9000'
  on-tertiary-container: '#3e2d00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#7afbab'
  primary-fixed-dim: '#5cde91'
  on-primary-fixed: '#00210f'
  on-primary-fixed-variant: '#00522c'
  secondary-fixed: '#ffdad8'
  secondary-fixed-dim: '#ffb3b0'
  on-secondary-fixed: '#410006'
  on-secondary-fixed-variant: '#8c1520'
  tertiary-fixed: '#ffdf9e'
  tertiary-fixed-dim: '#fabd00'
  on-tertiary-fixed: '#261a00'
  on-tertiary-fixed-variant: '#5b4300'
  background: '#f4fbf2'
  on-background: '#161d18'
  surface-variant: '#dde4db'
typography:
  display-lg:
    fontFamily: Instrument Serif
    fontSize: 48px
    fontWeight: '400'
    lineHeight: '1.1'
  headline-md:
    fontFamily: Instrument Serif
    fontSize: 32px
    fontWeight: '400'
    lineHeight: '1.2'
  headline-sm:
    fontFamily: Instrument Serif
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Geist Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Geist Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Geist Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-padding: 24px
  card-gap: 16px
  section-margin: 40px
---

## Brand & Style

This design system is built upon a foundation of **Minimalism** and editorial elegance, blending the high-utility aesthetic of modern health technology with the sophisticated heritage of Pakistani culture. The brand personality is disciplined yet inviting, aiming to evoke a sense of calm, clarity, and premium care. 

By leveraging heavy white space and high-quality typography, the interface recedes to let the user's data—their nutrition and progress—take center stage. Cultural motifs, such as subtle geometric Jali patterns or Mughal floral outlines, are integrated at near-invisible opacities to provide a sense of place and craft without cluttering the functional UI. The emotional response is one of "Digital Zen": a clutter-free environment that makes the often-stressful task of calorie tracking feel effortless and dignified.

## Colors

The color strategy adheres to a strict 70/20/10 distribution to ensure a high-end, airy feel.

- **70% White (#ffffff):** Used for all primary surfaces, backgrounds, and page containers to maximize "breathability."
- **20% Black (#000000):** Reserved for primary typography, icons, and high-emphasis call-to-action buttons, creating a sharp, authoritative contrast.
- **10% Accents:** 
    - **Green (#1bad66):** The primary indicator of health, success, and "safe" caloric ranges.
    - **Coral (#ff6b6b):** Used for warnings, over-limit indicators, or high-intensity metrics.
    - **Amber (#ffc107):** Used for notifications, streaks, and transitional states.

Use subtle grey-scale shifts (e.g., #f5f5f5) only for secondary input backgrounds or dividers to maintain the dominance of pure white.

## Typography

The typographic hierarchy relies on a "High-Low" pairing. **Instrument Serif** provides an editorial, premium feel for headers and milestone numbers, reminiscent of high-end health journals. **Geist Sans** handles the functional heavy lifting, providing exceptional legibility for data points, ingredient lists, and settings. 

Use sentence case for most headings to maintain a friendly tone. Large numerical data (like daily calorie totals) should be set in Instrument Serif to elevate data into an achievement.

## Layout & Spacing

The design system utilizes a **Fixed Grid** approach for mobile (4 columns) with exceptionally generous safe areas. The spacing rhythm is based on an 8px base unit. 

To achieve the "Cal AI" look, prioritize vertical breathing room. Cards should never feel cramped; internal padding of 24px is the standard. Content sections are separated by large 40px gaps to prevent the visual fatigue common in data-heavy tracking apps. Alignment should be strictly flush-left for text to maintain a clean vertical axis.

## Elevation & Depth

Visual hierarchy is managed through **Ambient Shadows** and tonal layering. Surfaces do not use harsh borders; instead, they "float" above the background.

- **Primary Shadows:** Use a very large blur (40px-60px) with extremely low opacity (approx. 4-6% black) and a slight Y-offset. This creates a soft, natural lift rather than a digital drop shadow.
- **Tonal Layers:** On the pure white background, use secondary containers with a #f9f9f9 fill to define sub-regions without breaking the minimalist aesthetic.
- **Interactive Depth:** On press, cards should subtly scale down (98%) rather than changing color, mimicking a tactile, physical response.

## Shapes

The shape language is defined by "Apple-style" continuity. Containers and buttons use large radii to feel friendly and organic. 

- **Cards & Primary Containers:** Use 24px (rounded-xl) for a modern, soft appearance.
- **Buttons & Chips:** Use pill-shapes (full rounding) for interactive elements to distinguish them from static information cards.
- **Progress Bars:** Use fully rounded end-caps to maintain the soft visual language even in data visualization.

## Components

### Cards
Cards are the primary vehicle for data. They must feature a white background, the standard ambient shadow, and 24px internal padding. Title text within cards should be Instrument Serif, while metadata is Geist Sans.

### Buttons
- **Primary:** Solid black with white Geist Sans text. 
- **Secondary:** Transparent with a 1px #eeeeee border.
- **Action-Specific:** Solid Green (#1bad66) for "Log Food" or "Save."

### Achievement Badges
Vibrant, circular components using the secondary accent colors (Coral and Amber). Incorporate a subtle, 5% opacity Pakistani geometric pattern as a background texture within the badge circle to denote "Rank" or "Level."

### Input Fields
Minimalist underlines or very soft-grey fills (#f5f5f5) with no borders. Focus states are indicated by the primary Green accent color for the cursor or underline.

### Cultural Motifs
Used as "Easter eggs" in the UI—placed at the bottom of long scrolls or as watermarks behind large empty states. These should be line-art style with a 0.5pt stroke in a very light grey (#eeeeee).