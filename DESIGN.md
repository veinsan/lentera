---
name: Lentera
description: Week 4 intervention board for at-risk students, drawn as a pinned campus noticeboard.
colors:
  ink: "#16140f"
  ink-hover: "#34302a"
  ink-muted: "#625d52"
  putty: "#ece7dd"
  paper: "#fbfaf6"
  putty-deep: "#e3dcce"
  putty-hover: "#e8e1d3"
  rule: "#d9d1c1"
  rule-strong: "#cfc6b4"
  slate: "#1f2b2e"
  slate-raised: "#2c3a3e"
  slate-line: "#3a4a4f"
  slate-ink: "#e9e6dd"
  slate-muted: "#a4aba3"
  lime: "#d9f24a"
  destructive: "#b42318"
  success: "#2f7d5b"
  risk-low: "#e2a27a"
  risk-watch: "#cf7448"
  risk-high: "#b04a26"
  risk-critical: "#7a2610"
  on-risk-light: "#16140f"
  on-risk-dark: "#ffffff"
  uncertain: "#7a7f8c"
  chart-at-risk: "#a93a1c"
  chart-not-at-risk: "#2f6db5"
  chart-neutral: "#9aa1ae"
typography:
  display:
    fontFamily: "Archivo, sans-serif"
    fontSize: "64px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 80"
  headline:
    fontFamily: "Archivo, sans-serif"
    fontSize: "44px"
    fontWeight: 700
    lineHeight: 1.06
    letterSpacing: "-0.025em"
    fontVariation: "'wdth' 88"
  title:
    fontFamily: "Archivo, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.25
    fontVariation: "'wdth' 92"
  body:
    fontFamily: "Geist, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.375
  body-app:
    fontFamily: "Geist, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Geist, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.33
  data:
    fontFamily: "Geist Mono, monospace"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.375
    fontFeature: "'tnum'"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "20px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.ink-hover}"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "40px"
  button-outline-hover:
    backgroundColor: "{colors.putty-deep}"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "4px 12px"
    height: "40px"
  sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
    padding: "24px"
  slate-panel:
    backgroundColor: "{colors.slate}"
    textColor: "{colors.slate-ink}"
    rounded: "{rounded.2xl}"
    padding: "24px"
  student-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.data}"
    rounded: "{rounded.xl}"
    padding: "10px 12px 10px 32px"
  nav-item:
    textColor: "{colors.slate-muted}"
    rounded: "{rounded.xl}"
    padding: "10px 12px"
  nav-item-active:
    backgroundColor: "{colors.slate-raised}"
    textColor: "{colors.on-risk-dark}"
  role-switch-active:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "6px 10px"
  tier-pin:
    rounded: "{rounded.full}"
    size: "10px"
---

# Design System: Lentera

## Overview

**Creative North Star: "The Week 4 Noticeboard"**

Lentera is a campus noticeboard for one week. The ground is warm putty, every piece of content is a paper sheet pinned to it, and the controls live on a dark slate rail and slate panels beside the board. Flagged students are small paper cards with a round tier pin; each advisor is a column whose open capacity shows as a dashed pin hole. One lime highlighter marks the numbers that matter, the way a coordinator would mark a printed list.

The interface is dense but calm. It ranks by weight, case, and family rather than by many sizes: condensed Archivo carries findings and the one big numeral, Geist carries the interface, Geist Mono carries every ID, count, and probability. Colour is spent sparingly: ink on paper does the work, the tier ramp carries risk, and lime appears only where the eye should land first. The screen is read from a projector, so contrast and size hold up at distance.

The previous navy, amber, and Plus Jakarta Sans system is retired. None of it remains in code and none of it should return.

**Key Characteristics:**
- Putty board, paper sheets with a soft pinned shadow, slate for controls and navigation.
- One lime highlighter: a half-height marker stroke behind key numbers on paper, a solid fill on slate.
- Tier shown as a round pin plus a label, never colour alone.
- Condensed Archivo for findings and numerals; Geist Mono with tabular figures for all data.
- Indonesian interface copy with id-ID number formatting (comma decimals, dot thousands).

## Colors

A warm paper and ink palette with one slate counterweight and one acid lime accent; risk owns its own validated ramp.

### Primary
- **Noticeboard Ink** (ink): body text, headings, primary buttons, and the pin dot on sheets. Hover deepens to Ink Hover (ink-hover).
- **Highlighter Lime** (lime): the marker stroke behind key numbers, the selected role in the role switch, the active nav icon, the hover ring on a student card's pin, text selection, and focus outlines on slate. On slate it may also set a numeral directly (the marginal reach figure).

