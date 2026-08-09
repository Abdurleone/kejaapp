---
name: KejaApp
description: A location-first rental discovery and move-coordination platform for Kenya.
colors:
  primary: "#003d00"
  secondary: "#ce1126"
  tertiary: "#a86416"
  neutral-bg: "#f7f7f6"
  neutral-surface: "#ffffff"
  neutral-surface-soft: "#eef0ee"
  neutral-ink: "#000000"
  neutral-muted: "#5c5c59"
  neutral-line: "#dcdcda"
typography:
  display:
    fontFamily: "Calibri, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "clamp(2.35rem, 5.2vw, 4.6rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "normal"
  headline:
    fontFamily: "Calibri, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "clamp(1.55rem, 3vw, 2.35rem)"
    fontWeight: 700
    lineHeight: 1.15
  body:
    fontFamily: "Calibri, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Calibri, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.82rem"
    fontWeight: 800
    lineHeight: 1.1
rounded:
  sm: "6px"
  md: "8px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "18px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
    height: "38px"
  button-secondary:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
    height: "38px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
  button-danger:
    backgroundColor: "{colors.secondary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
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
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "0 5px"
    height: "18px"
---

# Design System: KejaApp

## Overview

**Creative North Star: "The County Registry"**

KejaApp's current, shipped visual system reads like a well-run civic registry office, not a marketplace app performing trust — plain type, the Kenyan flag's own palette carried at low saturation, small radii, and almost no decoration beyond what a state changes (a border tint on a warning, a color shift on a status pill). Nothing asks to be noticed for its own sake; the design gets out of the way of the actual task, which fits a product whose whole legal positioning is staying out of the tenancy and the money entirely. Depth is rare and earned — panels sit flat until a property card is actually interactive under a cursor, and only then does it lift.

There is no confirmed anti-reference on file; "flashy fintech/marketplace" was considered as a naming point during this document's own drafting but was not adopted as a stated rejection, so treat it as absent rather than binding.

**Key Characteristics:**
- Flag-derived palette (black, white, red, dark green) at restrained saturation, applied as accent, not wallpaper — plus one non-flag warning amber.
- One typographic voice for the whole system — no separate display face; hierarchy comes from size and weight alone.
- Small, consistent radii (6–8px); a single 999px pill for counts and status only.
- Flat by default; shadow appears only as a response to hover/interaction, never as ambient decoration.
- Heavily bold (700–900 weight) labels on buttons and badges, ordinary weight everywhere else — the boldness carries emphasis instead of color or size.

**Named Rule (system boundary): The Scoped-World Rule.** As of this writing, one surface — the signed-out landing page (`frontend/src/pages/LandingPage.jsx`) and its splash header (`.app-header--splash`) — deliberately runs a second, unrelated visual world instead of The County Registry: a "matatu poster" identity (bold sign-painted color, an illustrated skyline, sticker badges), user-commissioned and pinned across several iterations. It is documented on its own further down in each section below, clearly marked, rather than folded into the global tokens above — the frontmatter's `colors`/`typography` stay County Registry, since that's still what every other route in the app actually renders. A surface may earn its own world this way, but only by explicit commission, never by a builder's default; nothing here authorizes extending the matatu-poster identity to any other page without the same kind of deliberate decision.

## Colors

The palette is the Kenyan flag (green / red / black / white) desaturated just enough to sit in an interface instead of a banner, plus one warning amber. Every color name below is the light-mode value; dark mode (`data-color-mode="dark"`) substitutes a lightened tint of the same hue rather than inverting it — noted per color.

### Primary
- **Registry Green** (`#003d00`): the one recurring brand color — primary buttons, active tab state, focus-ring tint, links. Dark mode lightens it to `#4caf50` for legibility against a near-black surface; the deep value stays reserved for light mode only.

### Secondary
- **Flag Red** (`#ce1126`): destructive actions (danger button), the notification-count badge, and the "banned" status pill. Dark mode lightens to `#f2777a`.

### Tertiary
- **Notice Amber** (`#a86416`): warning-only — the "suspended" status pill and a notice-panel's border tint. Never used as a primary call-to-action color. Dark mode lightens to `#e0a640`.

### Neutral
- **Paper** (`#f7f7f6`): page background. Dark mode: `#121212`.
- **Registry White** (`#ffffff`): card/panel/header surface. Dark mode: `#1c1c1c`.
- **Soft Fill** (`#eef0ee`): subtler recessed fill (e.g. an empty property-photo placeholder). Dark mode: `#242424`.
- **Ink** (`#000000`): primary text — literal black, not a softened near-black. Dark mode: `#f2f2f2`.
- **Muted** (`#5c5c59`): secondary text, captions. Dark mode: `#a8a8a5`.
- **Line** (`#dcdcda`): borders and dividers. Dark mode: `#3a3a38`.

### Named Rules
**The Accent-on-State Rule.** Green, red, and amber only ever appear attached to a specific state or action (primary button, danger button, suspended/banned status, a notice border) — never as a decorative fill, gradient, or background wash. If a new surface wants color where nothing is happening, that's a deviation from the incumbent system, not an extension of it.

**The Unused Teal.** `--teal` (`#1f6d72` light / `#4fb3bf` dark) is declared in `frontend/styles.css`'s token block but is not referenced anywhere in the stylesheet today — a real, dormant token, not a fabricated one. Treat it as unclaimed rather than as an established fourth accent; wire it up deliberately or remove it, don't assume it already means something.

### A confirmed cross-platform drift (read before touching either platform)
Web and mobile define what's conceptually "the same" brand color with **different literal hex values** today — this is an actual, unresolved inconsistency in the shipped code, not a documentation simplification:

| Role | Web (`frontend/styles.css`) | Mobile (`mobile/src/theme/colors.js`) |
|---|---|---|
| Primary green (light) | `#003d00` | `#033f21` |
| Primary green (dark-mode accent text) | `#4caf50` | `#4caf50` (matches) |
| Red | `#ce1126` | `#bb0a1e` |
| Red (dark mode) | `#f2777a` (lightened) | `#bb0a1e` (unchanged — mobile does not lighten red for dark mode) |
| Ink (light) | `#000000` | `#141414` |
| Surface-soft (light) | `#eef0ee` | `#f1f1ef` |

This document's frontmatter uses the **web** values as canonical, since web's token set is the more complete one (it alone defines amber, teal, shadow, and radius roles). Reconciling mobile to match — or deciding mobile's slightly softer values are the intended target instead — is an open decision, not resolved by this document.

### Landing page exception: the "matatu poster" palette

Scoped to `.app-shell`'s `--mp-*` custom properties (read by `.app-header--splash` and `.landing-page` only) — not part of the frontmatter above, and not used anywhere else in the app.

- **Paper** (`#f6ecd2` light-page-mode / `#100d09` dark-page-mode): the surface itself, not an accent — sign-painted poster stock rather than a neutral background.
- **Registry-adjacent ink, red, gold, green** (`#17130d`/`#f3ead2`, `#d21023`/`#ff3b4e`, `#f0a500`/`#ffc93c`, `#054a2b`/`#2fbf71`, light-mode/dark-mode pairs): the same flag family as the global system, pushed bolder and paired with thick strokes and hard offset drop-shadows the rest of the app never uses.
- **Flip-mode band tokens** (`--mp-band`/`--mp-band-card`/`--mp-band-ink`/`--mp-band-accent`/`--mp-band-accent2`): the testimonials card's colors are the *inverse* of the page's own mode by design — a dark card on the light page, a light card on the dark page — rather than matching or staying fixed. The accent pair differs by direction (gold/red on the dark card, red/green on the light card), not just inverted, because gold-on-cream measures ~1.8:1 contrast (fails WCAG AA); red and green were substituted for the light-card direction specifically for that reason, confirmed at ~4.7:1 and ~8.8:1.

## Typography

**Display Font:** Calibri, Inter, ui-sans-serif, system-ui (with platform fallbacks)
**Body Font:** the same stack — there is no second, distinct display face.

**Character:** One voice for the entire system; hierarchy is built from size and weight, not a font pairing. Note honestly: `Calibri` leads the stack but isn't a real cross-platform web font outside Windows/Office contexts, so in practice almost every visitor actually renders `Inter` or the OS default sans — this reads as an unexamined leftover rather than a deliberate choice, worth a maintainer's attention rather than treating `Calibri`'s presence as meaningful.

Mobile currently has **no typography tokens at all** — no custom font is loaded, and every screen renders in the OS system font (San Francisco on iOS, Roboto on Android) with only `fontWeight` varied inline per component. This is a real gap relative to web's (admittedly thin) type system, not a deliberate native-platform choice recorded anywhere.

### Hierarchy
- **Display** — no longer applies to the landing page (see the exception below); nothing else in the app currently uses a Display role, since only the landing hero ever did.
- **Headline** (700, `clamp(1.55rem, 3vw, 2.35rem)`, 1.15): page-level titles (`.view-header h2`) — Discover, Workspace, Admin, etc.
- **Body** (400, `1rem`/16px, 1.5): the default for everything else; no explicit override exists, it's the browser/RN default.
- **Label** (800–900, `0.7–0.95rem`, 1.1): button text, tab labels, status pills, badge counts. Deliberately much bolder than body weight — boldness itself is the emphasis mechanism used throughout, not color or size.

### Named Rules
**The Shout-Don't-Grow Rule.** Interactive labels (buttons, tabs, badges) get heavy weight (800–900), not larger size, to stand out from body text. A new component that wants emphasis should reach for weight before reaching for a bigger font-size.

### Landing page exception: Bungee + Work Sans

Self-hosted as local `.woff2` files under `frontend/assets/fonts/` — deliberately **not** loaded from the Google Fonts CDN, since that would leak every visitor's IP to a third party on page load, which would sit oddly next to this app's own data-protection documentation.

- **Display** (Bungee, 400 — the family has no weight axis, uppercase text-transform carries the emphasis instead — `clamp(2.4rem, 5.6vw, 4.1rem)`, 0.98 line-height): the hero headline (`.landing-copy h2`) only. Drops to a smaller clamp floor under ~600px; the family and treatment stay the same.
- **Body** (Work Sans, 400–800 variable): everything else on the landing page and splash header — proof badges, the CTA, the showcase panel, the testimonials card. Replaces the global Calibri/Inter stack on this surface only.

## Layout

No CSS grid framework or breakpoint token set — layout is hand-built per view with CSS Grid/Flexbox and a single shared container constraint: `--content: 1180px` (`width: min(var(--content), calc(100% - 32px))`). No formal spacing scale is declared (`--spacing-*` custom properties don't exist); observed gap/padding values cluster loosely around 6/8/10/12/14/16/18/20px, chosen per component rather than drawn from a documented scale — the `spacing` tokens in this file's frontmatter (`xs`/`sm`/`md`/`lg`) are the most-repeated of those values, named for convenience, not a scale the codebase itself declares. Responsive behavior is per-component (`clamp()` on hero type, a landing-page header padding fix at narrow widths) rather than a shared breakpoint system.

## Elevation & Depth

Flat by default. Two shadow tokens exist and both are used sparingly: a resting shadow on panels/cards, and a stronger one only on `.property-card:hover`. Nothing else in the system uses a shadow at rest.

### Shadow Vocabulary
- **Resting** (`box-shadow: 0 16px 36px rgba(10, 10, 10, 0.08)`, `--shadow`): the default for every `.panel`/`.property-card`. Dark mode: `0 16px 36px rgba(0, 0, 0, 0.26)`.
- **Lifted** (`box-shadow: 0 22px 54px rgba(10, 10, 10, 0.14)`, `--shadow-strong`): `.property-card:hover` only. Dark mode: `0 24px 60px rgba(0, 0, 0, 0.36)`.

### Named Rules
**The Earned-Shadow Rule.** A stronger shadow is a response to interaction (hover), never an ambient decoration applied at rest. If a new component wants to look "important," reach for weight or the accent color first — reaching for a bigger shadow instead is a deviation.

## Shapes

Two radii cover nearly everything: `6px` (`--radius-sm`, buttons/inputs/tabs) and `8px` (`--radius`, panels/cards). A `999px` pill shows up twice (the notification-count badge, and implicitly wherever a fully-round shape is wanted) but is written as a literal, not a token — there is no `--radius-pill` custom property in the source today. Borders are `1px solid var(--line)` almost everywhere depth isn't conveyed by a shadow instead.

## Components

### Buttons
- **Shape:** 6px radius, 38px minimum height, 1px border (transparent unless secondary).
- **Primary:** Registry Green background, white text, 800-weight label, `8px 12px` padding.
- **Secondary:** white/surface background, `--line`-colored border, ink text.
- **Danger:** Flag Red background, white text — same shape as primary.
- **Text/Ghost:** transparent background, Registry Green text, no border.
- **Hover:** every variant lifts `translateY(-1px)` — the only hover treatment buttons get; no color shift, no shadow change.

### Chips / Pills
- **Status pill:** text-only color change (amber for suspended, red for banned) — no background fill, no border.
- **Tab (active):** the one place a "chip" gets a solid fill — Registry Green background, white text, otherwise transparent with muted text.
- **Badge count:** the only fully round (999px) shape in the system — small, red-filled, white text, reserved for a numeric count only.

### Cards / Containers
- **Corner Style:** 8px radius.
- **Background:** Registry White surface.
- **Shadow Strategy:** resting shadow at rest; `.property-card` alone lifts to the stronger shadow on hover, plus a `2px` green ring when explicitly highlighted (`.property-card--highlighted`).
- **Border:** 1px, `--line`.
- **Internal Padding:** 18px.

### Inputs / Fields
- **Style:** white background, `--line` border, 6px radius, 40px minimum height.
- **Focus:** a 3px outline in a 22%-opacity tint of Registry Green, plus the border switching to solid green — both together, not one or the other.

### Navigation
- **Style:** a sticky header with a translucent, blurred surface (`backdrop-filter: blur(14px)` over a semi-transparent surface color) rather than a solid fill — the one place in the system that reaches for a material effect instead of a flat color. Tabs sit inline, transparent at rest, filled green when active.
- **Splash variant** (`.app-header--splash`, signed-out landing only): opts out of the blur entirely for a flat paper-cream fill, a circular (not squared) logo badge with a thick stroke, and a two-tone `Keja`/`App` wordmark (red on the second half) — part of the landing page's own world below, not the general Navigation style. Nested on one row at every width, including mobile, unlike the general header (which still stacks below ~1180px, since its `UserMenu` label can run longer).

### Landing page exception: matatu-poster components

Real components in the shipped page, not concept mockup approximations:

- **Sticker badge** (`.landing-sticker`, e.g. "Karibu Nyumbani"): a tilted (-3deg), thick-stroked, gold pill sitting above the headline — a physical decal, not a typographic eyebrow/kicker (the craft floor bans the latter outright; this reads and renders as an object with its own shape, fill, border, and shadow, the same device as the trust badges below it, not a quiet pre-headline label).
- **Illustrated skyline** (`.landing-skyline`, inline SVG): buildings, a sun, and a matatu bus with its own "KEJA" placard — positioned behind the showcase panel, hidden below ~1180px where there's no clean spot for it. Outline color follows `--mp-stroke` via a shared `.mp-outline` class (gold at night); building/bus fill colors stay fixed regardless of mode, since they depict actual materials, not a state.
- **Flip-mode testimonials card** (`.landing-testimonials`): half-width (capped at 620px, sits under the hero copy column, not full-bleed), and inverts relative to the page's own mode — dark card on the light page, light card on the dark page — via its own `--mp-band*` tokens (see the Colors exception above), not the page-wide `--mp-ink`/`--mp-paper` pair. Includes a real empty state ("No shared experiences yet...") rather than either fabricated quotes or disappearing entirely when the API returns none.
- **Hard drop-shadows** (`--mp-shadow-pop`, `6px 6px 0`, zero blur, offset in one direction only): used throughout this surface's buttons/cards/badges. Not a borrowed neobrutalist default — it stands in for a vinyl sticker's own edge shadow / a screen-print's offset registration, real behaviors of the pinned world's actual materials.

## Do's and Don'ts

### Do:
- **Do** reach for weight (700–900) before size or color when a label needs emphasis — that's how the incumbent system already draws attention.
- **Do** keep shadows a response to hover/interaction, never an ambient resting decoration (`--shadow` at rest, `--shadow-strong` only on hover).
- **Do** keep the accent colors (green/red/amber) tied to a specific action or state; don't introduce them as decorative fills or gradients.
- **Do** use the 6px/8px radius pair for nearly everything; reserve 999px for counts and fully-round pills only.

### Don't:
- **Don't** assume web's and mobile's "same" brand colors already match — they currently don't (see the drift table above); reconcile deliberately, don't silently pick one side without noting it.
- **Don't** treat `Calibri` as a meaningful part of the type identity — it's a stale leading fallback most visitors never actually render, not a confirmed brand typeface.
- **Don't** extend the landing page's matatu-poster world (Bungee, `--mp-*` tokens, hard drop-shadows, sticker badges) to any other route without the same kind of deliberate, user-commissioned decision that created it — a second surface reaching for these tokens by default, rather than by a fresh commission, is exactly the drift this document exists to catch.
- **Don't** reuse the gold accent for text on the testimonials card's light-mode state (dark-page/light-card) — it measures ~1.8:1 on cream, well under WCAG AA; that direction of the flip uses red/green instead, deliberately, not gold.
- **Don't** add a spacing/breakpoint token system to only one file — none exists on either platform today; if one gets built, it belongs in both `frontend/styles.css` and `mobile/src/theme/` together, not just one.
