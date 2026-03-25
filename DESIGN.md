# Design System Strategy: Neon Kineticism

## 1. Overview & Creative North Star: "The Living Signal"
This design system is built to capture the high-octane, ephemeral energy of live broadcasting. The Creative North Star is **"The Living Signal"**—an aesthetic that rejects the static, boxed-in nature of traditional web interfaces in favor of a UI that feels like it’s being projected through a high-end lens.

By moving away from rigid 1px borders and "flat" design, we create an environment defined by depth, light, and motion. We break the "template" look through:
*   **Intentional Asymmetry:** Using the spacing scale (e.g., `spacing.20` vs `spacing.12`) to create a weighted layout that guides the eye.
*   **Atmospheric Depth:** Layers aren't separated by lines; they are separated by the "glow" of the signal and the density of the glass.
*   **Kinetic Energy:** The interface should feel "alive," using the secondary `lime` and tertiary `cyan` as sparks of data amidst the deep violet-black void.

## 2. Colors & Atmospheric Layering
The palette is a high-contrast interplay between the deep `surface` (`#0e0e11`) and the electric `primary` gradient. 

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section content. Boundaries must be defined solely through tonal shifts.
*   **Transitioning:** Move from `background` (`#0e0e11`) to `surface_container_low` (`#131316`) to define a sidebar.
*   **Nesting:** Place a `surface_container_high` (`#1f1f23`) card within a `surface_container` (`#19191d`) section. This creates a soft, sophisticated "lift" that feels integrated, not "pasted on."

### Surface Hierarchy
*   **Base:** `surface` (#0e0e11) — The infinite void.
*   **Level 1:** `surface_container_low` (#131316) — Large structural areas (navigation rails).
*   **Level 2:** `surface_container` (#19191d) — Main content zones.
*   **Level 3:** `surface_container_high` (#1f1f23) — Interactive components (cards, hover states).

### The "Glass & Gradient" Rule
To achieve a premium "Broadcast" feel:
*   **Glassmorphism:** Overlays (Modals, Popovers, Flyouts) must use `surface_variant` at 60% opacity with a `backdrop-blur` of 12px to 20px. This allows the neon "glows" of the background to bleed through.
*   **Signature Gradients:** Main CTAs and Hero accents must use the linear gradient from `primary` (#d394ff) to `primary_dim` (#aa30fa). Do not use flat fills for high-priority elements.

## 3. Typography: Editorial Authority
The type system pairs the geometric precision of **Plus Jakarta Sans** with the functional clarity of **Inter**.

*   **Display & Headlines (Plus Jakarta Sans):** Used for "The Hook." High-contrast sizing (e.g., `display-lg` at 3.5rem) should be used to create an editorial feel. Tighten letter-spacing slightly (-0.02em) for headlines to create a "locked-in" broadcast look.
*   **Body & Labels (Inter):** Used for "The Data." Inter provides maximum readability for fast-moving chat logs and technical stats.
*   **Hierarchy as Brand:** Use `secondary` (Lime) for small `label-sm` elements to call out "LIVE" or "NEW" status—this creates a high-visibility signal without overwhelming the primary violet brand.

## 4. Elevation & Depth: Light as Structure
We do not use shadows to represent weight; we use **Ambient Glows** and **Tonal Stacking**.

*   **The Layering Principle:** Depth is achieved by "stacking" the surface tiers. A `surface_container_highest` (#25252a) element provides a natural highlight against the `surface_dim` background.
*   **Ambient Glows:** For floating elements, use a diffused glow instead of a drop shadow. Use the `primary` color at 10-15% opacity with a 32px to 64px blur. This mimics the "bloom" of a neon light.
*   **The "Ghost Border" Fallback:** If containment is required for accessibility, use the `outline_variant` token at 15% opacity. This creates a "suggestion" of an edge rather than a hard stop.

## 5. Components: Style Guide

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary_dim`), white text (`on_primary_fixed`), `rounded-md` (0.75rem). On hover: apply a `primary` ambient glow.
*   **Secondary:** Ghost style. No fill, `outline_variant` at 20% opacity. Text in `secondary` (Lime). 
*   **Tertiary:** No background. Text in `on_surface_variant`. 

### Input Fields
*   **State:** Background should be `surface_container_highest`. 
*   **No Border:** Use a 2px bottom-accent of `primary_dim` that expands on focus. 
*   **Error:** Use `error` (#ff6e84) text and a subtle `error_container` background glow.

### Cards & Lists
*   **Prohibition:** Never use divider lines. 
*   **Separation:** Use `spacing.4` (1rem) vertical gaps or alternate between `surface_container` and `surface_container_high` backgrounds.
*   **Interactivity:** On hover, a card should shift from `surface_container` to `surface_bright` with a subtle `primary` glow.

### Specialized Components (TwitchZap Specific)
*   **Live Stream Container:** Use a `secondary` (Lime) 2px "Pulse" outer glow to indicate active transmission.
*   **Chat Bubbles:** Use `surface_container_low` for the background with a `tertiary` (Cyan) `label-sm` for the username to ensure it "pops" against the dark UI.

## 6. Do's and Don'ts

### Do
*   **Do** use the spacing scale to create asymmetrical layouts—large breathing room on one side, dense data on the other.
*   **Do** use `backdrop-blur` on all floating menus to maintain the "Glass" aesthetic.
*   **Do** use the `tertiary` (Cyan) for data visualization and technical readouts to differentiate from the `primary` brand.

### Don't
*   **Don't** use 1px solid lines. If you feel you need one, use a tonal shift or a "Ghost Border" instead.
*   **Don't** use pure black (#000000) for anything except the deepest background layers (`surface_container_lowest`).
*   **Don't** use standard "Drop Shadows." If it doesn't look like light is emitting from the object, the shadow is too heavy.