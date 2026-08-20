---
name: KejaApp
description: A location-first rental discovery and move-coordination platform for Kenya.
colors:
  primary: "#054a2b"
  secondary: "#d21023"
  tertiary: "#f0a500"
  neutral-bg: "#f6ecd2"
  neutral-surface: "#fffaec"
  neutral-surface-soft: "#fff8e6"
  neutral-ink: "#17130d"
  neutral-stroke: "#17130d"
  neutral-line: "#17130d"
typography:
  display:
    fontFamily: "Bungee, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.4rem, 3vw, 2.1rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Bungee, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5.6vw, 4.1rem)"
    fontWeight: 400
    lineHeight: 1
  body:
    fontFamily: "Work Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Work Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 800
    lineHeight: 1.1
  scale:
    label-xs: "0.7rem"
    label-sm: "0.78rem"
    label-md: "0.86rem"
    label-lg: "0.9rem"
    emphasis-sm: "1.05rem"
    emphasis-md: "1.12rem"
    emphasis-lg: "1.25rem"
    icon-glyph: "1.8rem"
rounded:
  sm: "8px"
  md: "14px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "18px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#fffaf0"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
    height: "38px"
  button-secondary:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
    height: "38px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.pill}"
  button-danger:
    backgroundColor: "{colors.secondary}"
    textColor: "#fffaf0"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
    height: "38px"
  input-field:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
    height: "40px"
  card-panel:
    backgroundColor: "{colors.neutral-surface}"
    rounded: "{rounded.md}"
    padding: "18px"
  badge-count:
    backgroundColor: "{colors.secondary}"
    textColor: "#fffaf0"
    rounded: "{rounded.pill}"
    padding: "0 5px"
    height: "18px"
---

# Design System: KejaApp

## Overview

**Creative North Star: "Matatu Poster"**

