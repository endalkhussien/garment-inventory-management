---
name: Industrial Neon
colors:
  surface: '#12131a'
  surface-dim: '#12131a'
  surface-bright: '#393841'
  surface-container-lowest: '#0d0e15'
  surface-container-low: '#1b1b22'
  surface-container: '#1f1f27'
  surface-container-high: '#292931'
  surface-container-highest: '#34343c'
  on-surface: '#e4e1ec'
  on-surface-variant: '#baccb0'
  inverse-surface: '#e4e1ec'
  inverse-on-surface: '#303038'
  outline: '#85967c'
  outline-variant: '#3c4b35'
  surface-tint: '#2ae500'
  primary: '#efffe3'
  on-primary: '#053900'
  primary-container: '#39ff14'
  on-primary-container: '#107100'
  inverse-primary: '#106e00'
  secondary: '#c5c5d6'
  on-secondary: '#2e2f3c'
  secondary-container: '#474856'
  on-secondary-container: '#b7b7c7'
  tertiary: '#fff8f7'
  on-tertiary: '#442927'
  tertiary-container: '#ffd3ce'
  on-tertiary-container: '#7a5955'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#79ff5b'
  primary-fixed-dim: '#2ae500'
  on-primary-fixed: '#022100'
  on-primary-fixed-variant: '#095300'
  secondary-fixed: '#e2e1f2'
  secondary-fixed-dim: '#c5c5d6'
  on-secondary-fixed: '#191b27'
  on-secondary-fixed-variant: '#454653'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#e7bdb8'
  on-tertiary-fixed: '#2c1513'
  on-tertiary-fixed-variant: '#5d3f3c'
  background: '#12131a'
  on-background: '#e4e1ec'
  surface-variant: '#34343c'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

The design system is built for high-performance environments where speed and precision are paramount. It targets a technical audience, drawing inspiration from industrial interfaces and modern developer tools.

The design style is **Modern Industrial**, mixing a structured, utilitarian layout with high-energy accents. It utilizes a sophisticated dark mode palette that avoids pure black in favor of deep, metallic grays. This creates a more readable, professional atmosphere that feels less like a game and more like a high-end instrument. Visual interest is generated through sharp contrast, monospaced typography details, and a singular, vibrant neon green accent that signals action and status.

## Colors

The palette is centered on a "Carbon and Neon" concept. The primary surface is a high-value industrial gray (`#2C2C34`), providing a more accessible foundation than traditional pitch-black dark modes. 

- **Primary Accent:** Neon Green (`#39FF14`). Use this exclusively for primary actions, success states, and critical progress indicators. Its high luminosity against the gray background ensures immediate visual hierarchy.
- **Surface Tiers:** Containers and nested elements use progressively lighter shades of gray (`#383842` and `#44444F`) to create depth without relying on heavy shadows.
- **Neutral/Secondary:** Muted blue-grays are used for non-critical icons and secondary text to maintain a cool, technical temperature across the UI.

## Typography

Typography in this design system emphasizes clarity and technical rigor. 

**Geist** is the primary typeface for headlines and body copy, chosen for its clean, geometric sans-serif aesthetic that feels modern and precise. For headlines, use tighter letter spacing and heavier weights to create a commanding presence.

**JetBrains Mono** is used for labels, metadata, and data points. This monospaced font reinforces the industrial, developer-centric nature of the interface. Use uppercase sparingly for small labels to improve scannability in dense data environments.

## Layout & Spacing

The design system utilizes a **Strict Grid** model based on a 4px baseline. This ensures all elements align to a predictable technical rhythm.

- **Desktop:** 12-column fluid grid with a maximum content width of 1440px. Gutters are fixed at 16px to maintain high information density.
- **Tablet:** 8-column fluid grid with 16px margins.
- **Mobile:** 4-column fluid grid with 16px margins. 

Component internal spacing should prioritize vertical rhythm, using `md` (16px) for standard padding and `sm` (8px) for tight groupings of related information.

## Elevation & Depth

Elevation is communicated through **Tonal Layering** and **Structural Outlines** rather than traditional shadows. This maintains the "Industrial" feel and ensures the UI feels flat and efficient.

1.  **Base Layer:** Primary background (`#2C2C34`).
2.  **Surface Layer:** Cards and containers use `#383842` with a subtle 1px border of `#4D4D5A`.
3.  **Active/Overlay Layer:** Modals or popped-over menus use the lighter `#44444F` surface. 

Instead of shadows, use the Neon Green accent for "Active" states (e.g., a 2px left border on an active list item or a subtle outer glow for a primary focused button).

## Shapes

The shape language is **Soft-Industrial**. While the layout is rigid, a slight corner radius (4px) prevents the interface from feeling overly aggressive or "brutalist."

- **Small Components:** Checkboxes and small tags use `rounded` (4px).
- **Standard Components:** Buttons, inputs, and cards use `rounded` (4px).
- **Specific Accents:** Do not use pill shapes or circular buttons, as they conflict with the structured, technical aesthetic. Stick to the 4px standard for consistency.

## Components

### Buttons
- **Primary:** Solid `#39FF14` background with black text. No shadow, 4px radius. 
- **Secondary:** Transparent background with a 1px `#39FF14` border and `#39FF14` text.
- **Tertiary:** Transparent background with `#B0B0BC` text; turns white on hover.

### Input Fields
Inputs use the `#383842` background with a 1px border of `#4D4D5A`. Upon focus, the border changes to `#39FF14` and a very faint green glow is applied. Labels should always use the monospaced `label-sm` style above the field.

### Cards
Cards are flat containers using the `#383842` fill. To distinguish between card types, use a 2px top-border accent. For "Alert" cards, the top border is Neon Green; for "Standard" cards, it is the same color as the border.

### Data Lists
Lists should have subtle dividers (`1px solid #4D4D5A`). Hover states on list items should shift the background to `#44444F` and add a Neon Green indicator on the far left edge (2px wide).

### Progress Indicators
Use the Neon Green for all progress bars and loading states. The "track" of the progress bar should be the base background color (`#2C2C34`) to provide maximum contrast for the moving element.