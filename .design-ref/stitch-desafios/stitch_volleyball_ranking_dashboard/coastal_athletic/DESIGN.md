---
name: Coastal Athletic
colors:
  surface: "#f9f9f9"
  surface-dim: "#dadada"
  surface-bright: "#f9f9f9"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#f3f3f4"
  surface-container: "#eeeeee"
  surface-container-high: "#e8e8e8"
  surface-container-highest: "#e2e2e2"
  on-surface: "#1a1c1c"
  on-surface-variant: "#3d494a"
  inverse-surface: "#2f3131"
  inverse-on-surface: "#f0f1f1"
  outline: "#6d797b"
  outline-variant: "#bcc9ca"
  surface-tint: "#006970"
  primary: "#006970"
  on-primary: "#ffffff"
  primary-container: "#00a3ad"
  on-primary-container: "#003235"
  inverse-primary: "#5dd8e2"
  secondary: "#954a00"
  on-secondary: "#ffffff"
  secondary-container: "#fd8100"
  on-secondary-container: "#5d2c00"
  tertiary: "#5f5e5b"
  on-tertiary: "#ffffff"
  tertiary-container: "#95938f"
  on-tertiary-container: "#2c2c29"
  error: "#ba1a1a"
  on-error: "#ffffff"
  error-container: "#ffdad6"
  on-error-container: "#93000a"
  primary-fixed: "#7df4ff"
  primary-fixed-dim: "#5dd8e2"
  on-primary-fixed: "#002022"
  on-primary-fixed-variant: "#004f54"
  secondary-fixed: "#ffdcc6"
  secondary-fixed-dim: "#ffb785"
  on-secondary-fixed: "#301400"
  on-secondary-fixed-variant: "#723700"
  tertiary-fixed: "#e5e2dd"
  tertiary-fixed-dim: "#c9c6c2"
  on-tertiary-fixed: "#1c1c19"
  on-tertiary-fixed-variant: "#474743"
  background: "#f9f9f9"
  on-background: "#1a1c1c"
  surface-variant: "#e2e2e2"
typography:
  headline-xl:
    fontFamily: Archivo Narrow
    fontSize: 48px
    fontWeight: "700"
    lineHeight: "1.1"
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Archivo Narrow
    fontSize: 32px
    fontWeight: "700"
    lineHeight: "1.2"
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Archivo Narrow
    fontSize: 24px
    fontWeight: "600"
    lineHeight: "1.2"
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: "400"
    lineHeight: "1.6"
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: "400"
    lineHeight: "1.5"
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: "500"
    lineHeight: "1.4"
  label-bold:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: "700"
    lineHeight: "1"
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: "600"
    lineHeight: "1"
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system embodies a premium, high-energy beach sports aesthetic. It targets active, social athletes who value professional-grade experiences and effortless scheduling. The interface should feel light, airy, and sun-drenched, evoking the feeling of a pristine beach club while maintaining the functional precision of a sports performance app.

The visual direction combines **Glassmorphism** and **Corporate/Modern** styles. It utilizes frosted-glass overlays to simulate the transparency of tropical water and the sun’s glow on sand. Large whitespace and high-contrast typography ensure a professional tone that differentiates the product from more casual, darker gaming or social themes.

## Colors

The palette is rooted in the natural elements of beach volleyball: the turquoise water (Sporty Blue), the vibrant competition (Vibrant Orange), and the warmth of the coastline (Sand/Beige).

- **Primary (Sporty Blue):** Used for primary actions, navigation states, and success indicators.
- **Secondary (Vibrant Orange):** Reserved for high-energy call-to-actions, urgent status updates (like Pending), and critical alerts.
- **Tertiary (Sand):** Acts as a soft surface color for grouping elements and secondary buttons, providing a warm alternative to clinical greys.
- **Neutral (White):** The foundation for the "light and airy" feel, used for card backgrounds and page-level containers.

Maintain a "Sun-Bleached" hierarchy: surfaces should rarely be pure white, instead using subtle Sand tints or semi-transparent glass layers to create depth.

## Typography

This design system uses a high-contrast pairing of **Archivo Narrow** and **Plus Jakarta Sans**.

- **Titles & Display:** Archivo Narrow provides a bold, condensed, and athletic feel. It should be used in uppercase for major headings to mirror sports stadium signage and jerseys.
- **Body & UI:** Plus Jakarta Sans offers a friendly, modern, and highly legible experience for long-form content, forms, and small labels. Its rounded terminals complement the overall shape language.

For mobile, scale headlines down by approximately 20%, but maintain the uppercase styling to preserve the brand's athletic identity.

## Layout & Spacing

The layout follows a **Fluid Grid** system with a generous 8px baseline.

- **Desktop:** 12-column grid with 24px gutters and 40px outer margins. Content should be centered with a maximum container width of 1440px to maintain focus.
- **Mobile:** 4-column grid with 16px gutters and 16px margins.
- **Rhythm:** Use "Lg" (48px) spacing between major sections and "Md" (24px) for inner card padding to ensure an "airy" feel.

The layout should prioritize vertical stacking for sports rankings and use horizontal scrolling carousels for booking slots on smaller screens.

## Elevation & Depth

Visual hierarchy is established through a combination of **Glassmorphism** and **Ambient Shadows**.

1.  **The Base Layer:** A soft gradient from White to Sand (#F5F2ED).
2.  **The Surface Layer:** Cards and containers use pure white with a 24px blur shadow. Shadows are low-opacity (8-12%) and tinted with the Primary Blue to prevent a "dirty" grey look.
3.  **The Glass Layer:** Overlays (modals, navigation sidebars, and filters) use a semi-transparent white background (70% opacity) with a 12px backdrop-filter blur and a 1px solid white border at 40% opacity.
4.  **Interaction:** Elements should subtly lift on hover, increasing shadow spread and slightly decreasing the glass opacity to feel more "tangible."

## Shapes

The shape language is extremely soft and approachable, using large corner radii to contrast the sharp, condensed typography.

- **Cards:** Use a 24px (2xl) radius to create a friendly, premium container.
- **Buttons:** Use a 16px radius for a modern "squircle" look.
- **Chips & Status Indicators:** Use fully rounded (pill-shaped) ends.
- **Inputs:** Use a 12px radius to balance precision with the overall soft aesthetic.

## Components

### Buttons

- **Primary:** Sporty Blue (#00A3AD) background, white text. Bold weight. High-contrast shadow on hover.
- **Action (Orange):** Vibrant Orange (#FF8200) for booking confirmations or "Play Now."
- **Secondary (Sand):** Sand (#F5F2ED) background with Sporty Blue text. No border.

### Cards

- **Ranking Card:** White background, 24px radius, subtle Sporty Blue tinted shadow. Headline in Archivo Narrow.
- **Booking Card:** Incorporates Glassmorphism for the "Time Slot" section to overlay the court imagery.

### Status Indicators

- **Pending:** Vibrant Orange (#FF8200) text on a light sand/orange tinted pill background (10% opacity).
- **Confirmed:** Sporty Blue (#00A3AD) background with white text.

### Inputs & Selection

- **Inputs:** White background with a subtle Sand border (#F5F2ED). On focus, the border transitions to Sporty Blue with a soft outer glow.
- **Lists:** Clean rows with 16px vertical padding, separated by 1px Sand dividers. High-quality icons should use Sporty Blue.
