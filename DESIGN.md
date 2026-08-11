---
name: AviantoSoftware
description: Deep-navy service-record interface for workshop orders and administration.
colors:
  navy: "#12355b"
  navy-2: "#0b294a"
  blue: "#2468a5"
  paper: "#f4f7fa"
  line: "#c9d6e2"
  ink: "#13243b"
  muted: "#607188"
  green: "#137a4d"
  red: "#b42318"
  white: "#fff"
typography:
  body:
    fontFamily: "Aptos, Segoe UI Variable, sans-serif"
    fontSize: "15px"
    lineHeight: 1.45
  display:
    fontSize: "clamp(28px, 3vw, 40px)"
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  title:
    fontSize: "18px"
    letterSpacing: "-0.02em"
  label:
    fontSize: "11px"
    fontWeight: 750
    letterSpacing: "0.03em"
rounded:
  surface: "14px"
  control: "9px"
  field: "8px"
  pill: "999px"
components:
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  button-primary-hover:
    backgroundColor: "{colors.navy-2}"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.navy}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  status:
    backgroundColor: "#eaf1f6"
    textColor: "{colors.navy}"
    rounded: "{rounded.pill}"
    padding: "4px 8px"
---

# Design System: AviantoSoftware

## Overview

**Creative North Star: "The Technical Service Record"**

AviantoSoftware is a calm operational workspace: a cool-paper canvas, fixed deep-navy navigation, and white record surfaces that make workshop data readable at a glance. It treats orders as dossiers—identity, status, notes, line items, totals, and audit history are separated by clear rules rather than decorative treatment.

The system is dense enough for desktop administration but deliberately legible for workshop use: strong labels, labeled actions, generous controls, and high-contrast content. The visual system uses motorcycle/workshop context only through the record-keeping hierarchy; it does not add ornamental mechanical imagery.

**Key Characteristics:**

- Deep-navy shell with cool-paper workspace and white documents.
- Queue-and-dossier topology for active order review.
- Explicit action hierarchy, semantic status colors, and visible keyboard focus.
- Responsive reflow that preserves task access on phone screens.

## Colors

The palette is a restrained document system: navy carries navigation and primary actions, pale blue supports informational selection, green confirms positive states, and red is reserved for risk or deletion.

### Primary

- **Service Navy:** Primary navigation, primary buttons, key totals, links, and selected-record emphasis.
- **Pressed Navy:** The hover state of primary actions.
- **Working Blue:** Informational chart bars, record identifiers, and secondary emphasis.

### Secondary

- **Completion Green:** Positive actions and approved or paid status states.
- **Risk Red:** Destructive actions, cancellation status, and logical deletion.

### Neutral

- **Cool Paper:** Application canvas.
- **White Document:** Panels, controls, tables, modal surfaces, and mobile navigation.
- **Technical Ink:** Main content text.
- **Record Muted:** Supporting descriptions and metadata.
- **Drafting Line:** Table rules, field borders, and section dividers.

**The Semantic Accent Rule.** Green communicates a positive result; red communicates destructive or risk states. Do not use either as general decoration.

## Typography

**Body Font:** Aptos with Segoe UI Variable fallback.

**Character:** System sans-serif typography keeps administrative data compact and highly legible. Heavier weights establish actions and identifiers; letter-spacing tightens display headings and opens table labels.

### Hierarchy

- **Display:** Responsive page heading for the primary task on a screen.
- **Title:** Panel, form-section, and summary headings.
- **Body:** Default interface reading text.
- **Label:** Uppercase table headers and dossier metadata; 12px status labels are pill-specific.

**The Action Weight Rule.** Primary actions and record identifiers use the heaviest available treatment; supporting descriptions stay muted rather than competing through weight.

## Layout

The desktop application is a fixed left rail and a fluid main workspace. The rail is 245px; the main region offsets by that width. Pages center within a 1600px maximum and use 42px vertical padding with a responsive horizontal inset of `max(34px, 4vw)`.