KejaApp's visual system is a sign-painted, Nairobi-matatu-decoration-inspired identity: a warm, cream "poster stock" ground, the Kenyan flag's own hues pushed bolder and more saturated than a civic form would use, thick ink strokes, and hard offset drop-shadows with zero blur — the look of a screen-printed decal or a hand-painted matatu panel, not a generic SaaS card. Depth reads as a physical object's own edge (a sticker's registration shadow), not an ambient elevation effect. This became the app-wide base frame on 2026-08-09, after originating as a deliberately scoped, user-commissioned exception on the signed-out landing page only (PR #215) — see "Previously: The County Registry" below for what it replaced.

There is no confirmed anti-reference on file; "flashy fintech/marketplace" was considered as a naming point during an earlier draft of this document but was not adopted as a stated rejection, so treat it as absent rather than binding.

**Key Characteristics:**
- Flag-derived palette (black/cream ink and paper, red, green, gold) pushed bold and warm, applied as accent *and* as the ground itself — not restrained to a low-saturation civic tint.
- Two typographic voices: Bungee (display, uppercase, no weight axis) for major/page-level headings only; Work Sans (body, variable weight) for everything else. Bungee is used with restraint — one heading per view, never body copy, table cells, or dense UI text.
- A two-tier shape language: `8px`/`14px` radii for panels/cards/inputs/tables (judged so an oversized radius doesn't crowd dense content), full `999px` pills for buttons/badges/tabs.
- Hard offset drop-shadows (zero blur) as the default depth vocabulary, graduated by density: a smaller `3px 3px 0` pop for repeated-per-screen elements (cards, chrome, inputs), a larger `6px 6px 0` pop for one-per-screen/elevated moments (panels, modals, hover lift).
- Thick strokes (`1.5–2.5px`, not a plain 1px hairline) as borders throughout, colored by a dedicated `--stroke` token distinct from `--ink` (see "Matatu at night" below).
- Heavily bold (700–900 weight) labels on buttons and badges — boldness still carries emphasis, same principle the prior system used, just inside a bolder overall register.

**Matatu at night.** Dark mode isn't a plain color inversion: the `--stroke` token (borders, hard-shadow color) switches to a warm gold glow (`#ffc93c`) rather than a lightened ink, while `--ink` (text) becomes a plain cream tint. This is why stroke and ink are separate tokens, not one — a single "foreground" token couldn't carry both behaviors at once.

**Named Rule (system boundary): The Scoped-World Rule.** A surface may run a *second*, unrelated visual world instead of the base frame only by explicit commission, never by a builder's default. As of this writing, one thing still earns that exception: the landing page's bespoke *content* — the illustrated skyline, the sticker badge, and the testimonials card's flip-against-mode mechanic (see the Components section below) — not the palette/type/shape, which is now the base frame everywhere. Nothing here authorizes a *third* world on some other surface without the same kind of deliberate, user-commissioned decision.

### Previously: "The County Registry"

From repo inception through PR #215, the shipped system read like a well-run civic registry office: plain type (Calibri/Inter, one voice, no display face), the flag palette at restrained/desaturated saturation, small 6–8px radii, 1px hairline borders, and shadow only as a hover response — nothing asked to be noticed for its own sake. That system is superseded by the matatu-poster identity above; kept here as a historical record of what shipped and why, not as a currently-active alternative.

## Colors

The palette is the Kenyan flag (green / red / black / cream) pushed bold and warm — a sign-painted poster's palette, not a civic form's. Every color name below is the light-mode value; dark mode (`data-color-mode="dark"`) substitutes a distinct tint per the "matatu at night" logic above, noted per color.

### Primary
- **Registry Green** (`#054a2b`): the one recurring brand color — primary buttons, active tab state, focus-ring tint, links. Dark mode: `#2fbf71`.

### Secondary
- **Flag Red** (`#d21023`): destructive actions (danger button), the notification-count badge, and the "banned" status pill. Dark mode: `#ff3b4e`.

### Tertiary
- **Poster Gold** (`#f0a500`): warning-only — the "suspended" status pill and a notice-panel's border tint. Never used as a primary call-to-action color. Dark mode: `#ffc93c` — this is also the dark-mode `--stroke` value (see "Matatu at night" above), so in dark mode the warning color and the universal border/shadow color are the same hue.

### Neutral
- **Paper** (`#f6ecd2`): page background — poster stock, not a neutral gray. Dark mode: `#100d09`.
- **Paper Raised** (`#fffaec`): card/panel/header surface. Dark mode: `#1b160f`.
- **Panel Fill** (`#fff8e6`): subtler recessed fill (e.g. an empty property-photo placeholder). Dark mode: `#1f1912`.
- **Ink** (`#17130d`): primary text. Dark mode: `#f3ead2` (a cream tint, not a lightened black).
- **Stroke** (`#17130d`): borders and hard-shadow color — equals Ink in light mode, but flips to gold (`#ffc93c`) in dark mode rather than tracking Ink. See "Matatu at night."
- **Muted** (`color-mix(in srgb, var(--ink) 68%, var(--bg))`): secondary text, captions — computed from Ink/Paper rather than a separate literal, so it stays in step if either changes.
- **Line** (`color-mix(in srgb, var(--stroke) 20%, transparent)`): soft/thin dividers where the full-strength Stroke border would be too heavy (table rows, nested fieldsets).

### Named Rules
**The Accent-on-State Rule.** Green, red, and amber only ever appear attached to a specific state or action (primary button, danger button, suspended/banned status, a notice border) — never as a decorative fill, gradient, or background wash. If a new surface wants color where nothing is happening, that's a deviation from the incumbent system, not an extension of it.

**The Unused Teal.** `--teal` (`#1f6d72` light / `#4fb3bf` dark) is declared in `frontend/styles.css`'s token block but is not referenced anywhere in the stylesheet today — a real, dormant token, not a fabricated one. Treat it as unclaimed rather than as an established fourth accent; wire it up deliberately or remove it, don't assume it already means something.

### Cross-platform drift — resolved

Web and mobile previously defined "the same" brand color with different literal hex values (primary green, red, ink, surface-soft in light mode). The mobile matatu-poster port reconciled `mobile/src/theme/colors.js` to the exact same values as `frontend/styles.css`'s tokens — this document's frontmatter is canonical for both platforms now, not just web. `colors.green`/`colors.red`/`colors.amber` on mobile are named identically in spirit to web's Registry Green/Flag Red/gold, and `colors.stroke`/`colors.line`/`colors.radius`/`colors.radiusSm`/`colors.strokeWidth`/`colors.strokeWidthSm`/`colors.shadow`/`colors.shadowSm` mirror `--stroke`/`--line`/`--radius`/`--radius-sm`/`--stroke-width`/`--stroke-width-sm`/the Pop shadow pair 1:1. The one deliberate simplification: mobile has no `--teal` equivalent (still unused on web too) and consolidates web's Ink/Stroke distinction the same way web does — Stroke carries borders/shadows, Ink carries text.

## Typography

**Display Font:** Bungee (400 — the family has no weight axis; uppercase text-transform carries the emphasis instead).
**Body Font:** Work Sans (100–900 variable). Both self-hosted as local `.woff2` files under `frontend/assets/fonts/` — deliberately **not** loaded from the Google Fonts CDN, since that would leak every visitor's IP to a third party on page load, which would sit oddly next to this app's own data-protection documentation.

**Character:** Two voices, used with restraint — Bungee appears on exactly one heading per view (a page title, the header wordmark, a modal title), never on body copy, table cells, buttons, or any dense/repeated UI text. Work Sans carries everything else. This mirrors exactly how Bungee was used when it was landing-only: one hero heading out of a dozen-plus selectors, not "every heading."

Mobile now loads the same two families via `@expo-google-fonts/bungee` and `@expo-google-fonts/work-sans`, gated behind `expo-splash-screen` so there's no flash of the system font on cold start. Because React Native can't synthesize bold from a single custom TTF the way it does for system fonts, Work Sans is loaded as **two** separately-registered static weights (`WorkSans_400Regular`, `WorkSans_800ExtraBold`) rather than one variable file — `mobile/src/theme/typography.js` exposes these as `bodyText`/`boldText`/`displayText` for screens to spread into their `StyleSheet.create` entries, mirroring web's Body/Label/Headline roles.

### Hierarchy
- **Display** (Bungee, uppercase, `clamp(2rem, 5.6vw, 4.1rem)`, 1.0): the landing hero headline (`.landing-copy h2`) and the testimonials heading (`.landing-testimonials h3`, smaller) — the two places a headline-scale moment exists today.
- **Headline** (Bungee, uppercase, `clamp(1.4rem, 3vw, 2.1rem)`, 1.08): page-level titles (`.view-header h2`) — Discover, Workspace, Admin, etc. — plus the header wordmark (`.brand-block h1`) and the auth modal's title (`.auth-panel-header h2`).
- **Body** (Work Sans, 400, `1rem`/16px, 1.5): the default for everything else; set once on `body`.
- **Label** (Work Sans, 800–900, `0.7–0.95rem`, 1.1): button text, tab labels, status pills, badge counts. Deliberately much bolder than body weight — boldness itself is the emphasis mechanism used throughout, not color or size.

**Observed additional sizes.** A second, regular-weight numeric/heading-emphasis tier sits between Body and Headline — a stat figure, a cost-row total — clustering at `1.05rem`/`1.12rem`/`1.25rem` (`typography.scale.emphasis-*`). The Label role's own `0.7–0.95rem` range is real, not aspirational: `0.7rem`/`0.78rem`/`0.86rem`/`0.9rem` each recur across multiple components (`typography.scale.label-*`), alongside the `0.82rem` point value. One outlier fits neither tier: a `1.8rem` fallback glyph sizes an icon character, not running text (`typography.scale.icon-glyph`).

### Named Rules
**The Shout-Don't-Grow Rule.** Interactive labels (buttons, tabs, badges) get heavy weight (800–900), not larger size, to stand out from body text. A new component that wants emphasis should reach for weight before reaching for a bigger font-size.

**The One-Heading Rule.** Bungee applies to exactly one heading-role element per view — reaching for it on a second heading, a table header, or any body-level text is a deviation, the same restraint the font was introduced under when it was landing-only.

## Layout

No CSS grid framework or breakpoint token set — layout is hand-built per view with CSS Grid/Flexbox and a single shared container constraint: `--content: 1180px` (`width: min(var(--content), calc(100% - 32px))`). No formal spacing scale is declared (`--spacing-*` custom properties don't exist); observed gap/padding values cluster loosely around 6/8/10/12/14/16/18/20px, chosen per component rather than drawn from a documented scale — the `spacing` tokens in this file's frontmatter (`xs`/`sm`/`md`/`lg`) are the most-repeated of those values, named for convenience, not a scale the codebase itself declares. Responsive behavior is per-component (`clamp()` on hero/headline type, a splash-header layout fix at narrow widths) rather than a shared breakpoint system.

## Elevation & Depth

Hard offset drop-shadows, zero blur, by default — the signature "sticker/poster pop," not an ambient soft elevation. Graduated by how many of an element appear per screen.

### Shadow Vocabulary
- **Pop** (`6px 6px 0 var(--stroke)`, `--shadow-pop`, aliased as `--shadow-strong`): one-per-screen/elevated moments — `.panel`, `.auth-panel`, `dialog`, `.property-card:hover`, the landing CTA/showcase.
- **Pop, small** (`3px 3px 0 var(--stroke)`, `--shadow-pop-sm`, aliased as `--shadow`): repeated-per-screen elements — `.property-card` at rest, `.tabs`, badges, the brand mark, proof/sticker badges.
- Dark mode colors both with a warm gold-tinted rgba instead of the plain stroke color, per "Matatu at night."

### Named Rules
**The Graduated-Pop Rule.** Reach for the small pop on anything that repeats many times per screen (a card grid, a table); reach for the full pop only on the one or two elements that are genuinely singular on that screen. Applying full-intensity shadows to every row of a dense table is a deviation — it was extended from the two-tier vocabulary the landing page already established for its own sticker badges vs. showcase panel, not invented fresh.

## Shapes

Two radii: `8px` (`--radius-sm`, inputs/tables/nested chips) and `14px` (`--radius`, panels/cards/the header logo). Buttons, tabs, badges, and pills use a full `999px` (`--rounded.pill` / literal `999px`) — reserved for elements that are already conceptually round, not applied to body chrome where an oversized radius would crowd content. Borders are `var(--stroke-width-sm)` (`1.5px`) or `var(--stroke-width)` (`2.5px`) solid `var(--stroke)` almost everywhere — a deliberate thick-stroke look, not a plain hairline; `var(--line)` (a 20%-tinted, softer version of Stroke) is reserved for internal/dense dividers (table rows, nested fieldsets) where the full-strength stroke would be too heavy.

### Named Rules
**The Two-Tier Radius Rule.** A panel/card/input/table reaches for `8px`/`14px`; a button/badge/tab/pill reaches for `999px`. Nothing in between — a new component picking, say, `20px` on a dense list item is drifting toward the landing page's own bespoke content-level treatment (see Components below) rather than the base frame.

## Components

### Buttons
- **Shape:** `999px` pill radius, 38px minimum height, thin (`1.5px`) stroke border (transparent unless secondary).
- **Primary:** Registry Green background, `--on-accent` text (cream in light mode, near-black in dark mode — see the Named Rule below), 800-weight label.
- **Secondary:** surface background, full-strength `--stroke` border, ink text.
- **Danger:** Flag Red background, `--on-accent` text — same shape as primary.
- **Text/Ghost:** transparent background, ink text (header context) or green text (in-content links), no border.
- **Hover:** every variant lifts `translateY(-1px)` — the only hover treatment buttons get; no color shift, no shadow change.

### Named Rules
**The On-Accent Contrast Rule.** Solid green/red fills never hardcode white or cream text — they read `var(--on-accent)`, which is cream in light mode but a near-black ink in dark mode. This was a real, caught WCAG AA failure: dark mode's brighter accent tints (`#2fbf71` green, `#ff3b4e` red) measure as low as ~2.4:1 against a fixed white/cream, well under the 4.5:1 floor for normal text. Never reintroduce a literal white/cream on a green or red fill without rechecking contrast in both modes.

### Chips / Pills
- **Status pill:** text-only color change (gold for suspended, red for banned) — no background fill, no border.
- **Tab (active):** the one place a "chip" gets a solid fill — Registry Green background, `--on-accent` text, otherwise transparent with muted text.
- **Badge count:** fully round (`999px`), small, red-filled, `--on-accent` text, reserved for a numeric count only.

### Cards / Containers
- **Corner Style:** `14px` radius (`.panel`), `14px` (`.property-card`, same token).
- **Background:** Paper Raised surface.
- **Shadow Strategy:** `.panel` gets the full Pop shadow at rest (a page-level, usually one-or-few-per-screen element); `.property-card` gets the smaller Pop at rest (many per grid) and the full Pop on hover, plus a `2px` green ring when explicitly highlighted (`.property-card--highlighted`) — see the Graduated-Pop Rule above.
- **Border:** `1.5px`, full-strength `--stroke`.
- **Internal Padding:** 18px.

### Inputs / Fields
- **Style:** surface background, `1.5px` `--stroke` border, `8px` radius, 40px minimum height.
- **Focus:** a 3px outline in a 22%-opacity tint of Registry Green, plus the border switching to solid green — both together, not one or the other.

### Navigation
- **Style:** a fixed-position (splash) or sticky (signed-in) header with an opaque Paper background and a thick (`2.5px`) `--stroke` bottom border — no blur/translucency (dropped along with the rest of the pre-matatu system). A circular logo badge with its own thick stroke and small Pop shadow, and a two-tone `Keja`/`App` wordmark (red on the second half) in Bungee. Tabs sit inline, transparent at rest, filled green when active.
- **Splash vs. signed-in:** now visually identical (background, stroke, logo, wordmark, button treatment) — the one remaining difference is `position: fixed` (splash, floats over the landing hero) vs. `position: sticky` (signed-in, scrolls with page content), a layout choice unrelated to theming. The splash header's toggle+Sign-in staying nested on one row at narrow widths (rather than stacking, like the signed-in header's `UserMenu` does) is also unchanged — a genuine content-length difference (two compact actions vs. a variable-length username), not a leftover style override.

### Landing page exception: matatu-poster bespoke content

The base frame above covers palette/type/shape everywhere now. What's still genuinely scoped to the landing page is its *content* — assets and mechanics that would be absurd anywhere else in the app:

- **Sticker badge** (`.landing-sticker`, e.g. "Karibu Nyumbani"): a tilted (-3deg), thick-stroked, gold pill sitting above the headline — a physical decal, not a typographic eyebrow/kicker (the craft floor bans the latter outright; this reads and renders as an object with its own shape, fill, border, and shadow, the same device as the trust badges below it, not a quiet pre-headline label).
- **Illustrated skyline** (`.landing-skyline`, inline SVG): buildings, a sun, and a matatu bus with its own "KEJA" placard — positioned behind the showcase panel, hidden below ~1180px where there's no clean spot for it. Outline color follows `--stroke` via a shared `.mp-outline` class (gold at night, same as the rest of the base frame now); building/bus fill colors stay fixed regardless of mode, since they depict actual materials, not a state.
- **Flip-mode testimonials card** (`.landing-testimonials`): half-width (capped at 620px, sits under the hero copy column, not full-bleed), and inverts relative to the page's own mode — dark card on the light page, light card on the dark page — via its own `--band*` tokens (scoped to `.landing-testimonials`, not the page-wide `--ink`/`--bg` pair). The accent pair differs by direction (gold/red on the dark card, red/green on the light card), not just inverted, because gold-on-cream measures ~1.8:1 contrast (fails WCAG AA); red and green were substituted for the light-card direction specifically for that reason, confirmed at ~4.7:1 and ~8.8:1. Includes a real empty state ("No shared experiences yet...") rather than either fabricated quotes or disappearing entirely when the API returns none.

## Do's and Don'ts

### Do:
- **Do** reach for weight (700–900) before size or color when a label needs emphasis — that's how the system already draws attention.
- **Do** graduate hard-shadow intensity by density: the small Pop for anything repeated per screen, the full Pop for one-per-screen/elevated moments only.
- **Do** keep the accent colors (green/red/gold) tied to a specific action or state; don't introduce them as decorative fills or gradients.
- **Do** use `var(--on-accent)` (never a hardcoded white/cream) for text on solid green/red fills, since it's the only thing that stays WCAG AA in both light and dark mode.
- **Do** use the `8px`/`14px` radius pair for panels/cards/inputs; reserve `999px` for buttons/badges/tabs/pills only.

### Don't:
- **Don't** apply Bungee to more than one heading per view, or to body copy/table cells/dense UI text — that's the same "shout, don't grow" discipline the whole label system already follows, just applied to the display face too.
- **Don't** extend the landing page's remaining bespoke *content* (the sticker-badge artwork, the illustrated skyline, the testimonials flip mechanic) to any other route without the same kind of deliberate, user-commissioned decision that created it — the palette/type/shape are the base frame now, but these three specific assets/mechanics are still a fresh commission away from being reused elsewhere.
- **Don't** reuse the gold accent for text on the testimonials card's light-mode state (dark-page/light-card) — it measures ~1.8:1 on cream, well under WCAG AA; that direction of the flip uses red/green instead, deliberately, not gold.
- **Don't** add a spacing/breakpoint token system to only one file — none exists on either platform today; if one gets built, it belongs in both `frontend/styles.css` and `mobile/src/theme/` together, not just one.
