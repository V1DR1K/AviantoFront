---
name: Avianto
description: Sistema operativo de taller con identidad AVIANTO y el descriptor Mecánica integral de motos.
colors:
  brand-blue: "#30348B"
  brand-red: "#E52528"
  brand-black: "#000000"
  brand-white: "#FFFFFF"
  canvas: "#F6F6FA"
  surface: "#FFFFFF"
  text: "#171728"
  text-muted: "#5F6077"
  border: "#D5D7E7"
  success: "#137A4D"
typography:
  display:
    fontFamily: "Arboria, Segoe UI Variable, sans-serif"
    fontSize: "clamp(2rem, 3.4vw, 3.25rem)"
    fontWeight: 700
    lineHeight: 1.08
  body:
    fontFamily: "Arboria, Segoe UI Variable, Segoe UI, sans-serif"
    fontSize: "15px"
    lineHeight: 1.5
  label:
    fontFamily: "Arboria, Segoe UI Variable, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.04em"
rounded:
  surface: "14px"
  control: "9px"
  field: "8px"
  pill: "999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.brand-blue}"
    textColor: "{colors.brand-white}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  button-primary-hover:
    backgroundColor: "#25286F"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.brand-blue}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  status:
    backgroundColor: "#EEF0FF"
    textColor: "#25286F"
    rounded: "{rounded.pill}"
    padding: "4px 8px"
---

# Design System: Avianto

## Overview

**Creative North Star: “The Technical Service Record”.**

Avianto is a clear, confident operational workspace for motorcycle workshops. The approved identity combines the deep blue and red of the Avianto Motos manual with white document surfaces, strong labels and a readable record hierarchy. Brand expression comes from precise typography, the official logo and disciplined color use rather than decorative motorcycle imagery.

The public landing and authenticated console share the same visual language. The landing explains the workflow; the console helps the operative capture information quickly and administration refine it safely. The interface remains mobile-first for the workshop floor and dense enough for desktop review.

**Key Characteristics:**

- Official AVIANTO lockup and isotipo with approved color and white variants.
- Brand blue for navigation, primary actions and selected-record emphasis.
- Brand red for identity accents, priority actions and risk states.
- White record surfaces on a soft neutral canvas.
- Arboria font hook with an accessible system fallback.

## Colors

The palette is intentionally limited: blue establishes the operational world, red provides identity and urgency, and black/white preserve the logo’s contrast. Supporting neutrals and semantic colors exist to protect readability and state meaning.

### Primary

- **Avianto Blue** (`#30348B`): navigation, primary actions, selected tabs, key record emphasis and branded surfaces.
- **Avianto Red** (`#E52528`): brand accents, priority callouts and destructive/risk states when the meaning is explicit.

### Neutral

- **Brand Black** (`#000000`): logo wordmark and strongest text where needed.
- **Brand White** (`#FFFFFF`): logo contrast, document surfaces and inverse controls.
- **Canvas** (`#F6F6FA`): application background.
- **Technical Ink** (`#171728`): primary interface text.
- **Record Muted** (`#5F6077`): supporting copy and metadata.
- **Drafting Line** (`#D5D7E7`): borders, table rules and dividers.

### Named Rules

**The Two-Color Identity Rule.** Blue and red carry brand recognition; semantic green, amber and violet are reserved for operational states and never become decoration.

## Typography

**Display Font:** Arboria, with Segoe UI Variable and Segoe UI fallback.

**Body Font:** Arboria, with Segoe UI Variable and Segoe UI fallback.

**Character:** Geometric, open and highly legible. Headings use confident weight and compact line-height; operational data favors clear labels and comfortable touch-sized controls.

### Hierarchy

- **Display:** bold responsive heading for the primary task on a screen.
- **Title:** 18–24px semibold heading for panels and record sections.
- **Body:** 15px with 1.5 line-height for ordinary interface copy.
- **Label:** 12px bold with restrained tracking for metadata, filters and table headings.

### Named Rules

**The Read-First Rule.** Every important action and status is named in text; icons support the label but do not replace it on desktop layouts.

## Layout

Desktop uses a fixed blue navigation rail and a fluid document workspace. Pages remain centered at a practical reading width, with two-column dossier layouts where a summary is useful. Tables preserve their minimum readable width and scroll horizontally instead of collapsing data into unreadable columns.

