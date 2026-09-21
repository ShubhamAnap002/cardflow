---
name: Precision Slate & Royal Azure
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#434655'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#4648d4'
  on-secondary: '#ffffff'
  secondary-container: '#6063ee'
  on-secondary-container: '#fffbff'
  tertiary: '#006242'
  on-tertiary: '#ffffff'
  tertiary-container: '#007d55'
  on-tertiary-container: '#bdffdb'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.025em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  margin: 1rem
  margin-tablet: 1.5rem
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system embodies high-throughput executive efficiency. It caters to modern founders, business development leads, conference attendees, and corporate executives who process dozens of physical business contacts in minutes. The aesthetic aligns with next-generation productivity tools: pristine, surgically precise, high-contrast, and hyper-focused.

The visual direction merges **Minimalism** and **Tactile Precision**. The interface eliminates non-essential ornamentation, relying on high-density information architecture, crisp borders, and optical hierarchy. The interface projects reliability, automated intelligence, and frictionless tactile responsiveness. Users feel organized, empowered, and confident that complex OCR and AI extractions occur with zero data loss.

## Colors

The color system centers around a surgical light palette anchored by rich slate neutrals and vivid chromatic markers.

- **Primary (`#2563EB`)**: Royal Azure serves as the core interaction engine. It commands attention for batch scan actions, focus highlights, and verified completion states. Its pressed state shifts to deep azure (`#1D4ED8`), backed by an atmospheric wash (`#EFF6FF`) for active row states and selection bounds.
- **Secondary (`#6366F1`)**: Indigo functions as the dedicated AI signature. It denotes intelligent card parsing, automated enrichment tags, and smart deduplication suggestions.
- **Tertiary (`#10B981`)**: Emerald Green validates confidence scores, field-level OCR verifications, and synchronized CRM exports. Paired with Amber (`#F59E0B`) strictly for ambiguous text requiring manual user review.
- **Neutrals**: Grounded in cool slate hierarchy. Deep Navy Slate (`#0F172A`) commands titles, headline numbers, and active glyphs. Secondary Slate (`#475569`) renders metadata and structural captions, while Slate-400 (`#94A3B8`) handles input placeholders and inactive borders.
- **Backgrounds & Dividers**: Crisp pure white (`#FFFFFF`) forms the elevated card base, floating above a foundational cool slate floor (`#F8FAFC`). Hairline strokes use slate-200 (`#E2E8F0`) with 1px precision.

## Typography

The type hierarchy relies entirely on `Inter` to deliver systematic clarity across tight card layouts and high-density lead lists.

Titles and numerical indicators use tight negative tracking (`-0.02em` to `-0.03em`) combined with bold weights (`600`, `700`) to evoke modern software refinement and immediate legibility. Body text prioritizes scannability: contact details, email strings, and job titles employ generous line heights (`140%` to `150%`) with neutral tracking to prevent character collision in dense data tables.

All uppercase tags (e.g., status badges, batch indicators, export tags) utilize `label-sm` with deliberate positive letter-spacing (`+0.04em`) to maintain sharp contrast against tinted container fills.

## Layout & Spacing

Layouts adhere to an 8pt base grid with a 4pt sub-grid for internal component alignment.

- **Mobile Viewport (Primary)**: Single-column flow with a fixed outer canvas margin of `1rem` (16px) and internal column gaps of `0.75rem` (12px) to maximize horizontal data footprint.
- **Tablet / Large Mobile Reflow**: Expands to a multi-column responsive split layout (master batch list on the left, card preview and AI extraction editor on the right). Canvas margins expand to `1.5rem` (24px) with gutters at `1rem` (16px).
- **Component Geometry**: Compact padding (`space-xs` to `space-sm`) separates icon glyphs from label strings within metadata badges. Input rows and card containers use `space-md` (16px) internally to prevent accidental tap collisions during rapid card triage.
- **Safe Zones & Floating Controls**: The bottom `5.5rem` (88px) of mobile screen space is reserved for the floating dock and action trigger layer, incorporating dynamic platform safe areas.

## Elevation & Depth

Visual depth is achieved through structural tonal planes, crisp 1px borders, and ultra-subtle directional ambient shadows. Outdated multi-stop gradients and murky drop-shadows are strictly excluded.

