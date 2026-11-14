---
name: DROPZONE
description: Free Fire tournament platform. A calm, friendly light product where one brand blue fills whole fields and marks every action.
colors:
  brand-blue: "oklch(0.52 0.2 262)"
  brand-blue-pressed: "oklch(0.47 0.2 262)"
  white-ground: "oklch(1 0 0)"
  soft-gray: "oklch(0.967 0 0)"
  quiet-fill: "oklch(0.935 0 0)"
  ink: "oklch(0.16 0 0)"
  footer-black: "oklch(0.12 0 0)"
  muted-ink: "oklch(0.45 0 0)"
  hairline: "oklch(0 0 0 / 8%)"
  input-line: "oklch(0 0 0 / 14%)"
  confirmed-green: "oklch(0.52 0.14 150)"
  pending-amber: "oklch(0.53 0.12 65)"
  rejected-red: "oklch(0.55 0.21 25)"
typography:
  display:
    fontFamily: "Figtree, ui-sans-serif, sans-serif"
    fontSize: "4.6rem"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Figtree, ui-sans-serif, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Figtree, ui-sans-serif, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  card-title:
    fontFamily: "Figtree, ui-sans-serif, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.33
  label-caps:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "0.05em"
  micro:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1.4
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "1.125rem"
    fontWeight: 600
    letterSpacing: "0.05em"
rounded:
  sm: "9.6px"
  md: "12.8px"
  lg: "16px"
  xl: "22.4px"
  3xl: "35.2px"
  full: "9999px"
spacing:
  gutter: "16px"
  gutter-sm: "24px"
  card: "20px"
  section: "80px"
  container: "1280px"
components:
  button-primary:
    backgroundColor: "{colors.brand-blue}"
    textColor: "{colors.white-ground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    padding: "0 14px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.brand-blue-pressed}"
  button-primary-lg:
    backgroundColor: "{colors.brand-blue}"
    textColor: "{colors.white-ground}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-on-field:
    backgroundColor: "{colors.white-ground}"
    textColor: "{colors.brand-blue}"
    rounded: "{rounded.full}"
    height: "48px"
    width: "100%"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white-ground}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "52px"
  button-secondary:
    backgroundColor: "{colors.quiet-fill}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "0 14px"
    height: "36px"
  button-ghost:
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "0 14px"
    height: "36px"
  button-ghost-hover:
    backgroundColor: "{colors.quiet-fill}"
  input:
    backgroundColor: "{colors.white-ground}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "0 14px"
    height: "44px"
  input-hero:
    backgroundColor: "{colors.white-ground}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    padding: "0 16px 0 48px"
    height: "52px"
  card-tournament:
    backgroundColor: "{colors.soft-gray}"
    textColor: "{colors.ink}"
    rounded: "{rounded.3xl}"
    padding: "{spacing.card}"
  card-live:
    backgroundColor: "{colors.white-ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.3xl}"
  stat-tile:
    backgroundColor: "{colors.soft-gray}"
    textColor: "{colors.ink}"
    padding: "{spacing.card}"
  empty-state:
    backgroundColor: "{colors.soft-gray}"
    textColor: "{colors.ink}"
    rounded: "{rounded.3xl}"
    padding: "40px 24px"
  demo-badge:
    backgroundColor: "{colors.quiet-fill}"
    textColor: "{colors.muted-ink}"
    typography: "{typography.micro}"
    rounded: "{rounded.sm}"
    padding: "1px 6px"
  sub-nav-pill-active:
    backgroundColor: "{colors.brand-blue}"
    textColor: "{colors.white-ground}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  sub-nav-pill:
    backgroundColor: "{colors.quiet-fill}"
    textColor: "{colors.muted-ink}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
---

# Design System: DROPZONE

## Overview

**Creative North Star: "The Friendly Blue Field"**

DROPZONE is a calm, friendly tournament product with the clarity of a modern consumer finance app. The ground is pure white, surfaces are soft gray fills with no outline, corners are generous, and type is near-black. One brand blue does all the colour work: it fills whole full-bleed regions (the landing hero, the tournament banner, the champions band) and marks every primary action. Black closes long pages, first as a closing field, then a deeper black footer. Inside any coloured field, text and lines invert to white; a card placed on a field stays light.