### Secondary
- **Rail Slate** (slate): sidebar, the capacity panel, the sign-in hero, and the focus ring colour on light surfaces. Slate Raised (slate-raised) holds steppers, the user panel, and the active nav item; Slate Line (slate-line) is hover and dividers on slate. Text on slate is Slate Ink (slate-ink) with Slate Muted (slate-muted) for secondary lines.

### Tertiary
- **Tier ramp** (risk-low, risk-watch, risk-high, risk-critical): pin colours for Rendah, Pantau, Tinggi, Kritis, light to dark. Text placed on the two light tiers uses on-risk-light; on the two dark tiers, on-risk-dark. Validated with the dataviz checker; do not adjust.
- **Uncertain Grey** (uncertain): the uncertainty zone that needs human review.
- **Chart pair** (chart-at-risk, chart-not-at-risk, chart-neutral): at risk, not at risk, and neutral series in every chart. Validated; do not swap or recolour.

### Neutral
- **Putty Board** (putty): the page ground.
- **Pinned Paper** (paper): sheets, student cards, inputs, outline buttons, popovers.
- **Putty Deep** (putty-deep): the board tray behind advisor columns, muted fills, secondary buttons. Putty Hover (putty-hover) is the hover surface and loading skeleton.
- **Muted Ink** (ink-muted): labels, notes, context lines.
- **Rule** (rule) for hairlines and table rows; **Rule Strong** (rule-strong) for input strokes and dashed pin holes.
- **Destructive** (destructive) and **Success** (success) for errors and confirmations only.

### Named Rules
**The One Highlighter Rule.** Lime is the only accent. On paper it is never a fill or a text colour, only the stroke behind ink; on slate it may fill a selected control or set one numeral. If two lime marks compete for the first look, remove one.

**The Pin Plus Label Rule.** A tier is always a round pin with its Indonesian label nearby (legend, screen reader text, or badge). Colour alone never carries tier identity.

**The Validated Pair Rule.** Chart colours mean the same thing on every screen: chart-at-risk is at risk, chart-not-at-risk is not at risk, chart-neutral is everything else.

## Typography

**Display Font:** Archivo, variable width axis (with sans-serif)
**Body Font:** Geist (with sans-serif)
**Label/Mono Font:** Geist Mono (with monospace), tabular figures

**Character:** A condensed grotesque headline voice that reads like a printed notice, over a neutral modern UI face and a monospace that keeps numbers aligned in columns.

### Hierarchy
- **Display** (Archivo 800, width 80%, 64px, line height 1): the result of the one lever on a screen, such as the marginal reach per extra advisor. One per screen.
- **Headline** (Archivo 700, width 88%, 44px, 32px below the small breakpoint, line height 1.06): the screen's finding written as a sentence, with up to two numbers under the marker. Page headers use the same face at 36px (28px on phones).
- **Title** (Archivo 700, width 92%, 20px): panel and section titles.
- **Body** (Geist 400, 13px on the board, 14px elsewhere): descriptions, notes, context. Cap prose at 75ch.
- **Label** (Geist 600, 12px): field labels, KPI labels, table headers, role buttons. Advisor column headers on the board are the one uppercase label (13px, 0.06em tracking).
- **Data** (Geist Mono 600, tabular): student IDs, probabilities, counts, hours, stepper values.

### Named Rules
**The Four Sizes Rule.** The board screen uses exactly four sizes: 64, 44, 20, 13 px. Rank inside a size by weight, case, and family, not by adding a fifth size.

**The Condensed Numeral Rule.** Big standalone numbers are Archivo 800 at reduced width with tight tracking (-0.03em). Inline data numbers are Geist Mono.

**The Probability Format Rule.** Probabilities in tables and cards show two decimals with an id-ID comma (0,87); 0.995 and above prints as 0,99+, never as certainty. In sentences, use percentages. Scenario results are always labelled "Skenario model, bukan efek kausal".

## Layout

Desktop: a fixed 240px slate rail on the left, content on the putty ground to its right. The board screen opens with a two-column row, the finding sheet beside a 340px slate capacity panel (stacked below 1280px), then the board tray. Advisor columns flow horizontally with a 204px minimum each and scroll sideways rather than wrap. Rhythm: 20px between major blocks, 12px between columns, 8px between student cards, 24 to 32px inside sheets.

Phones: the rail collapses into a top band with a horizontally scrolling nav and a compact role chip (a disclosure) so the finding keeps the first screen. The finding sheet, capacity panel, and board stack.

Sign-in: a split screen, slate hero on the left (5 parts) and three pinned role sheets on the right (6 parts); stacked on phones.

**The Below The Line Rule.** Capacity never overflows a column. Students who do not fit are counted below a dashed rule under the board, not squeezed into it.

## Elevation & Depth

