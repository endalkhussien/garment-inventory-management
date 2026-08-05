---
name: Green Cybernetic Pulse
colors:
  surface: '#131318'
  surface-dim: '#131318'
  surface-bright: '#39383e'
  surface-container-lowest: '#0e0e13'
  surface-container-low: '#1b1b20'
  surface-container: '#1f1f25'
  surface-container-high: '#2a292f'
  surface-container-highest: '#35343a'
  on-surface: '#e4e1e9'
  on-surface-variant: '#baccb0'
  inverse-surface: '#e4e1e9'
  inverse-on-surface: '#303036'
  outline: '#85967c'
  outline-variant: '#3c4b35'
  surface-tint: '#2ae500'
  primary: '#efffe3'
  on-primary: '#053900'
  primary-container: '#39ff14'
  on-primary-container: '#107100'
  inverse-primary: '#106e00'
  secondary: '#d3fbff'
  on-secondary: '#00363a'
  secondary-container: '#00eefc'
  on-secondary-container: '#00686f'
  tertiary: '#fef8ff'
  on-tertiary: '#3c0090'
  tertiary-container: '#e5d7ff'
  on-tertiary-container: '#751fff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#79ff5b'
  primary-fixed-dim: '#2ae500'
  on-primary-fixed: '#022100'
  on-primary-fixed-variant: '#095300'
  secondary-fixed: '#7df4ff'
  secondary-fixed-dim: '#00dbe9'
  on-secondary-fixed: '#002022'
  on-secondary-fixed-variant: '#004f54'
  tertiary-fixed: '#e9ddff'
  tertiary-fixed-dim: '#d1bcff'
  on-tertiary-fixed: '#23005b'
  on-tertiary-fixed-variant: '#5700c9'
  background: '#131318'
  on-background: '#e4e1e9'
  surface-variant: '#35343a'
typography:
  headline-xl:
    fontFamily: Sora
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  body-md:
    fontFamily: Sora
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Sora
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
  container-max: 1440px
---

## Brand & Style

The design system is centered around the "Green Cybernetic Pulse" North Star—a high-energy, retro-futuristic aesthetic that bridges the gap between 80s arcade nostalgia and high-performance developer tools. The target audience includes tech-forward power users, developers, and creative technologists who value a UI that feels alive and reactive.

The style is a fusion of **Retro-futurism** and **Glassmorphism**. It utilizes a deep, nocturnal canvas to make neon accents appear as if they are emitting actual light. The interface should feel like a high-end command deck: precise, dark, and electrically charged.

- **Atmosphere:** Kinetic, digital, and immersive.
- **Visual Strategy:** Dark surfaces layered with semi-transparent glass panels, high-contrast typography, and glowing borders.

## Colors

The palette is anchored by the primary neon green, serving as the "pulse" of the system. It is supported by a secondary cyber-cyan and a deep tertiary violet to provide a full spectrum of digital light.

- **Primary (#39FF14):** Used for critical actions, active states, and "on" signals. It should be treated as a light source.
- **Surface:** The base neutral is a near-black obsidian (#0A0A0F). Secondary surfaces use a slightly lighter grey-blue to maintain depth.
- **Semantic:** Use the primary green for success, the tertiary violet for warnings/info, and a pure bright white for critical errors against the dark background.

## Typography

The typography uses **Sora** exclusively to leverage its geometric clarity and futuristic "ink traps." 

- **Headlines:** Use Bold and ExtraBold weights. Large headlines should occasionally use the primary green color to break the rhythm of white text.
- **Body:** Stick to Regular weight for readability. Use the primary green for inline links or emphasized technical terms.
- **Labels:** Always uppercase with increased letter spacing to mimic data readouts on a HUD.

## Layout & Spacing

This design system employs a **Fluid Grid** model with a strict 4px base unit. 

- **Grid:** A 12-column layout for desktop, transitioning to 4 columns on mobile.
- **Rhythm:** Use generous margins to create a "letterboxed" cinematic feel. 
- **Adaptation:** On mobile, padding is reduced but the "glow" from elements should still bleed slightly into the margins to maintain the atmospheric depth.

## Elevation & Depth

Depth is not achieved through shadows, but through **Luminance and Transparency**.

- **Z-Axis:** Higher elevation levels are represented by lighter background tints and increased backdrop-blur (12px to 20px).
- **Glowing Outlines:** Instead of traditional shadows, elevated containers use a 1px inner border of the primary green at 20% opacity.
- **Backdrop:** Use a subtle radial gradient behind primary content areas to simulate a soft green light source behind the UI panels.

## Shapes

The shape language is **Soft (0.25rem)**, providing just enough rounding to feel modern and engineered without losing the aggressive edge of a retro-tech aesthetic.

- **Large Panels:** Use `rounded-lg` (0.5rem) for main dashboard cards.
- **Interactive Elements:** Use the base 0.25rem for buttons and inputs to keep them looking tactile and sharp.

## Components

- **Buttons:** Primary buttons use a solid primary green background with black text for maximum contrast. Secondary buttons use a "ghost" style with a primary green border and a soft green outer glow on hover.
- **Cards:** Use a semi-transparent dark fill (80% opacity) with a backdrop-blur. The top border should have a subtle 1px highlight.
- **Input Fields:** Darker than the surface background with a primary green bottom-border that "pulses" (increases in brightness) when focused.
- **Chips:** Small, pill-shaped elements with the secondary cyan or primary green text and a very low-opacity background tint.
- **HUD Overlays:** Specific components for data visualization should use thin 1px lines and monospaced-style Sora digits to reinforce the cybernetic theme.