At tablet widths the rail collapses to icons while every navigation destination remains available; multi-column work reflows. At mobile widths the shell becomes a sticky header plus bottom navigation, filters stack, dashboard metrics use a responsive grid, and critical actions remain full-width with generous touch targets.

## Elevation & Depth

Depth is structural and restrained. White record surfaces use a soft blue-tinted lift; tables rely on rules and grouping; dialogs use a stronger neutral shadow and backdrop. Decorative floating effects are not part of the system.

### Shadow Vocabulary

- **Document lift** (`0 12px 28px rgb(48 52 139 / 0.12)`): panels, metrics, summaries and forms.
- **Modal lift** (`0 20px 65px rgb(0 0 0 / 0.3)`): protected dialogs and confirmations.

## Shapes

Surfaces use softly rounded technical documents (14px), controls use a compact 9px radius, fields use 8px and status badges use a full pill. Borders are thin and cool; focus uses a visible 3px high-contrast ring.

## Components

### Buttons

- **Primary:** Avianto Blue with white text, labeled action, 9px radius and 10px × 14px padding.
- **Secondary:** white document surface with border and blue text.
- **Danger:** red only when the action is destructive or materially risky.
- **Focus:** visible 3px outline with 2px offset.

### Cards / Containers

- White document surfaces, 14px radius, thin border and document lift.
- Standard inner padding is 23px on desktop and reduced on mobile.

### Inputs / Fields

- White fill, cool border, 8px radius and comfortable padding.
- `SelectField` is the single visual select standard; keyboard navigation, escape, focus return and listbox semantics are required.

### Dialogs, Confirmations and Toasts

- Dialogs interrupt only auxiliary or protected workflows.
- Confirmations describe the concrete business consequence.
- Toasts announce the resolved operation with specific copy.

### Navigation

- Desktop: blue rail with white logo, icon-plus-label destinations and a clear primary intake action.
- Mobile: white header with lockup, blue bottom navigation and a drawer for the full menu.

### Brand assets

- `BrandLogo` supports lockup/isotipo, color/white variants and responsive sizes.
- The official area of security is preserved by transparent asset padding; no logo distortion, recoloring or unapproved effects are allowed.
- Official SVG artwork from the Illustrator system lives in `public/brand/avianto-svg/`:
- `avianto-lockup.png` and `avianto-isotipo.png`: tightly cropped color lockup and mark used by `BrandLogo`, avoiding the generous Illustrator SVG canvas around the artwork.
- `avianto-lockup-white.png` and `avianto-isotipo-white.png`: supplied inverse raster variants for blue navigation surfaces.
- `isologotipo.svg` and `isotipo.svg`: original editable vector masters; use them where their full viewBox composition is intentional, not as tightly sized inline logos.
  - `fondo-inicio.svg`: login card texture and composition.
  - `moto-fondo.svg`: subtle motorcycle watermark for detail and service surfaces.
  - `trama-1.svg` / `trama-2.svg`: operational and secondary surface patterns.
  - `nav-more.svg`, `nav-home.svg`, `nav-profiles.svg`, `nav-orders.svg` and `nav-pedidos.svg`: official mobile navigation artwork.
- Asset URLs are exposed as tokens in `app/design-tokens.css`; components consume them through CSS instead of duplicating paths.
- The official bottom-navigation artwork is rendered as a CSS mask so its silhouette stays intact while its foreground follows the accessible white/red navigation states. Its embedded text is hidden from visual duplication and the DOM keeps an accessible label.
- The SVG package does not include a white lockup or white isotipo; the supplied white PNG variants are used on inverse navigation surfaces.
- Dashboard surfaces remain plain white by design; background patterns are limited to the login composition and secondary/empty-state or detail surfaces where they do not compete with operational data.

## Do's and Don'ts

### Do:

- **Do** use the official blue/red identity and the approved logo assets.
- **Do** keep text labels, focus states and touch targets visible.
- **Do** preserve the distinction between capture on mobile and review on desktop.
- **Do** use workshop resources subtly and only when they support the product story.

### Don't:

- **Don't** reintroduce the old navy/teal palette as a parallel visual language.
- **Don't** use the logo as a text substitute or redraw its proportions.
- **Don't** use red or green as generic decoration.
- **Don't** hide primary actions behind icon-only controls on desktop.
