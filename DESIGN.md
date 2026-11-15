---
name: Relay
description: Turn memories into intentions, then find people and places that can help.
colors:
  airmail: "#57496e"
  airmail-hover: "#57496e"
  airmail-ink: "#57496e"
  on-airmail-muted: "#ffffff"
  airmail-tint: "#f0eaf8"
  airmail-tint-strong: "#e0d6f5"
  airmail-red: "#ba354a"
  red-tint: "#f2c9cc"
  red-soft: "#fbecec"
  ground: "#fcfaf8"
  card: "#ffffff"
  soft: "#f4f0f7"
  tint: "#f0eaf8"
  chip: "#f4f0f7"
  chip-strong: "#e0d6f5"
  postmark: "#57496e"
  kraft: "#7b5538"
  kraft-ink: "#7b5538"
  kraft-soft: "#fff2e7"
  success: "#1f6b47"
  success-soft: "#e3f1ea"
  live: "#2f9e6a"
  scrim: "#0e1626"
  ink: "#242833"
  ink-muted: "#6b6373"
  line: "#e7e0e9"
typography:
  display:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  page-title:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  feature-title:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  section-title:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  lead:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.4
  card-title:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.35
  column-label:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
  body:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
    fontFeature: "\"tnum\" 1"
  meta:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
  tag:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
  postmark:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "9.5px"
    fontWeight: 800
    letterSpacing: "0.09em"
  postmark-small:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "8.5px"
    fontWeight: 800
    letterSpacing: "0.09em"
  postmark-detail:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "8px"
    fontWeight: 600
    letterSpacing: "0.12em"
rounded:
  control: "11.2px"
  card: "14.4px"
  feature: "17.6px"
  pill: "9999px"
spacing:
  gutter: "20px"
  column-gap: "20px"
  stack: "8px"
  card-padding: "16px"
  feature-padding: "24px"
components:
  button-primary:
    backgroundColor: "{colors.airmail}"
    textColor: "{colors.card}"
    rounded: "{rounded.pill}"
    height: "40px"
    padding: "0 16px"
  button-on-airmail:
    backgroundColor: "{colors.card}"
    textColor: "{colors.airmail}"
    rounded: "{rounded.pill}"
    height: "40px"
    padding: "0 16px"
  button-open-link:
    backgroundColor: "{colors.airmail-tint}"
    textColor: "{colors.airmail}"
    rounded: "{rounded.pill}"
    height: "40px"
    padding: "0 16px"
  button-outline:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "40px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-padding}"
  tile-selected:
    backgroundColor: "{colors.airmail}"
    textColor: "{colors.card}"
    rounded: "{rounded.card}"
  feature-block:
    backgroundColor: "{colors.airmail}"
    textColor: "{colors.card}"
    rounded: "{rounded.feature}"
    padding: "{spacing.feature-padding}"
  tag-sample:
    backgroundColor: "{colors.chip}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
    height: "20px"
  tag-great-fit:
    backgroundColor: "{colors.kraft-soft}"
    textColor: "{colors.kraft-ink}"
    rounded: "{rounded.pill}"
    height: "20px"
---

# Design System: Relay

## Overview

**Creative North Star: "The Airmail Board"**

Relay is one calm page that a judge can follow over a screen share. White cards sit on a warm light ground. Lavender marks selection and primary actions. Peach marks the proposed next step. Everything else stays quiet, so the person, page, or post being suggested gets the attention.

Provenance is the one place the system becomes expressive. A dashed oval Inferred postmark sits on LLM ideas, and a solid Public source postmark sits on Telem sources. Sample members carry a labeled source mark. Fit is said in words, never as a score.

**Key Characteristics:**
- Violet and peach follow the Relay logo. Red identifies failures.
- White cards with a soft shadow, `rounded-2xl` corners (14.4px), and no borders.
- Pill-shaped controls at least 40px tall.
- Short sentence-case labels. No uppercase eyebrows.

## Colors

Violet and peach on a warm white ground. All colors are CSS custom properties in `app/globals.css`; components use `var(--token)` and never hex literals. The one exception is platform brand colors in `components/public-person-card.tsx`, each checked against the chip background at 4.5:1 or better.