Depth is physical and shallow: paper pinned to a board. Sheets carry one soft drop shadow; slate surfaces are flat and separate by tone. Lift happens on hover only, for things that can be opened or chosen.

### Shadow Vocabulary
- **Pinned sheet** (`box-shadow: 0 1px 0 rgb(22 20 15 / 0.06), 0 14px 30px -18px rgb(22 20 15 / 0.28)`): every paper sheet at rest.
- **Card hairline** (`box-shadow: 0 1px 0 rgb(22 20 15 / 0.06)`): student cards at rest on the board tray.
- **Lifted** (`box-shadow: 0 10px 28px -10px rgb(22 20 15 / 0.28)`): hover state of student cards and role sheets, paired with a 2px upward move; also popovers.

### Named Rules
**The Pinned Sheet Rule.** A primary sheet may carry a pin: a 14 to 16px ink dot centred on its top edge. The pin is the sheet's only ornament. Slate never casts a shadow.

## Shapes

Generous, soft corners throughout: 24px on sheets and slate panels, 20px on student cards, steppers, inputs, nav items, and pin holes, 16px on role switch buttons, 12px on keyboard hints. Buttons, stepper controls, and tier pins are fully round. Borders are rare: sheets have none; dashed 1.5px strokes in Rule Strong mark empty capacity (pin holes) and the below-the-line divider.

## Components

### Buttons
Round and quiet; the ink pill is the only loud one.
- **Shape:** fully round pill, 40px tall, 16px side padding.
- **Primary:** ink fill, paper text; hover to ink hover. Active nudges down 1px.
- **Outline:** paper fill with a Rule Strong stroke; hover to putty deep.
- **Ghost / Link:** no fill; ghost hovers to putty deep, link underlines with a 3 to 4px offset.
- **Focus:** a 2px slate outline offset 2px; on slate surfaces the outline turns lime.

### Cards / Containers
- **Sheet:** paper, 24px corners, pinned sheet shadow, 24px padding (32px for the finding sheet). Section sheets title in Archivo 20px.
- **KPI sheet:** a label in Geist 12px, a condensed numeral, an optional note; the numeral may take the marker.
- **Slate panel:** slate, 24px corners, flat, slate ink text; holds controls and the one display numeral.
- **Board tray:** putty deep, 24px corners, 20px padding; holds advisor columns.

### Inputs / Fields
- **Style:** paper fill, Rule Strong 1px stroke, 20px corners, 40px tall.
- **Focus:** stroke turns slate with a 3px half-opacity slate ring.
- **Error / Disabled:** destructive stroke with a faint destructive ring; disabled at half opacity.
- **Stepper (on slate):** slate raised tile with a muted label, round minus and plus buttons, the value in Geist Mono 20px white.

### Navigation
Slate rail, Geist 14px medium. Default items in slate muted; hover to slate raised; the active item sits on slate raised in white with its icon in lime. The user panel and role switch sit at the rail's foot; the selected role is a lime fill with ink text.

### Tier Pin
A 10px round pin in the tier colour, ringed 2px in paper so it reads on any card; 8px inside column summaries. The badge form pairs the pin with the label in Geist 12px semibold.

### Student Card
A paper card on the board tray: tier pin at the left, student ID and probability in Geist Mono 13px across the top, module and action in muted Geist below. Hover lifts it and rings the pin in lime. Cards settle in with a staggered rise (420ms, cubic-bezier(0.16, 1, 0.3, 1), 22ms per card, from 45% opacity) whenever capacity changes; reduced motion disables it.

### Marker
The lime highlighter. On paper, a stroke covering 58% to 94% of the line height behind ink. On slate, a solid lime fill with ink text and slight rounding, because a half stroke would leave dark ink on a dark ground.

## Do's and Don'ts

### Do:
- **Do** set every screen on putty with content on paper sheets and controls on slate.
- **Do** put at most two key numbers of a finding under the lime marker.
- **Do** show tier as a pin plus a label, using the validated ramp unchanged.
- **Do** set IDs, counts, and probabilities in Geist Mono with tabular figures and id-ID formatting.
- **Do** keep the board screen to 64, 44, 20, and 13 px.
- **Do** mark empty capacity with a dashed pin hole and send overflow below the dashed line.
- **Do** label every scenario result "Skenario model, bukan efek kausal".

### Don't:
- **Don't** use lime as a fill or text colour on paper, or add a second accent colour.
- **Don't** let colour alone identify a tier or a chart series.
- **Don't** print a probability as 1,00; use 0,99+.
- **Don't** give slate surfaces shadows or give sheets borders.
- **Don't** use hard offset shadows; depth is the soft pinned sheet only.
- **Don't** bring back the retired navy, amber, or Plus Jakarta Sans system.
