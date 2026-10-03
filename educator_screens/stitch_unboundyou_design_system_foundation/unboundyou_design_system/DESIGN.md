---
name: UnboundYou Design System
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f3'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8ff'
  surface-container-highest: '#dbe2fb'
  on-surface: '#131b2d'
  on-surface-variant: '#414754'
  inverse-surface: '#283043'
  inverse-on-surface: '#edf0ff'
  outline: '#727785'
  outline-variant: '#c1c6d6'
  surface-tint: '#005bc1'
  primary: '#0058bc'
  on-primary: '#ffffff'
  primary-container: '#0e70e9'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#006c46'
  on-secondary: '#ffffff'
  secondary-container: '#67f9b4'
  on-secondary-container: '#007149'
  tertiary: '#825100'
  on-tertiary: '#ffffff'
  tertiary-container: '#a36700'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004494'
  secondary-fixed: '#6afcb7'
  secondary-fixed-dim: '#49df9d'
  on-secondary-fixed: '#002112'
  on-secondary-fixed-variant: '#005234'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#faf8ff'
  on-background: '#131b2d'
  surface-variant: '#dbe2fb'
typography:
  page-title:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  section-title:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-main:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
  label-bold:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  page-title-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar_width: 248px
  gutter: 24px
  container_max: 1440px
  stack_sm: 8px
  stack_md: 16px
  stack_lg: 32px
---

## Brand & Style
The design system for this B2B EdTech platform focuses on a **Corporate / Modern** aesthetic that balances high-end professionalism with technical reliability. The UI is designed to feel spacious and focused, reducing cognitive load for administrators and learners alike. 

The visual language utilizes a "Soft Professionalism" approach—combining crisp, geometric typography with generous whitespace and subtle elevation. The interface should evoke a sense of clarity, trust, and academic excellence, ensuring that the technology stays out of the way of the educational content.

## Colors
The palette is rooted in a high-contrast foundation for maximum legibility. **Electric Blue** is the engine of the interface, reserved strictly for interactive elements and brand identifiers. 

- **Primary (#2F80F9):** Use for primary buttons, active navigation states, and text links.
- **Surface Tones:** Use the Page Background for the main content canvas and the Panel Background for structural elements like sidebars, headers, or empty states to create subtle modularity.
- **Semantic Colors:** Success, Warning, and Danger colors must be used sparingly. Success is reserved for "Completed" or "Passed" states.
- **Text Hierarchy:** Always use the Primary Text color for headlines and table data; use Muted Text for labels, timestamps, and secondary descriptions.

## Typography
The system uses **Plus Jakarta Sans** across all levels to maintain a contemporary, approachable feel. 

- **Headings:** Apply a tight negative letter-spacing to headings to increase visual density and authority.
- **Body & Tables:** The default size for data-heavy views is 14px. Ensure a comfortable line height of 20px to maintain readability in long-form course descriptions or data tables.
- **Case Usage:** Use Sentence case for all labels and headings. Avoid All-Caps except for very small metadata labels or overlines.

## Layout & Spacing
This design system utilizes a **Fixed Grid** model for desktop, centered within the viewport once the sidebar is accounted for.

- **Sidebar:** Fixed at 248px. It remains persistent on desktop and collapses to a hamburger menu on mobile.
- **Main Canvas:** Uses a 12-column grid with 24px gutters. 
- **Vertical Rhythm:** Elements should follow an 8px scale. Use 16px for internal card padding and 32px to separate major sections.
- **Responsive Behavior:** On tablet, gutters reduce to 16px. On mobile, margins are 16px and the layout collapses to a single column.

## Elevation & Depth
Depth is achieved through a combination of **Tonal Layers** and **Ambient Shadows**. 

- **Level 0 (Base):** The main background (#FFFFFF).
- **Level 1 (Structural):** Sidebar and secondary panels (#F9FAFB) with no shadow, separated by a 1px border (#E5E9F0).
- **Level 2 (Cards):** Main content containers. Apply a 1px border (#E5E9F0) and a soft ambient shadow: `0px 4px 12px rgba(15, 23, 41, 0.08)`.
- **Level 3 (Overlay):** Modals and dropdowns. These should use a more pronounced shadow to signify temporary interaction: `0px 8px 24px rgba(15, 23, 41, 0.12)`.

## Shapes
The shape language is a mix of geometric and organic forms to differentiate between structural and decorative elements.

- **Structural Elements:** Cards and main panels use a 12px radius (`rounded-lg`) to feel modern and friendly.
- **Interactive Elements:** Buttons and Input fields use an 8px radius to maintain a professional, organized look.
- **System Indicators:** Avatars, Status Pills, and Badges use a full pill shape (9999px) to distinguish them from interactive buttons.

## Components
### Buttons & Inputs
- **Primary Button:** Solid #2F80F9 with white text, 8px radius.
- **Secondary Button:** Ghost style with 1px #E5E9F0 border and Primary Text.
- **Input Fields:** 8px radius, 1px #E5E9F0 border. Active state shifts border to #2F80F9 with a 2px soft glow.

### Navigation (Sidebar)
- **Active State:** Features a 4px solid left border (#2F80F9). The background of the item should be #2F80F9 at 8% opacity. Text and Icon both transition to Bold Primary Blue.

### Tabs
- **Underline Style:** Active tab uses a 2px bottom border (#2F80F9) and bold blue text. Inactive tabs use Muted Text and no border.

### Status Badges
- **Constraint:** Must always pair a Lucide-inspired icon (1.75px stroke) with text.
- **Success:** Emerald Green text/icon, light green background (8% opacity). Icon: `check-circle`.
- **Warning:** Amber text/icon. Icon: `alert-triangle`.
- **Danger:** Red text/icon. Icon: `x-circle`.
- **Info:** Primary Blue text/icon. Icon: `clock` or `info`.

### Iconography
- Use thin outline icons (1.75px stroke). Never use filled icons, as they carry too much visual weight for this refined system.