One rounded geometric sans (Figtree) carries everything, with headings bold, tight and in sentence case; Geist Mono appears only for room codes. Hierarchy comes from type size and weight, and grouping comes from soft gray fills, not from borders, icons or shadows. Buttons are pills, inputs are softly rounded white fields, avatars are circles. Status is a small dot plus words. Motion is minimal and physical: rows and cards press on pointer-down, and hero content settles in once on load.

The system rejects the dark esports dashboard (near-black canvas, neon accent, glowing cards, grids, gradients, tilted or hollow type) and the poster costume of flat black boxes and condensed display type.

**Key Characteristics:**
- White ground, soft gray borderless surfaces, near-black ink.
- Blue as full-bleed fields with white type, or as the primary action; blue ink for links and the leading item in a list.
- One friendly sans for everything; headings 700, tight tracking, sentence case.
- Pills for buttons and filters, softly rounded inputs, circular avatars, large-radius cards.
- Status as dot plus words, never a coloured box.
- Flat: no shadows, no gradients, no glows.
- One authored motion (settle) plus press feedback.

## Colors

Three colours pinned by the product owner (blue, white, black), a two-step gray surface ladder, and three status inks that appear only as text.

### Primary
- **Brand Blue** (`brand-blue`): fills the landing hero, the tournament banner, the champions band, the announcement strip, primary buttons, the active sub-nav pill, notification counters and the filled part of a slot bar. As ink (`--primary-text`) it colours inline links, "Ver todos" links, the rank-1 number, step numbers, the official-organizer mark and the open-registration status. Also the text-selection colour, caret, focus outline and focus ring (at 45%).
- **Pressed Blue** (`brand-blue-pressed`): primary button hover only.

### Neutral
- **White Ground** (`white-ground`): page background, inputs, popovers, the live card on the hero, the hero search, and text on blue or black fields. The sticky header and bottom bar use it at 85% with blur.
- **Soft Gray** (`soft-gray`): every card surface (tournament cards, stat tiles, empty states, announcements). It has no border; the fill is the edge.
- **Quiet Fill** (`quiet-fill`): secondary buttons, ghost and outline hover, avatar fallback, empty slot-bar track, demo badge, sub-nav pills, row hover (at 60–70%). Inside a soft gray card it steps to 0.92 so it still reads.
- **Ink** (`ink`): body text, headings, the closing field, the hero "Buscar" pill, a full slot bar, the 1px rule under ranked-list titles.
- **Footer Black** (`footer-black`): the site footer only, one step below the closing field so the two blacks read as separate bands.
- **Muted Ink** (`muted-ink`): secondary text, meta lines, inactive nav, stat labels.
- **Hairline** (`hairline`) and **Input Line** (`input-line`): dividers inside lists and cards, the header and bar edges, input strokes. Under `prefers-contrast: more`, hairline rises to 25% black and muted ink darkens to 0.35 lightness.

### Status inks
- **Confirmed Green** (`confirmed-green`), **Pending Amber** (`pending-amber`), **Rejected Red** (`rejected-red`): text colour for registration states (confirmed; pending or registration closed; rejected or removed) and destructive actions. They never fill a surface. Inside a coloured field they all resolve to white.

### Named Rules
**The One Blue Rule.** Blue either owns a whole full-bleed region or marks an action, a link or the leading item. It is never a decorative tint, wash, gradient or glow. The sanctioned faint uses are the active sidebar item (oklch 0.95 0.02 262) and a 5–7% wash marking the viewer's own row.

**The Inversion Rule.** A coloured region (blue or black) carries the inverted-field scope: foreground, muted text, borders, inputs, focus ring and every status ink turn white. A card or popover inside that region resets to the light surface values. Never hand-colour text white inside a field; invert the scope.

**The Live Is Blue Rule.** "Ao vivo" is a pulsing blue dot (white on a field) with ink words. Live is never red.

## Typography

**Display Font:** Figtree, weight 700 (fallback ui-sans-serif)
**Body Font:** Figtree (fallback ui-sans-serif, system-ui)
**Label/Mono Font:** Geist Mono, for room IDs and passwords only