- **Legacy aliases** (`--airmail`, `--airmail-2`): dark purple for links and secondary pages. The board uses `--relay-purple` for selection and primary buttons, and `--relay-peach-soft` for its proposal.
- **On-airmail muted** (`--on-airmail-muted`): white text on dark purple surfaces.
- **Airmail tint** (`--airmail-tint`, `--airmail-tint-strong`): the "Open" link button and the globe avatar for public pages.
- **Ground, card, tint, chip** (`--ground`, `--card`, `--tint`, `--chip`, `--chip-strong`): the page, cards, the memory quote, and tags or chips, from lightest to darkest.
- **Kraft** (`--kraft-soft`, `--kraft-ink`): "Great fit" and "Unknown" tags only.
- **Red** (`--airmail-red`, `--red-soft`, `--red-tint`): failures and the demo persona's avatar.
- **Success** (`--success`, `--success-soft`): completed steps and "Connected".
- **Postmark** (`--postmark`): provenance stamps only.

## Typography

Public Sans for everything, with tabular figures on by default (`font-feature-settings: "tnum" 1`). Weights: 400 body, 500 meta, 600 to 700 titles and labels, 800 page titles and the wordmark. Sizes in use: 34px for the empty-state heading, 26px for page titles, 20 to 22px for the wordmark, dialog title, and the proposal, 17px for lead lines, 16px for card titles, 14 to 15px for body and labels, 12.5px for meta, and 11px for tags. Column and section labels are 15px bold in `--ink-muted`, sentence case. Postmarks are the only uppercase text, at 8 to 9.5px with wide tracking.

## Layout

- Max width 1280px, 20px gutters.
- The board uses three columns on desktop (`1fr 1fr 1.5fr`, 20px gap). The memory and intention columns are sticky.
- Below 1024px the columns stack. The memory list turns into a horizontal row that snaps tile by tile, and the next tile peeks in.
- Run pages center a 760px flow chart under the same header.
- No horizontal page scroll at 320px.

## Elevation & Depth

Two levels: `shadow-sm` for cards and resting tiles, `shadow-md` for the selected tile and on hover. Popovers and the dialog use `shadow-lg` and `shadow-2xl`. The dialog backdrop is `--scrim` at 45%. Depth always uses offset soft shadows, never borders or glows.

## Shapes

Radii come from `--radius` (0.5rem) through the Tailwind theme: cards and tiles `rounded-2xl` (about 14px), feature blocks and the dialog `rounded-3xl` (about 18px), controls `rounded-xl`, and buttons and tags `rounded-full`. Avatars are circles. Postmarks are ovals.

## Components

- **Tile** (`app/page.tsx`): a full-width button with `aria-pressed`. White at rest, lavender when selected.
- **WayCard and PublicPersonCard**: card, avatar, title row with tags, "Why this fits", and one action at the foot.
- **Idea for you**: a peach feature block with the proposal and a progress bar while searches run.
- **Add a memory**: a native `<dialog>` opened with `showModal()`. It traps focus, closes on Escape or a backdrop click (except while reading), and returns focus to the + button. It is a bottom sheet on phones.
- **Run step** (`app/r/[runId]/page.tsx`): a card with a status dot, a label, and a summary. Steps with details are `<details>` elements. Active and failed steps get a 2px ring.
- **SampleTag, UnknownTag, Postmark** (`components/stamps.tsx`).
- **SiteHeader** (`components/shell.tsx`): the Relay logo and account controls on secondary pages. The board uses the same logo and spacing.

## Do's and Don'ts

- Do use the board's total (ways plus public posts) wherever a count is shown, so the board and the run page agree.
- Do keep the selected memory and intention in the URL (`?m=…&i=…`).
- Do give every control a hit area of at least 40px.
- Don't add new hex literals in components. Add a token to `app/globals.css`.
- Don't use uppercase eyebrows or tracking-wide labels.
- Don't show fit as a number or a percentage.
- Don't add postmarks for decoration. They name a claim's source.