Dashboard metrics use four equal columns. Queue-and-dossier, detail, and form layouts are two-column grids with an 18px gap; the primary work area is wider and the dossier or summary column is constrained to a practical reading width. White panels use 23px inner padding. Tables remain data-dense and scroll horizontally on narrow screens rather than compressing their columns below readability.

At 1000px and below, metrics become two columns, multi-column content reflows to one column, the summary stops being sticky, and the sidebar collapses to a 76px icon rail. At 680px and below, the sidebar is replaced by a 63px sticky mobile header, five-item bottom navigation, and a drawer for the full menu. Main content has 22px by 15px padding, the base type size becomes 16px, metrics scroll horizontally as 170px cards, filters stack, and two-column forms become one column. The dashboard hides the dossier preview on phone while retaining the queue; the selected record is opened through the existing order flow.

## Elevation & Depth

Depth is structural and restrained: document panels, metrics, forms, summaries, and suggestions share a soft navy-tinted shadow. Tables use clipping, headers, and rules rather than elevation. Modal overlays add a dark translucent backdrop and a stronger neutral shadow.

### Shadow Vocabulary

- **Document lift:** `0 12px 28px rgba(18, 53, 91, 0.09)` for panels, metrics, form sections, summaries, and suggestions.
- **Modal lift:** `0 20px 65px rgba(0, 0, 0, 0.3)` for confirmation dialogs.

**The Paper Stack Rule.** Elevation identifies a contained record surface or overlay; do not use shadows to decorate ordinary rows or text.

## Shapes

The system uses softly rounded technical documents: primary surfaces use the surface radius, buttons and navigation items use the control radius, fields use the tighter field radius, and statuses are fully pill-shaped. Mobile panels reduce to an 11px radius. Borders are thin and cool gray; photo capture is the only deliberately dashed field treatment.

## Components

### Buttons

- **Character:** Compact, labeled, and decisive; icons support labels rather than replacing them on desktop.
- **Primary:** Navy fill, white text, control radius, and 10px by 14px padding. Hover switches to pressed navy. Large primary actions span their available width with 13px padding.
- **Secondary:** White background with a cool-gray outline and navy text; hover uses a pale blue-gray fill.
- **Danger:** Solid red is for destructive confirmation; the outlined red treatment is used for logical deletion.
- **Focus:** Keyboard focus uses a 3px high-contrast outline offset by 2px on buttons, inputs, selects, and textareas; shell controls use a white outline on navy surfaces.
- **Tertiary:** Transparent background with navy text; use for low-emphasis actions such as clearing filters or retrying a non-destructive read.
- **Icon action:** Icon-only actions are limited to dense tables and must provide an accessible label, a 36px minimum target, and the shared hover/focus treatment.

### Cards / Containers

- **Style:** White document surfaces with the shared surface radius and document lift.
- **Internal rhythm:** Standard panels, summaries, and form sections use 23px padding; mobile versions use 17px.
- **Data panels:** Table containers omit inner padding and clip their contents; filter bars and pagination carry their own padding and divider lines.

### Inputs / Fields

- **Style:** White fill, 1px cool-gray border, field radius, and 10px padding.
- **Search:** Icon-leading control with a compact clear action.
- **Focus:** The shared high-contrast focus outline remains visible; native field borders are otherwise quiet.
- **States:** Fields share the same border, hover, focus, disabled, and error tokens. `SelectField` is the visual select standard; native selects are not used as a second visual language.

### Filters

- **Bar:** Search, select, date range, sort, and export controls live in a single filter bar with a white surface and shared 40px control height.
- **Order:** Search leads, narrowing controls follow, and export remains secondary. A clear-filters action is tertiary.
- **Mobile:** Keep search visible, collapse secondary controls behind `Filtros`, show the active-filter count, and stack controls without shrinking touch targets.
- **Relevant data:** Fichas use ficha state, payment state, date range, and sort; profiles use domain, motorcycle, client, state, and last modification; repuestos and transfers use their state/date/sort combinations; services use date and sort; audit uses user/module/action/date.

