---
name: Payload Forge
description: A dark operational workbench for shaping traffic and reading every signal.
colors:
  blackened-evergreen: '#07100d'
  deep-workbench: '#0d1915'
  reinforced-workbench: '#12231d'
  circuit-line: '#254039'
  chalk-white: '#edf8f1'
  muted-sage: '#8da69b'
  signal-lime: '#c7f56f'
  live-mint: '#63d6a3'
  alert-coral: '#ff826f'
  control-surface: '#172a22'
  field-surface: '#09130f'
  action-ink: '#111a11'
  caution-amber: '#ffcc8a'
typography:
  display:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: 'clamp(1.9rem, 4.5vw, 3.4rem)'
    fontWeight: 800
    lineHeight: '1.05'
    letterSpacing: '-0.04em'
  headline:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: '1.45rem'
    fontWeight: 700
    lineHeight: '1.15'
    letterSpacing: '-0.025em'
  title:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: '1.1rem'
    fontWeight: 700
    lineHeight: '1.2'
    letterSpacing: '-0.02em'
  body:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: '1.5'
    letterSpacing: 'normal'
  action:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: '0.88rem'
    fontWeight: 700
    lineHeight: 'normal'
    letterSpacing: 'normal'
  label:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: '0.82rem'
    fontWeight: 500
    lineHeight: 'normal'
    letterSpacing: 'normal'
  mono-label:
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: '0.68rem'
    fontWeight: 700
    lineHeight: '1.2'
    letterSpacing: '0.15em'
  mono-code:
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: '0.78rem'
    fontWeight: 400
    lineHeight: '1.55'
    letterSpacing: 'normal'
rounded:
  fine: '2px'
  micro: '4px'
  control: '10px'
  accent: '12px'
  panel: '16px'
  pill: '999px'
  circle: '50%'
spacing:
  tight: '0.4rem'
  compact: '0.7rem'
  standard: '1rem'
  panel: '1.25rem'
  section: '2rem'
  hero: '2.5rem'
components:
  button-primary:
    backgroundColor: '{colors.signal-lime}'
    textColor: '{colors.action-ink}'
    typography: '{typography.action}'
    rounded: '{rounded.control}'
    padding: '0.72rem 1rem'
  button-secondary:
    backgroundColor: '{colors.control-surface}'
    textColor: '{colors.chalk-white}'
    typography: '{typography.action}'
    rounded: '{rounded.control}'
    padding: '0.72rem 1rem'
  input:
    backgroundColor: '{colors.field-surface}'
    textColor: '{colors.chalk-white}'
    typography: '{typography.body}'
    rounded: '{rounded.control}'
    padding: '0.72rem 0.8rem'
---

# Design System: Payload Forge

## Overview

**Creative North Star: "The Signal Forge"**

Payload Forge is a dark operational workbench where traffic is shaped deliberately and every result remains visible. Its atmosphere is precise, instrument-like, safety-conscious, and confident without becoming aggressive. Deep green-black surfaces create concentration while lime and mint behave like active readouts rather than decoration.

The system is compact and information-forward, but major work areas retain enough breathing room to support long-running operational tasks. It rejects noisy gamer dashboards, decorative glassmorphism, and generic neon science-fiction styling; the interface should feel like a dependable engineering instrument, not a theatrical simulation of one.

**Key Characteristics:**

- Green-black tonal depth with restrained ambient lift.
- Lime reserved for decisive actions and running-state emphasis.
- Mint used for live, healthy, and successful signals.
- Compact controls with confident weight and explicit boundaries.
- Monospaced uppercase labels that frame operational sections.

## Colors

The palette behaves like an instrument panel: dark evergreen materials carry the workload while rare bright signals communicate action and state.

### Primary

- **Signal Lime** (`signal-lime`): The decisive action color for primary controls, the brand mark, running states, and the strongest operational emphasis.

### Secondary

