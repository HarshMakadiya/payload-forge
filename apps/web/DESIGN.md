---
name: Payload Forge
description: Dark operational workspace for deliberate API load testing.
colors:
  background: '#0A0E0C'
  foreground: '#EDEFEA'
  surface: '#101512'
  secondary: '#161D19'
  accent: '#1A221E'
  border: '#1E2521'
  border-subtle: '#27332C'
  primary: '#B8E85C'
  primary-hover: '#A3D944'
  muted-foreground: '#8A9289'
  destructive: '#F0665A'
  success: '#4DD4C7'
  warning: '#F2B84B'
  cancelled: '#6B7268'
typography:
  display:
    fontFamily: 'Geist, Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    fontSize: '1.5rem'
    fontWeight: 700
    lineHeight: '1.2'
    letterSpacing: '-0.025em'
  headline:
    fontFamily: 'Geist, Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    fontSize: '1.25rem'
    fontWeight: 700
    lineHeight: '1.25'
    letterSpacing: '-0.025em'
  title:
    fontFamily: 'Geist, Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    fontSize: '1.125rem'
    fontWeight: 600
    lineHeight: '1.3'
    letterSpacing: '-0.025em'
  body:
    fontFamily: 'Geist, Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: '1.5'
    letterSpacing: 'normal'
  label:
    fontFamily: 'Geist, Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 600
    lineHeight: '1.2'
    letterSpacing: '0.05em'
  mono:
    fontFamily: 'JetBrains Mono, Menlo, monospace'
    fontSize: '0.75rem'
    fontWeight: 500
    lineHeight: '1.5'
    letterSpacing: 'normal'
rounded:
  sm: '6px'
  md: '8px'
  lg: '12px'
  pill: '9999px'
spacing:
  compact: '0.5rem'
  standard: '0.75rem'
  panel: '1.25rem'
  section: '1.5rem'
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.background}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: '0.5rem 1rem'
    height: '2.25rem'
  button-secondary:
    backgroundColor: '{colors.secondary}'
    textColor: '{colors.foreground}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: '0.5rem 1rem'
    height: '2.25rem'
  input:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.foreground}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: '0.25rem 0.75rem'
    height: '2.25rem'
  card:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.foreground}'
    rounded: '{rounded.lg}'
    padding: '1.5rem'
---

# Design System: Payload Forge

## Overview

**Creative North Star: "The Signal Forge"**

Payload Forge is a dark, compact operations workspace for configuring traffic and reading runtime signal. Green-black surfaces minimize ambient noise; lime carries decisive action, while mint, amber, coral, and gray state colors make outcomes legible.

The interface is deliberately practical: structured panels, dense controls, monospaced machine-adjacent values, and restrained motion. It should feel like a dependable engineering instrument, not a sci-fi dashboard.

**Key Characteristics:**

- Deep evergreen canvas with layered dark surfaces.
- Signal Lime reserved for primary action and live emphasis.
- Stable borders and tonal contrast establish structure before shadow.
- Dense controls stay readable through a consistent spacing rhythm.

## Colors

Operational color has a fixed job. State always appears with text, counts, or labels.

### Primary

- **Signal Lime** (`#B8E85C`): Primary actions, selected controls, live indicators, and focused values.

### Secondary

- **Live Mint** (`#4DD4C7`): Healthy or successful status.

### Tertiary

- **Alert Coral** (`#F0665A`): Errors, failed work, and destructive actions.
- **Caution Amber** (`#F2B84B`): Consequential warnings and acknowledgements.

### Neutral

- **Blackened Canvas** (`#0A0E0C`): Page background.
- **Workbench Surface** (`#101512`): Cards, fields, and main containers.
- **Control Surface** (`#161D19`): Secondary controls and inactive state.
- **Raised Accent** (`#1A221E`): Small local emphasis.
- **Circuit Border** (`#1E2521`): Boundaries and dividers.
- **Chalk Text** (`#EDEFEA`): Primary text.
- **Muted Sage** (`#8A9289`): Supporting labels and secondary information.

**The Signal Rarity Rule.** Use Signal Lime for one decisive action or active readout in a region; never as general decoration.

## Typography

**Display Font:** Geist, Inter, system sans-serif fallback.

**Body Font:** Geist, Inter, system sans-serif fallback.

**Label/Mono Font:** JetBrains Mono, Menlo, monospace fallback for paths, methods, payloads, and metrics.

