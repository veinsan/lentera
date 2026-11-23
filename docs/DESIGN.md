---
name: Lentera
description: Week 4 at-risk student sky, read through a glass lens over a blue star atlas.
colors:
  blue: "#2457f5"
  blue-hover: "#1c48d8"
  blue-press: "#173cb8"
  blue-soft: "#e7eeff"
  blue-ink: "#1a3fb8"
  starlight: "#8fb0ff"
  queue-track: "#dbe4f3"
  ink: "#0b1b3a"
  ink-2: "#3e4d72"
  ink-3: "#5b6a8e"
  paper: "#f3f7fd"
  surface: "#ffffff"
  surface-secondary: "#f5f8fd"
  surface-tertiary: "#edf2fa"
  line: "#dce5f3"
  line-strong: "#c5d2e8"
  separator: "#e6ecf6"
  night: "#081634"
  night-2: "#0d1f4a"
  night-3: "#15295c"
  night-ink: "#eaf1ff"
  night-muted: "#a9b8d9"
  tier-low: "#6b8fd8"
  tier-watch: "#f0a35a"
  tier-high: "#de6a2e"
  tier-critical: "#b0381f"
  star-low: "#86a4ea"
  star-watch: "#fac96c"
  star-high: "#ef7834"
  star-critical: "#c62e29"
  uncertain: "#8a96b3"
  chart-risk: "#c4402a"
  chart-safe: "#2457f5"
  chart-neutral: "#9aa6c0"
  success: "#13795b"
  warning: "#b7790a"
typography:
  display:
    fontFamily: "Google Sans Flex, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3.9rem"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.032em"
    fontVariation: "\"wdth\" 108, \"ROND\" 40"
  headline:
    fontFamily: "Google Sans Flex, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.6rem"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.032em"
    fontVariation: "\"wdth\" 108, \"ROND\" 40"
  numeral:
    fontFamily: "Google Sans Flex, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.9rem"
    fontWeight: 650
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "\"tnum\""
    fontVariation: "\"wdth\" 100, \"ROND\" 20"
  title:
    fontFamily: "Google Sans Flex, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Google Sans Flex, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Google Sans Flex, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
  mono:
    fontFamily: "Google Sans Code, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 500
    fontFeature: "\"tnum\""
rounded:
  control: "10px"
  field: "12px"
  tooltip: "12px"
  nav-item: "16px"
  plate: "20px"
  role-card: "22px"
  bar: "22px"
  night-plate: "24px"
  rail: "28px"
  sheet-edge: "36px"
  pill: "9999px"
spacing:
  plate-pad: "24px"
  plate-pad-sm: "20px"
  grid-gap: "20px"
  cell-x: "16px"
  shell-max: "1360px"
  rail-width: "264px"
components:
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
  button-primary-hover:
    backgroundColor: "{colors.blue-hover}"
  button-primary-active:
    backgroundColor: "{colors.blue-press}"
  button-on-night:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.night}"
    rounded: "{rounded.pill}"
    height: "48px"
    padding: "0 24px"
  plate:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.plate}"
    padding: "{spacing.plate-pad}"
  night-plate:
    backgroundColor: "{colors.night}"
    textColor: "{colors.night-ink}"
    rounded: "{rounded.night-plate}"
  role-card-night:
    backgroundColor: "{colors.night-2}"
    textColor: "{colors.night-ink}"
    rounded: "{rounded.role-card}"
    padding: "20px"
  role-card-night-hover:
    backgroundColor: "{colors.night-3}"
  chip-archetype:
    backgroundColor: "{colors.blue-soft}"
    textColor: "{colors.blue-ink}"
    rounded: "{rounded.pill}"
    height: "28px"
    padding: "0 10px"
  flag-stopped:
    backgroundColor: "{colors.blue-soft}"
    textColor: "{colors.blue-ink}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
  nav-item:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.nav-item}"
    height: "40px"
    padding: "0 12px"
  nav-item-active:
    textColor: "{colors.ink}"
    rounded: "{rounded.nav-item}"
  tooltip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tooltip}"
    padding: "8px 12px"
---

# Design System: Lentera