**Character:** One rounded geometric sans keeps the whole product friendly and legible; weight and size, not a second family, separate headings from working text.

### Hierarchy
- **Display** (700, 2.6rem mobile, 3.75rem sm, 4.6rem lg, line-height 0.98): the landing hero headline only, max 13ch.
- **Headline** (700, 2.25–3rem, 1.1): closing-field headline, "Como funciona", tournament name in the banner (2.1rem mobile, 3rem sm), champion team names (1.9rem mobile, 3rem sm).
- **Title** (700, 1.5rem, sm 1.875rem): section headings; page headers run 1.75rem mobile, 2.25rem sm. Ranked-list titles are 1.25rem.
- **Card title** (700, 1.2rem): tournament card names; live-card row names at 1.05rem. Stat values use the heading face at 1.5rem, tabular.
- **Body** (400, 1rem; 1.125–1.25rem for hero subcopy, max 38ch): running text; descriptions cap at the prose measure (65ch).
- **Body small** (400–600, 0.875rem): meta lines, nav links, list-row titles (600), buttons (500–600).
- **Label** (600, 0.75rem): status and registration badges, slot counts, list subtitles.
- **Label caps** (600, 11–12px, 0.05em tracking, uppercase): footer column headings, sidebar group headings, table column heads and room-credential labels. Never above a headline.
- **Micro** (500–700, 10px): demo badge, notification counters, small avatar initials. Bottom-nav labels sit at 11px.

### Named Rules
**The One Family Rule.** Figtree sets everything; headings are 700 with -0.025em tracking, sentence case, never all caps. Geist Mono is only for codes a player copies.

**The Tabular Numbers Rule.** Counts, points, dates and tables use tabular figures.

## Layout

A centred container of 1280px with 16px side gutters (24px from 640px). Coloured fields bleed full width while their content stays in the container. The landing page alternates: blue hero, white content (sections 80px apart, 64px top and bottom padding, 96px on large screens), blue champions band, black closing field, black footer.

The hero is a two-column grid on large screens (1.15fr / 0.85fr): the offer, search and shortcuts on the left, the white live card on the right; it stacks on mobile. Tournament cards sit in a 1-, 2- or 3-column grid with 16px gaps; agenda and rankings form three columns on large screens. The tournament banner pairs the facts with a 360px action column on large screens, followed by a sticky translucent tab bar.

Logged-in areas use a 240px sticky sidebar from 1024px; below that, a translucent five-item bottom bar (safe-area aware) and horizontally scrolling pill sub-nav with a right-edge fade. Breakpoints: 640px, 768px, 1024px.

## Elevation & Depth

Flat. Depth comes from the step between white ground and soft gray surface, from inverting whole regions, and from hairline dividers inside lists. No card, popover or button carries a shadow. The only material effect is the translucent chrome on the sticky header, tournament tab bar and bottom bar (85% white, 16px blur, saturate 170%), which falls back to opaque white under `prefers-reduced-transparency`.

### Named Rules
**The Fill Is The Edge Rule.** Surfaces separate by fill, never by outline or shadow: a soft gray card on white has a transparent border, always. Hairlines are for dividing rows inside a surface. Groups of stats share one rounded surface split by 1px white gaps rather than becoming a wall of floating cards.

## Shapes

Soft and friendly. Base radius is 16px. Cards, stat groups, empty states and the hero live card use the largest corner (35.2px); inputs and textareas use 22.4px; buttons, the hero search, sub-nav pills, status dots, slot bars, counters and avatars are fully round. Rows with hover areas and sidebar items use 12.8px; the demo badge uses 9.6px. Tournament cover images bleed to the card's top edge.

## Components

### Buttons
Friendly and confident: solid pills, no shadows, medium-to-semibold text.
- **Shape:** full pill; heights 36px default and 44px large, 48–52px for landing and banner CTAs.
- **Primary:** blue fill, white semibold text; hover deepens to pressed blue; press nudges down 1px.
- **On a blue field:** the primary action inverts to a white pill with blue text, full width in the banner action column.
- **Ink:** the hero search submit is a black pill beside the white search.
- **Secondary / Outline / Ghost:** quiet fill, white with a hairline, or transparent, all with ink text; outline and ghost hover to quiet fill, secondary darkens 5% toward ink. On a field, outline uses a 40% white stroke and ghost hovers to 10% white.
- **Focus:** 3px ring in blue at 45% (white at 60% on a field); disabled at 50% opacity.

