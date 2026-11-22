---
version: alpha
name: Lentera
description: Visual rules for the Lentera dashboard, a data-dense workspace for advisors, coordinators, and academic leaders.
colors:
  ink: "#16203A"
  ink-muted: "#5A6378"
  primary: "#1E2A5A"
  primary-hover: "#2C3B78"
  on-primary: "#FFFFFF"
  accent: "#F2A93B"
  on-accent: "#16203A"
  background: "#F6F5F1"
  surface: "#FFFFFF"
  surface-muted: "#EEEDE7"
  border: "#DDDBD3"
  focus: "#3B5BDB"
  risk-low: "#E2A27A"
  risk-watch: "#CF7448"
  risk-high: "#B04A26"
  risk-critical: "#7A2610"
  on-risk-light: "#16203A"
  on-risk-dark: "#FFFFFF"
  uncertain: "#7A7F8C"
  chart-at-risk: "#A93A1C"
  chart-not-at-risk: "#2F6DB5"
  chart-neutral: "#9AA1AE"
  success: "#2F7D5B"
  danger: "#B42318"
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 2rem
    fontWeight: 700
    lineHeight: 1.2
  h1:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.3
  h2:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.125rem
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.75rem
    fontWeight: 600
    lineHeight: 1.4
  metric:
    fontFamily: JetBrains Mono
    fontSize: 1.75rem
    fontWeight: 600
    lineHeight: 1.1
  data:
    fontFamily: JetBrains Mono
    fontSize: 0.8125rem
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: 10px 16px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.border}"
    rounded: "{rounded.md}"
    padding: 10px 16px
  card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  kpi-card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
    valueTypography: "{typography.metric}"
  tier-badge-low:
    backgroundColor: "{colors.risk-low}"
    textColor: "{colors.on-risk-light}"
    rounded: "{rounded.full}"
  tier-badge-watch:
    backgroundColor: "{colors.risk-watch}"
    textColor: "{colors.on-risk-light}"
    rounded: "{rounded.full}"
  tier-badge-high:
    backgroundColor: "{colors.risk-high}"
    textColor: "{colors.on-risk-dark}"
    rounded: "{rounded.full}"
  tier-badge-critical:
    backgroundColor: "{colors.risk-critical}"
    textColor: "{colors.on-risk-dark}"
    rounded: "{rounded.full}"
  archetype-chip:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: 2px 8px
  sidebar:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    width: 240px
  sidebar-item-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.md}"
  scenario-panel:
    backgroundColor: "{colors.surface-muted}"
    borderColor: "{colors.uncertain}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
---

## Overview

Lentera is a working tool used during the week 4 intervention window. Screens are dense but calm: warm off-white background, white cards, navy for structure and actions, and amber as the one highlight color (the lantern). Color carries risk, so decoration stays neutral. The layout follows the advisor's path from cohort to plan to student: a fixed navy sidebar on the left and the page content on the right.

All token values are proposals awaiting the owner's confirmation.

## Colors

- `{colors.primary}` for the sidebar, primary buttons, and links. `{colors.primary-hover}` for their hover state.
- `{colors.accent}` (`brand-accent` in code, because shadcn/ui uses `accent` for hover surfaces) for the active sidebar item, the current step in a flow, and the single most important number on a page. Never for risk.
- `{colors.background}` for the page, `{colors.surface}` for cards and tables, `{colors.surface-muted}` for table headers, chips, and scenario panels.
- `{colors.ink}` for body text, `{colors.ink-muted}` for secondary text and axis labels, `{colors.border}` for card and table borders.
- The four risk tiers use the sequential scale `{colors.risk-low}`, `{colors.risk-watch}`, `{colors.risk-high}`, `{colors.risk-critical}`. The scale is one orange-red hue from light to dark (hue spread 18 degrees), so lightness alone separates the tiers for color-blind users; it passes the dataviz ordinal checks (monotone lightness, visible steps, Low at 2.17:1 against white). Low and Watch badges use `{colors.on-risk-light}` text (7.4:1 and 4.8:1); High and Critical use `{colors.on-risk-dark}` (5.5:1 and 9.9:1). Tier badges always show the tier name as text as well.
- `{colors.uncertain}` marks predictions in the uncertain band (probability 0.25 to 0.55) as a dashed outline or a hatched bar segment.
- Charts that compare outcomes use `{colors.chart-at-risk}` and `{colors.chart-not-at-risk}` (the pair passes the dataviz categorical checks: CVD separation 22.9, contrast above 3:1). Other series use `{colors.chart-neutral}`.
- `{colors.success}` and `{colors.danger}` are for form and system states only (saved, failed). They never encode student risk.

## Typography

Plus Jakarta Sans is the interface font for all text. JetBrains Mono with tabular figures is for numbers that users compare: KPI values (`metric`), probabilities, counts, IDs, and table cells with numbers (`data`). Probabilities show two decimals (0.87) in tables and as percentages with no decimals (87%) in sentences. Interface text is Indonesian.

## Layout

The app shell has a 240 px sidebar and a content area with `{spacing.xl}` padding. Content uses a 12-column grid with `{spacing.lg}` gutters. A page starts with its title and one line stating the cohort and cutoff ("Kohort M01-M07, cutoff hari ke-28"), then a KPI row, then the main panels. The target width range is 1280 px and wider. Tables use `{spacing.sm}` vertical cell padding.

Page order in the sidebar: Dashboard, Rencana Intervensi (capacity planner), Daftar Prioritas (worklist), Insight Course, Unggah Kohort, Model & Monitoring. The student profile opens from the worklist and is not in the sidebar.

## Elevation & Depth

Cards and tables are flat with a 1 px `{colors.border}` outline. Dialogs, dropdowns, and the toast use one shadow: `0 8px 24px rgba(22, 32, 58, 0.12)`.

## Shapes

`{rounded.lg}` for cards, `{rounded.md}` for buttons, inputs, and panels, `{rounded.sm}` for chips, `{rounded.full}` for tier badges and status dots.

## Components

- `kpi-card` shows one number in `metric` type with a `label` above it and an optional one-line note below in `{colors.ink-muted}`.
- `tier-badge-*` is the only way to show a tier. Use the variant that matches the tier.
- `archetype-chip` shows the archetype name with a small icon. Archetypes do not get their own colors.
- `scenario-panel` holds every model scenario: what-if results, counterfactuals, and planner results computed with assumed effectiveness. It always carries the label "Skenario model, bukan efek kausal".
- `sidebar` and `sidebar-item-active` form the navigation. The active item uses the accent background.
- `button-primary` appears at most once per panel. Other actions use `button-secondary`.
- Reason codes in the student profile are two lists: "Sinyal yang bisa ditindaklanjuti" and "Konteks". Each item is a sentence with a small horizontal bar for the SHAP contribution, colored `{colors.chart-at-risk}` when it raises risk and `{colors.chart-not-at-risk}` when it lowers risk.

## Do's and Don'ts

- **Do** reference tokens such as `{colors.primary}` in code through CSS variables, so each value has one source.
- **Do** show the tier name next to any risk color.
- **Do** label every scenario output with the scenario panel.
- **Don't** use red or green for anything other than the risk scale and system states.
- **Don't** add colors outside the palette. Add a token here first.
- **Don't** use the accent color for risk or for more than one highlight per panel.