## Overview

**Creative North Star: "The Star Atlas Lens"**

The week 4 cohort is a sky. Every student is a star whose size and warmth is their risk, archetypes are constellations, and Lentera is the lens the cohort is read through. Working screens are the day edition: pale atlas paper under a generated blue chart plate, solid white content plates, navy ink. The night edition (the landing hero, the X-Ray panel, the sign-in role cards) is a deep navy plate where the cohort appears as stars. Glass instruments float over both, and they are only ever navigation.

The system is calm, cool, and dense enough for an advisor's working session, legible enough for a projector. One committed blue carries every action, selection, and focus. Warm hues exist to say "risk" and nothing else, so a glance at any screen finds the students who need a call first. Interface copy is Indonesian; numbers are formatted id-ID with a decimal comma, and a calibrated probability never prints as certainty (0.995 and above prints as 0,99+).

The world replaced a retired noticeboard system (putty board, slate, lime highlighter, Archivo and Geist). None of those materials, colours, or faces belong here.

**Key Characteristics:**
- Two editions of one atlas: day paper for work, night plate for the sky.
- Liquid glass on the navigation layer only; content on solid plates.
- One blue for action; warm hues reserved for risk tiers, always labelled.
- Risk reads as star size and warmth, never colour alone.
- One variable family (Google Sans Flex) for display, UI, and numerals; Google Sans Code for IDs and keys.
- Motion arrives once and never hides content on first paint.

## Colors

A cool navy-and-blue atlas with a single warm arm reserved for risk.

### Primary
- **Atlas Blue** (blue): the only action and selection colour: primary buttons, the active nav icon, focus outlines, caret, links (as Deep Atlas Blue, blue-ink), the "not at risk" chart series, the lit share of the capacity band. Hover deepens (blue-hover), press deepens further (blue-press).
- **Blue Wash** (blue-soft) with **Deep Atlas Blue** (blue-ink): tinted neutral chips (archetype chip, the "Terakhir dibuka" flag, the active mobile menu item). The blue family is how the system says "category" without saying "risk".
- **Starlight** (starlight): the light blue of the night edition: the lantern star on night plates, the focus outline inside `.night`, and the automated-message share of the capacity band. **Queue Track** (queue-track) is the unlit remainder of that band: students still waiting for capacity. Both are CSS variables (`--starlight`, `--queue-track`) in `web/app/globals.css`. Starlight also marks the night sky's catalogue tags (K01 to K06).

### Secondary: Risk tiers
A diverging scale. Rendah is the cool pole (not flagged); Pantau, Tinggi, Kritis are one warm ordinal arm (monotone lightness, one hue, light end 2.08:1 on white).
- **Day tiers** (tier-low, tier-watch, tier-high, tier-critical): dots, bars, and the risk tone of a figure on white and paper.
- **Night stars** (star-low, star-watch, star-high, star-critical): the same four tiers tuned for the night plate (validated on night: CVD 15.6, normal 16.9, contrast at least 3:1). Use only on night; never mix the two sets on one ground.
- **Uncertain** (uncertain): the grey-blue of the uncertain band around the threshold.

### Tertiary: Chart pair
- **At Risk** (chart-risk), **Not At Risk** (chart-safe, equal to Atlas Blue), **Neutral** (chart-neutral): the two-series pair and its reference colour; all six validator checks pass on white. Categorical and ordinal chart colours come only from these and the tier tokens.

### Neutral
- **Navy Ink** (ink): headings, values, primary text. **Slate Ink** (ink-2): body and secondary copy. **Quiet Ink** (ink-3): labels, captions, axis text, placeholders, HeroUI's `muted`.
- **Atlas Paper** (paper): page ground behind the atlas plate. **Plate White** (surface): content plates, fields, overlays. surface-secondary and surface-tertiary are the quieter fills inside plates.
- **Hairline** (line), **Strong Hairline** (line-strong, field borders), **Separator** (separator, table header rule).
- **Night** (night), **Night Raised** (night-2), **Night Hover** (night-3), **Night Ink** (night-ink), **Night Muted** (night-muted): the night edition. The night hairline is night-muted at 18% alpha.
- **Success** (success) and **Warning** (warning) are HeroUI semantics for status text; danger maps to tier-critical.