### Status and registration badges
- **Status:** a 6px dot in the current ink plus the label, 12px semibold. Open registration is blue, closed is amber, live is ink words with a pulsing blue dot, finished and draft are muted, cancelled is struck through. No background box.
- **Registration:** text only, in green, amber, red or muted.
- **Demo:** a small 10px "Demo" tag on quiet fill; every demo record carries it.

### Cards / Containers
- **Corner Style:** 35.2px.
- **Background:** soft gray on the white ground; the hero live card is white on the blue field.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** none; dividers inside use the hairline. On hover a tournament card's title turns blue.
- **Internal Padding:** 20px.

### Inputs / Fields
- **Style:** white field, 1px input line, 22.4px corners, 44px tall, 14px side padding, muted placeholder. The hero search is a 52px white pill with a magnifier inset at 16px.
- **Focus:** stroke turns blue with a 3px blue ring at 45% (white at 60% on the blue field); caret is blue.
- **Error:** destructive stroke with a 3px ring at 20%.

### Navigation
- **Header:** sticky, 56px, translucent white with a bottom hairline; links 14px muted ink turning ink on hover and when current; primary "Criar conta" pill on the right.
- **Sidebar:** 240px, label-caps group headings, items 14px with a 16px icon; the active item gets a faint blue fill and a blue icon.
- **Bottom bar (mobile):** five items, 20px icons over 11px labels, active item in blue ink.
- **Sub-nav (mobile):** scrolling pills, active pill blue with white text, others quiet fill.
- **Footer:** footer-black field, label-caps column headings, links at 80% white turning white with underline.

### Slot Bar (signature)
A 6px round track in quiet fill with a blue fill for taken slots, turning ink when full, and the count printed beside it ("**9**/24 squads", taken count in semibold ink). It appears on every tournament card and live list row.

### Ranked List (signature)
A title over a 1px ink rule, then hairline-divided rows: a 48px lead column (rank in the heading face, rank 1 in blue; or a date as day over a small month), a semibold title with a muted subtitle, and a tabular tail value. Rows press and hover to quiet fill.

### Stat Group
One 35.2px rounded surface with 1px white gaps between soft gray tiles; label 12px muted, value in the heading face at 1.5rem, tabular.

### Avatar
Always a circle; image cover or initials in the heading face on quiet fill. Sizes 28 / 36 / 56 / 80px.

### Motion
- **Press:** rows, cards and list items scale to 0.985 on pointer-down (60ms), returning over 160ms on a soft ease-out.
- **Settle:** hero content fades up 10px over 520ms once on load, the live card delayed 140ms.
- Reduced motion collapses all animation and transition to near zero.

## Do's and Don'ts

### Do:
- **Do** give blue whole full-bleed regions (hero, tournament banner, champions band) with white type on them, using the inverted-field scope.
- **Do** make cards soft gray fills with no border and the largest corner; keep the live card on a blue field white.
- **Do** make buttons, search fields, filters and avatars fully round.
- **Do** close long pages with a black field followed by the deeper black footer.
- **Do** show status as a 6px dot plus words; use blue for live and open, never red for live.
- **Do** set headings in Figtree 700 with -0.025em tracking, sentence case, and tabular figures for numbers.
- **Do** make every list row and card press (scale 0.985) on pointer-down.
- **Do** label every demo record with the Demo tag.

### Don't:
- **Don't** scatter blue as decorative tints, washes or accents; it is a field, an action or link ink.
- **Don't** outline a soft gray card or give it a shadow; the fill is the edge.
- **Don't** use gradients, glows, grid textures, tilted elements or hollow or outlined type.
- **Don't** put status in a coloured box or chip, or use green, amber or red as a fill.
- **Don't** set headings in all caps or bring in a second display family.
- **Don't** place decorative icons beside facts; facts are joined with middots. Icons belong to navigation, actions and the official-organizer mark.
- **Don't** introduce a dark canvas with neon accents; the ground is white.
- **Don't** put a small uppercase label above a headline.