- **Live Mint** (`live-mint`): Communicates healthy connectivity, success, live presence, and supporting emphasis without competing with the primary action.

### Tertiary

- **Alert Coral** (`alert-coral`): Marks failures, cancellations, destructive actions, and error-state data.
- **Caution Amber** (`caution-amber`): Reserved for production-target confirmation and other consequential warnings that are not failures.

### Neutral

- **Blackened Evergreen** (`blackened-evergreen`): The page background and deepest canvas.
- **Deep Workbench** (`deep-workbench`): The default dark surface family.
- **Reinforced Workbench** (`reinforced-workbench`): The stronger panel layer and upper end of card gradients.
- **Circuit Line** (`circuit-line`): Borders, dividers, and table rules that reveal structure without dominating it.
- **Chalk White** (`chalk-white`): Primary text and high-value readouts.
- **Muted Sage** (`muted-sage`): Labels, supporting copy, secondary metrics, and inactive information.
- **Control Surface** (`control-surface`): Secondary-button fill.
- **Field Surface** (`field-surface`): Input, select, and text-area fill.
- **Action Ink** (`action-ink`): Dark text used on Signal Lime primary actions.

### Named Rules

**The Signal Rarity Rule.** Signal Lime is reserved for the one decisive action or live emphasis in a region; its scarcity gives it authority.

**The State Has Words Rule.** Status colors must always appear with an explicit label, count, or state name so meaning never depends on color alone.

## Typography

**Display Font:** Geist with system sans-serif fallbacks  
**Body Font:** Geist with system sans-serif fallbacks  
**Label/Mono Font:** JetBrains Mono with UI monospace fallbacks

**Character:** The sans-serif system is direct and highly legible, with compressed tracking on large headings to create authority. Monospaced uppercase labels introduce the instrument-panel voice and distinguish structural metadata from task content.

### Hierarchy

- **Display** (700, fluid `2rem–4rem`, normal line height): Used only for the dashboard's primary proposition; tightly tracked for a compact, confident silhouette.
- **Headline** (700, `1.5rem`, normal line height): Names major work panels and anchors each operational region.
- **Title** (700, `1.17rem`, normal line height): Labels subsections and paired configuration groups.
- **Body** (400, `1rem`, normal line height): Carries controls, values, and explanatory copy.
- **Action** (700, `1rem`, normal line height): Gives buttons and operational controls confident tactile weight.
- **Label** (400, `0.82rem`): Carries field labels, system state, and supporting operational information.
- **Mono Label** (700, `0.72rem`, `0.15em`, uppercase): Frames panel categories such as Workspace, Execution, and Request Attempts.
- **Mono Code** (400, `0.78rem`, `1.55` line height): Displays payloads and captured request or response bodies.

### Named Rules

**The Instrument Label Rule.** Monospaced uppercase type is reserved for section framing and machine-adjacent information, never for paragraphs or primary task labels.

## Layout

The dashboard uses a centered container capped at `1380px` with a twelve-column desktop grid and a consistent `1rem` gutter. The project panel occupies four columns, target setup occupies eight, and execution and payload work span the full grid. Configuration groups use paired columns while dense run controls expand across a purpose-built multi-column row.

Spacing follows a compact operational rhythm: controls and related fields use approximately `0.4rem–0.7rem`, panel internals use `1rem–1.25rem`, and major page regions use `2rem–2.5rem`. At `980px`, primary panels span the full grid, run controls become two columns, run rows stack, and log filters become one column. At `640px`, the hero, paired forms, run controls, and inline forms collapse into single-column flows.

**The Work Before Chrome Rule.** Wide space belongs to forms, metrics, logs, and payloads; branding and system framing remain compact.

## Elevation & Depth

The system is layered with ambient lift. Tonal differences and circuit-line borders establish most hierarchy; a broad, low-opacity shadow lifts only major work panels. The page background's restrained mint radial glow establishes atmosphere without turning individual components into glowing objects.

