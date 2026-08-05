---
name: Esset Industrial Inventory
colors:
  surface: '#fcf8fa'
  surface-dim: '#dcd9db'
  surface-bright: '#fcf8fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f5'
  surface-container: '#f0edef'
  surface-container-high: '#eae7e9'
  surface-container-highest: '#e4e2e4'
  on-surface: '#1b1b1d'
  on-surface-variant: '#45464d'
  inverse-surface: '#303032'
  inverse-on-surface: '#f3f0f2'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#271901'
  on-tertiary-container: '#98805d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#fcdeb5'
  tertiary-fixed-dim: '#dec29a'
  on-tertiary-fixed: '#271901'
  on-tertiary-fixed-variant: '#574425'
  background: '#fcf8fa'
  on-background: '#1b1b1d'
  surface-variant: '#e4e2e4'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  data-tabular:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
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
  base: 4px
  unit-1: 0.25rem
  unit-2: 0.5rem
  unit-4: 1rem
  unit-6: 1.5rem
  unit-8: 2rem
  sidebar-width: 260px
  sidebar-collapsed: 64px
---

## Brand & Style
The design system is engineered for high-stakes inventory management, merging industrial efficiency with modern corporate reliability. It targets garment manufacturers and retail supervisors who require precision and speed. 

The aesthetic is **Corporate / Modern** with a slight leaning toward **Minimalism** to ensure data density doesn't become visual noise. The UI prioritizes high-trust interactions—using structured layouts, consistent alignment, and a utilitarian approach to whitespace. It evokes an emotional response of organized control, stability, and professional rigor.

## Colors
The palette is rooted in a deep industrial navy to establish authority.
- **Primary (#0F172A):** Reserved for core branding, sidebar backgrounds, and primary headings.
- **Action (#3B82F6):** A "Garment Blue" utilized exclusively for interactive elements, buttons, and active states.
- **Secondary (#64748B):** Used for metadata, icons, and secondary labels to create hierarchy without distraction.
- **Functional Colors:** Success Green is used for restock confirmations, Amber for low-stock thresholds, and Red for critical stock-outs or discrepancies.
- **Surface:** A cool off-white background reduces glare during long shifts, while pure white is reserved for content cards and data tables.

## Typography
This design system employs **Inter** for its exceptional legibility and neutral, professional tone. For inventory counts, SKU numbers, and ETB (Ethiopian Birr) currency values, **JetBrains Mono** is used to ensure perfect vertical alignment in columns, aiding rapid scanning of numerical data.

- **Headlines:** Use tighter letter spacing and semi-bold weights to maintain an industrial, compact feel.
- **Data Display:** Use `data-tabular` for all stock counts and pricing to prevent "jumping" numbers when values update.
- **Hierarchy:** Labels for "Shop" vs "HQ" views should be clearly differentiated using `label-caps` to signify the current user context.

## Layout & Spacing
The system utilizes a **fixed-fluid hybrid grid**. 
- **Navigation:** A persistent left-hand sidebar (260px) manages the primary application structure. It must be collapsible to 64px for power users who prioritize screen real estate for large inventory tables.
- **Content Area:** A max-width container of 1440px for HQ views to maintain readability, while Shop views may use a centered fluid column for simplified transactions.
- **Rhythm:** An 8px linear scale drives all padding and margins. 
- **Breakpoints:**
  - *Mobile (375px+):* Sidebar transforms into a bottom navigation bar or a hamburger overlay.
  - *Tablet (768px+):* Collapsed sidebar by default.
  - *Desktop (1024px+):* Full persistent sidebar for HQ; focused 1-column layout for Shop "Point of Sale" tasks.

## Elevation & Depth
The design system uses **Tonal Layers** combined with **Low-contrast outlines** to maintain a clean, flat aesthetic that feels structural.
- **Surface Level 0:** The off-white background (#F8FAFC).
- **Surface Level 1:** White cards (#FFFFFF) with a 1px border (#E2E8F0). This is the primary container for data tables and forms.
- **Elevation Shadows:** Shadows are used sparingly. Only "Active" elements like open dropdowns or modals receive a soft, medium-diffusion shadow (0 4px 6px -1px rgb(0 0 0 / 0.1)).
- **Interactions:** Buttons do not use heavy shadows but instead utilize subtle shifts in background saturation (e.g., Action Blue to a slightly darker shade on hover).

## Shapes
The shape language is **Soft (0.25rem)**. This provides a professional, geometric look that aligns with industrial software while removing the harshness of sharp corners. 
- **Standard (4px):** Applied to buttons, input fields, and checkboxes.
- **Large (8px):** Applied to data cards and modal containers.
- **Full (Pill):** Used exclusively for status badges (e.g., "In Stock", "Pending") to differentiate them from interactive buttons.

## Components
- **Buttons:** Primary buttons use `action_color_hex` with white text. Ghost buttons use `secondary_color_hex` for "Cancel" or "View More" actions.
- **Inventory Tables:** Rows must have a hover state (#F1F5F9) and subtle dividers. ETB currency should be right-aligned in `data-tabular` font.
- **Input Fields:** Use a 1px slate-200 border that thickens and changes to `action_color_hex` on focus.
- **Status Badges:** Compact, pill-shaped indicators. "Low Stock" uses a light amber background with dark amber text.
- **Sidebar:** The primary navigation uses the Navy background with high-contrast white text for the active link and 60% opacity for inactive links. Icons are Lucide-style (20px).
- **Shop Switcher:** A specialized dropdown in the header allowing HQ users to toggle between warehouse locations, featuring a distinct "Global" view icon.
- **Data Cards:** Simple white containers with a header row for KPIs like "Total Garments" or "Daily Revenue."