### Named Rules
**The Warm Means Risk Rule.** On day surfaces, amber, orange, and red appear only as risk tiers or the at-risk chart series. Archetypes, contact status, and categories use the blue family or a neutral, never a warm hue. On night plates warm is a star's tier, plus the amber constellation line that joins each cluster's six riskiest stars, which the sky caption names; catalogue tags stay Starlight.

**The Label Always Rule.** A tier colour never stands alone: every tier dot sits next to its Indonesian label (Rendah, Pantau, Tinggi, Kritis), and dot size grows with risk (8, 10, 10, 12px on day; magnitude steps on night) so identity survives colour blindness and greyscale projectors.

**The One Blue Rule.** There is one action colour. A second accent hue for buttons, links, or selection does not exist in this system.

## Typography

**Display Font:** Google Sans Flex (with ui-sans-serif, system-ui), loaded with its opsz, wdth, and ROND axes
**Body Font:** Google Sans Flex, optical sizing auto
**Label/Mono Font:** Google Sans Code (with ui-monospace)

**Character:** One variable family does every job by moving its axes: wide and slightly rounded for headlines (the lantern's warmth), neutral width for numerals, text optical size for copy. Google Sans Code marks the things a person types or quotes: student IDs, keyboard shortcuts, catalogue numbers, tooltip values.

### Hierarchy
- **Display** (600, 2.5rem to 3.9rem, 1.02): the landing hero headline only, white on night.
- **Headline** (600, 1.85rem phone to 2.6rem, 1.02, wdth 108, ROND 40): every page title, written as the screen's finding in one sentence; landing section titles at 2.2rem to 3rem. Balanced wrapping on h1 to h3.
- **Numeral** (650, 1.9rem standard, 2.6rem large, 1, tabular, wdth 100, ROND 20): KPI figures in Stat; numbers roll to new values with id-ID digits.
- **Title** (600, 17px, -0.01em): plate titles; role-card and action titles step up to 18px.
- **Body** (400, 15px, relaxed 1.625): page descriptions and landing copy, capped at 75ch (52ch in stage rows); 14px inside plates and table cells.
- **Label** (500, 13px, Quiet Ink): figure labels, tier badges (600), contact marks; 12px for table column headers (600) and captions; 11px for nav group names and tab-bar labels.
- **Mono** (500, 10px to 11px, tabular): IDs, `kbd` shortcuts, catalogue tags, tooltip values.

### Named Rules
**The Finding Title Rule.** A page title is the screen's finding as one sentence in Headline type. Nothing sits above it: no eyebrow, kicker, or category label.

**The Tabular Rule.** Every number in a table cell, mono run, or Stat uses tabular figures and the shared id-ID formatter.

## Layout

The signed-in shell is a floating glass rail (264px, inset 12px from the viewport, lg and up) beside a main column capped at 1360px, padded 300px from the left on desktop and 16 to 24px on phones. Phones replace the rail with a glass top bar (56px) and a floating glass tab bar (64px, four destinations plus Menu) pinned above the safe area; main content reserves 112px at the bottom for it.

Plates stack in 20px gaps. The dashboard pairs a night-plate sky spanning the wide column with a 340px figure rail (xl and up); below xl the rail becomes a two-column grid of figures. Plates pad 20px on phones and 24px from sm. Table cells pad 14px by 16px (9px vertical in dense tables).

The landing is a full-bleed night hero (headline column left, the constellation on the right 60%), then a day sheet that rises over it with 36px top corners and holds content at max 72rem (1152px) with 3xl text measures. Stages alternate copy and a real record in a 5:6 grid with 64px gutters.

The generated day atlas plate sits fixed behind every working screen under a 35% paper wash, drifting at a fraction of scroll (one depth clock) while the reading plane holds still.

## Elevation & Depth

Depth is three layers: the atlas plate (back, drifting), solid content plates (middle, still), and glass navigation (front). Shadows are soft, navy-tinted, and long with negative spread, so plates read as cards resting on paper rather than floating. Glass adds an inner specular rim on top of its drop shadow. There are no hard offset shadows.

### Shadow Vocabulary
- **Plate** (`0 1px 2px rgb(11 27 58 / 0.05), 0 10px 30px -16px rgb(11 27 58 / 0.22)`): every content plate at rest.
- **Lift** (`0 2px 6px rgb(11 27 58 / 0.08), 0 18px 40px -18px rgb(11 27 58 / 0.32)`): hover on interactive day plates (role cards).
- **Surface** (`0 1px 2px rgb(11 27 58 / 0.05), 0 8px 24px -14px rgb(11 27 58 / 0.18)`): HeroUI surfaces.
- **Overlay** (`0 2px 8px rgb(11 27 58 / 0.08), 0 28px 56px -20px rgb(11 27 58 / 0.34)`): popovers, tooltips, the command palette.
- **Glass rim**: white frost at 56%, blur 22px, saturate 1.8, 1px white border at 70%, inset top highlight, plus a 40px soft drop. The night variant is night-2 at 50% with blur 20px.
- **Primary glow**: the primary button carries an inner top highlight and a blue-tinted under-glow.

### Named Rules
**The Glass Is Navigation Rule.** Liquid glass belongs to the sidebar, phone top and tab bars, sheets and the command palette (as blurred backdrops behind white dialogs), the active nav indicator, and the landing nav pill and its primary action. Content (tables, figures, charts, forms) always sits on solid white plates; sign-in role cards are solid night plates. On Chromium, small glass controls also bend what is behind them through an SVG displacement lens.

**The Reduced Transparency Rule.** Under prefers-reduced-transparency, glass turns opaque (white on day, night-2 on night) with no backdrop filter.

## Shapes

Generously rounded, soft-cornered geometry with radius that grows with the size of the object: controls 10px, fields and tooltips 12px, nav items and menu tiles 16px, content plates 20px, role cards and the phone top bar 22px, night plates 24px, the floating rail and bottom sheets 28px, the landing day sheet 36px at the top. Chips, the tab bar, buttons, avatars, stage numerals, and star dots are full pills or circles. Plates carry a near-invisible 1px navy border (6% alpha); night plates carry none. Day tier dots wear a 2px white ring so they read on any fill.

## Components

### Buttons
Confident, rounded, blue.
- **Shape:** full pill (HeroUI button), 600 weight with a hair of negative tracking.
- **Primary:** Atlas Blue fill, white text, inner top highlight and blue under-glow; hover blue-hover, press blue-press.
- **On night:** white fill with Night text, 48px tall, 24px side padding (landing "Masuk ke demo"), with the glass lens on Chromium.
- **Quiet link:** text-only pill with an icon (landing "Lihat cara kerja").
- **Links as buttons:** LinkButton dresses a Next.js link in the HeroUI button variants.

### Chips
- **Archetype chip:** 28px pill, Blue Wash fill, Deep Atlas Blue text, a 14px line icon per archetype. Never a risk colour.
- **Stopped flag:** small Blue Wash pill with a flag icon, "Terakhir dibuka", on the row the advisor opened last in this tab.

### Cards / Containers
- **Plate:** Plate White, 20px corners, Plate shadow, 6% navy hairline, 20 to 24px padding; header holds a 17px title, an optional Quiet Ink description, and actions on the right.
- **Night plate:** Night fill, 24px corners, Night Ink text; hosts the cohort sky and its legend.
- **Empty state:** a plate with a generated atlas illustration (empty atlas or missing star), a short title, a description, and one action.

### Inputs / Fields
- **Style:** white field, 1px Strong Hairline border, 12px corners, faint drop shadow, Quiet Ink placeholder, blue caret.
- **Focus:** 2px Atlas Blue outline offset 2px (Starlight inside night surfaces), shared by every focusable element.

### Navigation
- **Rail:** floating glass panel with the lantern wordmark, command search, nav grouped under 11px group names, and a user card with the role switch at its foot.
- **Items:** 40px rows, 14px medium Slate Ink with a 18px Quiet Ink icon and a mono shortcut key on xl; hover washes white at 45%.
- **Active:** a glass white indicator glides between items on a spring; the icon turns Atlas Blue and the text Navy Ink.
- **Phone:** glass top bar (wordmark, search) and floating glass tab bar; the active tab is a white pill with a blue icon; Menu opens a blurred bottom sheet with every page as a 48px tile.
- **Command palette:** a white overlay dialog (24px corners) over a blurred backdrop, opened from the rail search field (white at 70%, 16px corners, Ctrl K) or the top bar; the selected result takes Blue Wash with a blue icon.

### Tier badge
A star dot plus its label in 13px semibold Navy Ink. Dot size: Rendah 8px, Pantau and Tinggi 10px, Kritis 12px, each with a white ring.

### Contact mark
Contact state is a mark, not a hue: each status has its own line icon (contacted, scheduled, unreachable, not contacted) read before its colour.

### Stat
A 13px label, a Numeral value that rolls to new values, an optional note. Tone tints the value Atlas Blue or tier-critical for risk figures only.

### Data table
HeroUI table with transparent 12px column headers in Quiet Ink, a separator rule under the header, 14px cells, and tabular numbers right-aligned. Rows that link get a Blue Wash hover and a 2px inset blue focus ring.

### Cohort sky (signature)
The WebGL constellation: one star per student grouped by archetype, star size as the magnitude key and night tier colour as warmth, faint atlas grid lines behind, constellation lines joining each archetype, and tracked labels naming each cluster with its flagged count. It turns slowly, tilts a little on drag, never zooms or pans, and freezes under reduced motion. A legend always pairs each star size and colour with its tier label.

### Capacity band
A 12px pill track: Atlas Blue for advisor contacts, Starlight for automated messages, Queue Track for students still waiting. The lit share is what capacity reaches; the rest is the queue. Always with a legend and an accessible sentence.

### Scenario label
Every what-if, counterfactual, or effectiveness-weighted figure carries the label "Skenario model, bukan efek kausal".

### Charts
2px lines with white-ringed 4px dots, bars at most 24px with 4px rounded ends, solid hairline grids, Quiet Ink 12px axes, a legend for two or more series, and a tooltip that leads with the mono value, then the series name keyed by a short line in the series colour.

### Motion
- **Rise:** content rises 14px out of a 6px blur over 640ms on an expo-out curve, staggered 70ms; the start state is visible-by-default content that the animation plays over.
- **Route change:** each in-app navigation fades its content up 12px over 420ms; the first paint after a hard load is never hidden.
- **Settle:** numerals settle once from light and narrow to their final weight and width.
- **Landing:** sections reveal and records drift on scroll-driven timelines (compositor only; unsupported browsers show the final state); the sky dawns in after the headline.
- **Reduced motion** disables every entrance, drift, and parallax.

## Do's and Don'ts

### Do:
- **Do** keep content on solid white plates (20px corners, Plate shadow) and reserve glass for navigation.
- **Do** pair every tier colour with its label and its dot size; use day tier tokens on light grounds and night star colours only on the night plate.
- **Do** use Atlas Blue for every action, selection, link, and focus ring, and nothing else for those jobs.
- **Do** write each page title as the screen's finding in one sentence, in Headline type, with nothing above it.
- **Do** format numbers through the shared id-ID formatter and print probabilities of 0.995 and above as 0,99+.
- **Do** label every scenario or counterfactual result "Skenario model, bukan efek kausal".
- **Do** let entrance motion play over content that is already visible, and disable it under reduced motion; make glass opaque under reduced transparency.

### Don't:
- **Don't** use amber, orange, or red for anything on day surfaces that is not a risk tier or the at-risk chart series.
- **Don't** put tables, figures, charts, or forms on glass.
- **Don't** set an eyebrow, kicker, or category label above a heading.
- **Don't** bring back the noticeboard materials: putty, slate, lime highlighter, Archivo, or Geist.
- **Don't** separate values with a middle dot (·). Join them with commas or words, or give each value its own label.
- **Don't** use hard offset shadows; depth is soft navy-tinted shadow and glass rim.
- **Don't** hide content on first paint to stage an entrance.