### Shadow Vocabulary

- **Panel Ambient** (`0 18px 70px rgba(0, 0, 0, 0.18)`): A broad, soft shadow used on major cards only.
- **Live Pulse** (`0 0 0 5px rgba(99, 214, 163, 0.12)`): A compact halo limited to the live-status indicator.

### Named Rules

**The Layer Before Shadow Rule.** Use surface tone and borders to establish structure first; shadows are reserved for major work regions or an explicit live-state signal.

## Shapes

The form language uses gently curved controls (`10px`), slightly rounder accent and feedback surfaces (`12px`), and clearly defined major panels (`16px`). Pills (`999px`) are limited to compact status and limit chips, while circles (`50%`) belong to point-status indicators. Every surface keeps a visible edge; glass-like, borderless floating shapes do not belong in this system.

## Components

Components feel precise and tactile: compact operational dimensions, confident type weight, clear boundaries, and immediate state feedback.

### Buttons

- **Shape:** Gently curved (`10px`) with a visible `1px` boundary and compact `0.72rem 1rem` padding.
- **Primary:** Signal Lime fill with dark evergreen text; reserved for the decisive action in a panel.
- **Secondary:** Dark control surface with Chalk White text and a muted green border.
- **Hover / Focus:** Hover promotes the border to Signal Lime. Keyboard focus must remain visibly distinct and at least as clear as hover.
- **Danger:** Retains the dark surface while shifting border and text toward Alert Coral; destructive meaning remains explicit in the label.
- **Disabled:** Reduces opacity to `0.45` and removes the active cursor while preserving the control's silhouette.

### Chips

- **Style:** Fully rounded, compact, dark-tonal surfaces with small bold labels.
- **State:** Status text uses Signal Lime, Live Mint, or Alert Coral according to meaning; neutral limit chips use Circuit Line and Muted Sage.

### Cards / Containers

- **Corner Style:** Clearly rounded major panels (`16px`).
- **Background:** A restrained diagonal gradient from Reinforced Workbench toward the deeper canvas.
- **Shadow Strategy:** Panel Ambient only; nested regions return to lines and tonal separation.
- **Border:** A `1px` Circuit Line boundary.
- **Internal Padding:** Standard panel padding (`1.25rem`).

### Inputs / Fields

- **Style:** Field Surface fill, Circuit Line border, Chalk White value text, and gently curved corners (`10px`).
- **Labels:** Muted Sage at the compact label scale, placed directly above the control.
- **Focus:** Must promote the field boundary or add a visible outline without relying on glow alone.
- **Disabled:** Preserve legibility while clearly reducing affordance.

### Payload and Log Surfaces

- **Payload preview:** Uses the deepest surface, mint-tinted code text, monospaced typography, `12px` corners, and scroll containment.
- **Log table:** Uses compact text, left-aligned values, Circuit Line row boundaries, and horizontal overflow rather than compressed unreadable columns.
- **Errors:** Use a dark coral-tinted surface with explicit error copy and a defined boundary.

## Do's and Don'ts

### Do:

- **Do** reserve Signal Lime for decisive actions and active operational emphasis.
- **Do** pair every status color with clear text, counts, or state names.
- **Do** keep dense information aligned to stable grids and preserve horizontal scrolling for wide logs.
- **Do** establish hierarchy with tonal layers and borders before adding shadow.
- **Do** use monospaced uppercase labels to frame machine-adjacent sections.

### Don't:

- **Don't** turn the interface into a noisy gamer dashboard or generic neon science-fiction scene.
- **Don't** introduce decorative glassmorphism, borderless floating cards, or glow on every component.
- **Don't** use lime, mint, coral, or amber as interchangeable decoration; each has a defined operational role.
- **Don't** communicate success, failure, production risk, or run state through color alone.
- **Don't** trade log and metric readability for decorative whitespace.