- **Base Layer (Canvas)**: Tinted slate surface (`#F8FAFC`).
- **Surface Tier 1 (Cards, List Items)**: Pure `#FFFFFF` resting directly on the canvas, delineated by a hairline border (`1px solid #E2E8F0`). Under soft ambient lighting, cards apply a micro-shadow: `0 1px 2px 0 rgba(15, 23, 42, 0.04)`.
- **Surface Tier 2 (Active/Selected Card)**: Pure `#FFFFFF` lifted with an expanded ambient occlusion: `0 8px 24px -4px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.03)`. The border shifts to `#2563EB` at 1.5px thickness.
- **Surface Tier 3 (Floating CTA Dock / Overlays)**: Glassmorphic high-density surface using `#FFFFFF` at 92% opacity with `backdrop-filter: blur(16px)` and a surrounding contour border (`1px solid rgba(226, 232, 240, 0.8)`). Grounded by a deep ambient cast: `0 12px 32px -4px rgba(15, 23, 42, 0.12)`.

## Shapes

The shape system balances approachable ergonomics with architectural precision using a `roundedness` rating of 2.

- **Standard Elements (0.5rem / 8px)**: Segmented controls, input fields, dropdown menus, and standard utility buttons.
- **Structural Containers (1rem / 16px to 1.25rem / 20px)**: Contact scan cards, bulk queue list panels, and camera viewfinder overlays (`rounded-2xl`).
- **Interactive Micro-Components & Badges (9999px / Full Pill)**: Status chips, AI extraction indicator tags, confidence tags, and the central primary floating scan dock button.

## Components

### Buttons
- **Primary Action**: Full pill or `rounded-lg` element in `#2563EB` with `#FFFFFF` text. Micro-interaction: subtle press compression (`scale(0.98)`). No heavy inner bevels; uses an edge-to-edge optical fill.
- **Secondary / Ghost Action**: `#FFFFFF` fill with `1px solid #E2E8F0`, slate-800 (`#1E293B`) text, switching to `#F1F5F9` on hover/press.
- **AI Assist Action**: Tinted indigo surface (`#EEF2FF`), `#4F46E5` label, featuring an indigo micro-sparkle glyph.

### Cards & Scanned Records
- Surface: `#FFFFFF`, `rounded-2xl` (16px), bordered by `1px solid #E2E8F0`.
- Internal Layout: Card thumbnail preview thumbnail (64x40px, rounded-md) anchored on the left. Contact name (`headline-sm`), title/organization (`body-md`), and status indicators aligned horizontally.
- Swipe & Action States: Swiping reveals action glyphs (Export, Retake, Trash) with haptic stops.

### Input Fields & Extraction Cells
- Base state: Crisp `#FFFFFF` surface with `1px solid #CBD5E1`, padded with `space-md` (16px) horizontally and `space-sm` (12px) vertically.
- Focus state: Border transitions to `#2563EB` with a `0 0 0 3px rgba(37, 99, 235, 0.12)` halo ring.
- Confidence Highlighting: If AI confidence is low (&lt;85%), input adopts an amber hairline contour (`#F59E0B`) with a small "Review" chip docked on the right margin.

### Chips & Badges
- **Verified Chip**: Pill shape, background `#ECFDF5`, text `#065F46`, paired with an emerald check icon.
- **AI Extracted Chip**: Pill shape, background `#EEF2FF`, text `#3730A3`.
- **Review Alert Chip**: Pill shape, background `#FFFBEB`, text `#92400E`.

### Segmented Controls
- Enclosing container: `#F1F5F9` rounded-lg pill with 4px inner padding.
- Sliding pill indicator: `#FFFFFF`, `rounded-md`, elevated with `0 1px 3px rgba(15, 23, 42, 0.08)`. Text transitions from `#64748B` to `#0F172A` with semi-bold emphasis.

### Floating Capture Dock
- Positioned floating `20px` above screen bottom, centered.
- Structure: Translucent frosted bar (`#FFFFFF` at 92%, `backdrop-filter: blur(16px)`), containing a primary batch scanner trigger (`#2563EB`, full pill, white scan aperture icon), queue counter indicator badge, and export shortcut.