**Character:** Geist carries direct, compact UI copy. JetBrains Mono distinguishes machine values without turning ordinary prose into a terminal.

### Hierarchy

- **Display** (700, `1.5rem`, `1.2`): Page proposition and major operational heading.
- **Headline** (700, `1.25rem`, `1.25`): Panel-level headings.
- **Title** (600, `1.125rem`, `1.3`): Subsections and card titles.
- **Body** (400, `0.875rem`, `1.5`): Controls, descriptions, and messages.
- **Label** (600, `0.75rem`, `0.05em` tracking): Compact metadata and structural labels.
- **Mono** (500, `0.75rem`, `1.5`): Methods, paths, IDs, payloads, and measured data.

**The Instrument Label Rule.** Use mono only when content is code, data, or a machine-adjacent value.

## Layout

Dashboard is centered at maximum width `1440px`, with `1rem` side padding on small screens, `1.5rem` on larger screens, and `2rem` at large widths. Major regions stack with `1.5rem` gaps. Forms begin as one column, become two columns at `md`, and use purpose-built multi-column grids only when configuration density needs them.

Major cards use `1.5rem` internal padding. Nested control groups use `1rem–1.25rem`; controls inside a group use `0.5rem–0.75rem` gaps. Long logs and payloads scroll rather than compress contents.

## Elevation & Depth

Tonal layering and `1px` Circuit Border edges establish most depth. Cards and controls use a small neutral shadow; dialogs and tooltips use a stronger soft shadow. Shadows never substitute for a missing boundary.

### Shadow Vocabulary

- **Control lift** (`0 1px 2px rgba(0, 0, 0, 0.05)`): Buttons, inputs, and cards.
- **Overlay lift** (`0 10px 25px -5px rgba(0, 0, 0, 0.5)`): Tooltips and focused overlays.

**The Layer Before Shadow Rule.** Establish hierarchy with tone and border first; reserve stronger shadow for overlays.

## Shapes

Controls use `6px–8px` corners. Cards and dialogs use `12px`. Pills belong to status indicators, scrollbars, and progress elements only. Every persistent surface keeps a visible border.

## Components

### Buttons

- **Shape:** `8px` corners; default height `36px`, compact height `32px`.
- **Primary:** Signal Lime with Blackened Canvas text; hover darkens to `#A3D944`.
- **Secondary:** Control Surface with Chalk Text and Circuit Border.
- **Outline / Ghost:** Dark or transparent base with secondary surface on hover.
- **Focus / Disabled:** Lime focus ring; disabled state keeps shape but reduces opacity to `0.5`.

### Cards / Containers

- **Corner Style:** `12px` major cards; `8px` nested groups.
- **Background:** Workbench Surface.
- **Border:** `1px` Circuit Border.
- **Internal Padding:** `1.5rem` for cards, `1rem–1.25rem` for nested groups.

### Inputs / Fields

- **Style:** Workbench Surface fill, Circuit Border, `8px` corners, `36px` height.
- **Focus:** Signal Lime `1px` ring and border.
- **Error / Disabled:** Coral-tinted error blocks; disabled fields retain structure at reduced opacity.

### Status and Feedback

- **Success:** Live Mint icon and tint with explicit success copy.
- **Warning:** Caution Amber icon, label, and acknowledgement.
- **Error:** Alert Coral icon and tint; messages name problem and recovery.
- **Live indicator:** `8px` Signal Lime dot with restrained `1.5s` ping animation.

### Payload and Log Surfaces

- **Style:** JetBrains Mono at compact sizes on Workbench Surface, contained by Circuit Border.
- **Overflow:** Vertical or horizontal scrolling preserves source readability.
- **Methods:** Monospace, bold, and Signal Lime when placed next to endpoint path.

## Do's and Don'ts

### Do:

- **Do** reserve Signal Lime for decisive actions, selection, and active state.
- **Do** name status in text as well as color.
- **Do** use mono for payloads, methods, paths, IDs, and measured operational values.
- **Do** preserve `1px` borders around long-lived panels and controls.
- **Do** keep high-density forms in stable, responsive grids.

### Don't:

- **Don't** use lime, mint, coral, or amber as interchangeable decoration.
- **Don't** use monospace for ordinary prose.
- **Don't** hide errors, warnings, or live state in color alone.
- **Don't** replace readable log overflow with tiny, compressed columns.
- **Don't** add glass effects, glowing cards, or decorative gradients.
