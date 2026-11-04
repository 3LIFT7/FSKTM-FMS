---
name: FSKTM Facility Management System
description: UTHM facility booking, equipment, and maintenance operations
colors:
  uthm-navy: "#152A61"
  operational-blue: "#203F91"
  theme-blue: "#1E3A8A"
  uthm-red: "#E2252A"
  neutral-white: "#FFFFFF"
  neutral-ground: "#F5F7FB"
  neutral-ink: "#15213A"
  neutral-muted: "#52627A"
  neutral-border: "#D9E0EA"
  semantic-success: "#16A34A"
  semantic-warning: "#F59E0B"
  semantic-error: "#DC2626"
  semantic-info: "#2563EB"
typography:
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "58px"
    fontWeight: 650
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "27px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.5
rounded:
  sm: "7px"
  md: "8px"
  lg: "10px"
  xl: "16px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "34px"
components:
  button-primary:
    backgroundColor: "{colors.operational-blue}"
    textColor: "{colors.neutral-white}"
    rounded: "{rounded.sm}"
    padding: "12px 24px"
    height: "52px"
  button-google:
    backgroundColor: "{colors.neutral-white}"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.sm}"
    padding: "12px 24px"
    height: "54px"
  input-field:
    backgroundColor: "{colors.neutral-white}"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
    height: "48px"
  role-row:
    backgroundColor: "{colors.neutral-white}"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
  link-staff-portal:
    textColor: "{colors.operational-blue}"
    rounded: "{rounded.sm}"
    padding: "8px 0"
---

# Design System: FSKTM Facility Management System

## 1. Overview

**Creative North Star: "The Campus Operations Desk"**

This is a working university service. It should feel clear, trustworthy, and official, with the UTHM identity visible and the task easy to find. Inter carries both headings and controls so the interface stays familiar across sign-in, dashboards, tables, and facility workflows.

**The 60/30/10 Rule.** Aim for 60% light neutral surfaces, 30% UTHM navy, and 10% blue and red accents. Treat this as a visual balance across a screen, not a pixel-count requirement. Keep green, amber, and red status colors limited to status feedback.

Use restrained borders and tonal differences to separate content. Shadows are rare and functional. At mobile widths, stack the brand and task surfaces, keep all content within the viewport, and preserve readable line lengths.

**Key Characteristics:**
- Official UTHM and FSKTM identity.
- White and cool-neutral working surfaces balanced by deep navy.
- One clear primary action per task.
- Familiar, keyboard-operable controls with visible focus.

## 2. Colors

The palette pairs institutional navy with operational blue, UTHM red, and cool white neutrals.

### Primary
- **Operational Blue** (#203F91): Primary sign-in and high-priority actions on light surfaces.
- **UTHM Navy** (#152A61): Brand panels, staff identity areas, and strong structural surfaces.

### Secondary
- **System Blue** (#1E3A8A): Shared Ant Design theme accent, selected navigation, and existing primary actions.

### Tertiary
- **UTHM Red** (#E2252A): Small brand marks and key emphasis. Keep it sparse.

### Neutral
- **White** (#FFFFFF): Main working surface and form area.
- **Cool Ground** (#F5F7FB): Page background behind content.
- **Ink** (#15213A): Headings and primary body copy.
- **Muted Ink** (#52627A): Supporting copy and secondary labels.
- **Divider** (#D9E0EA): Borders and separators.

### Semantic
- **Success** (#16A34A): Completed or available states.
- **Warning** (#F59E0B): In-progress or attention states.
- **Error** (#DC2626): Failed or open issue states.
- **Information** (#2563EB): Informational or booked states.

**The 60/30/10 Rule.** Keep neutrals dominant, use navy to establish identity, and reserve blue/red accents for actions and emphasis.

## 3. Typography

**Display Font:** Inter (with system-ui, sans-serif fallback)  
**Body Font:** Inter (with system-ui, sans-serif fallback)  
**Label/Mono Font:** Inter for labels; monospace only for identifiers and codes.

**Character:** Direct and readable. Use weight and spacing to create hierarchy instead of decorative type or oversized all-caps labels.

### Hierarchy
- **Display** (700, 58px, 1.08): Login identity headline on wide screens; reduce to 38px on narrow screens.
- **Headline** (650, 27px, 1.2): Page or form title.
- **Title** (600, 14–15px, 1.5): Section heading and important supporting text.
- **Body** (400, 14px, 1.55): Main interface copy; keep prose near 65–75 characters per line.
- **Label** (600, 12–13px, 1.5): Field names, status explanations, and compact metadata.

**The One Family Rule.** Use Inter throughout the interface; change weight and size to distinguish roles.

## 4. Elevation

Depth comes from surface contrast and fine borders. The login screen uses two flat panels; role rows and fields use a thin border. Avoid broad decorative shadows. Reserve a small focus halo for keyboard focus and a low shadow for controls only when the existing component requires it.

### Shadow Vocabulary
- **Focus halo** (`0 0 0 3px rgb(32 63 145 / 14%)`): Focused staff fields.
- **Brand marker halo** (`0 0 0 4px rgb(226 37 42 / 16%)`): Small status marker on the identity panel.

**The Flat-By-Default Rule.** Surfaces stay flat at rest. Use borders first; elevation only to clarify focus or state.

## 5. Components

Controls use clear labels, restrained borders, and a visible focus state. Keep shape consistent across sign-in and operational screens.

### Buttons
- **Shape:** Gently curved corners (7px).
- **Primary:** Operational Blue with white text; staff action is 52px high and full width.
- **Google sign-in:** White surface, neutral border, Google mark, and a clear action label.
- **Hover / Focus:** Darken the blue on hover; show a 3px red outline with offset on keyboard focus.
- **Disabled / Loading:** Keep the label legible and signal the waiting state without layout movement.

### Cards / Containers
- **Corner Style:** 7–10px on compact rows and controls; 16px only for larger existing cards.
- **Background:** White on cool ground, or navy for the identity panel.
- **Shadow Strategy:** Flat by default; use fine borders to define boundaries.
- **Internal Padding:** 12–24px for compact components; wider panels use responsive outer spacing.

### Inputs / Fields
- **Style:** White background, neutral border, and compact rounded corners (7px).
- **Focus:** Operational Blue border and a subtle focus halo.
- **Error / Disabled:** Use the shared semantic error color and preserve readable contrast.
- **Autofill:** Do not prefill staff credentials or present demo credential presets.

### Chips / Role Rows
- **Style:** White or near-white surface, light border, role icon, role name, and email-domain hint.
- **State:** Informational only; the sign-in flow assigns the academic role from the verified Google email.

### Navigation
- **Style:** Links use Operational Blue and a clear hover underline.
- **Focus:** Keep a visible 3px outline with offset.
- **Authentication:** Keep one academic Google sign-in and a separate Staff Portal entry.

## 6. Do's and Don'ts

### Do:
- **Do** follow the 60/30/10 balance: light neutral surfaces, UTHM navy, then blue and red accents.
- **Do** use verified Google email domains to identify student and lecturer accounts.
- **Do** keep a separate, easy-to-find Staff Portal.
- **Do** provide semantic labels, keyboard access, visible focus, readable contrast, and reduced motion.
- **Do** use flat surfaces and familiar controls before adding visual effects.

### Don't:
- **Don't** create separate student and lecturer login portals for the same Google sign-in flow.
- **Don't** add a separate student or lecturer registration process.
- **Don't** offer password entry or demo credential autofill for student and lecturer access.
- **Don't** add demo credential autofill to the staff portal.
- **Don't** turn red, green, or amber into large decorative surfaces; preserve them for accents and status.