### Dialogs, Confirmations, and Toasts

- **Dialog:** Use for auxiliary forms and protected workflows such as service registration, configuration, transfers, intake, ABM forms, and partial payments.
- **Confirmation:** Use `ConfirmModal` for logical deletion, cancellation, delivery approval, completing a sale, reversing a state, and changing payment state. The body must describe the concrete business consequence.
- **Toast:** Every successful mutation announces the exact result after the API resolves. Validation and operation errors use the shared toast system; duplicate global/local API errors are suppressed.
- **Copy:** Avoid generic messages such as “acción realizada”. Use concrete copy such as “Ficha cancelada”, “Venta completada”, or “Pago marcado como pagado”.
- **Inline errors:** Loading, empty, retry, and persistent read-only notices use their own semantic patterns rather than impersonating a login state.

### Navigation

- **Desktop:** Fixed navy rail with brand mark, icon-plus-label destinations, and a bottom-aligned new-order action. Active and hover items use a lighter navy row with white text.
- **Tablet:** The rail keeps icons but hides its labels and supporting content.
- **Mobile:** Sticky navy header, fixed white bottom bar for the first five destinations, and a left-side drawer for every destination plus the primary new-order action.
- **Transfer entry:** Transferencias lives inside Operaciones and remains visible to both roles. Its mutation action is rendered only for Administración; read access never disappears because history is operational context.

### Transfer Register

- **List:** The transfer register uses the existing table-panel language: a search field, date boundaries, explicit order toggle, Excel export, and a ruled table with patente, effective date, previous client, new client, and notes.
- **Mutation:** A protected wide dialog is justified because titularity is a sensitive, irreversible business action. It follows three labeled steps—select motorcycle, select new client, define effective date—and ends with a visible anterior-to-new summary before confirmation.
- **Record truth:** Transfer dates are effective dates, not creation timestamps. Historical work orders keep their original client, while the motorcycle's Clientes tab shows the current owner and the transfer event history.
- **States:** The flow includes empty search results, loading feedback, invalid ownership, inactive clients, same-client selection, future dates, API errors, disabled submission and success toast.
- **Responsive behavior:** The register keeps the existing card-like mobile table conversion. The transfer dialog stacks fields, keeps the current-owner summary visible and makes the final action full width below 680px.

### Status Badges

- **Style:** Compact pill with a pale informational base.
- **States:** Approved and paid use the pale-green/green pair; canceled uses the pale-red/red pair; status text must stay on one line.

### Queue and Dossier

- **Style:** Recent orders form a ruled queue with customer and motorcycle metadata, status badge, and total. Selection uses a pale-blue row plus a 3px inset navy rail.
- **Dossier:** The adjacent preview repeats selected order identity, reason, review lines, total, and a primary opening action. It is intentionally removed on mobile to keep the queue actionable.

## Do's and Don'ts

### Do:

- **Do** preserve the deep-navy rail, cool-paper canvas, and white record-surface relationship.
- **Do** make important actions explicit with labels and pair icons with text where space permits.
- **Do** keep record data structured with headings, metadata labels, dividers, status pills, and aligned totals.
- **Do** preserve the 1000px and 680px responsive transitions when adding operational screens.
- **Do** retain the visible 3px keyboard focus treatment.

### Don't:

- **Don't** introduce decorative workshop or motorcycle imagery as a substitute for information hierarchy.
- **Don't** use green or red for non-semantic emphasis.
- **Don't** shrink mobile tables to fit; retain their minimum width and allow their panel to scroll horizontally.
- **Don't** hide a primary workflow behind an icon alone on desktop-sized layouts.
- **Don't** add floating visual effects or heavy shadows outside contained records and modals.
