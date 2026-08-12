// Mirrors frontend/styles.css's "matatu poster" base-frame tokens exactly
// (the same Kenyan-flag-derived palette pushed bolder/warmer, applied
// app-wide there since <matatu-poster-base-frame PR>) so mobile and web read
// as the same product in both color modes. Previously mirrored web's older,
// pre-matatu "County Registry" palette instead, and had quietly drifted to
// different literal hex values even from that (docs/project/DESIGN.md's "confirmed
// cross-platform drift" table) - this rewrite closes both gaps at once.
export const lightColors = {
  bg: "#f6ecd2",
  surface: "#fffaec",
  surfaceSoft: "#fff8e6",
  ink: "#17130d",
  // Border/shadow color - distinct from ink so dark mode can swap it to a
  // warm gold glow ("matatu at night") while ink stays a plain light tint.
  // Same reasoning as frontend/styles.css's --stroke token.
  stroke: "#17130d",
  // Computed equivalent of web's color-mix(in srgb, var(--ink) 68%, var(--bg)).
  muted: "#5e584c",
  // RN supports rgba border colors directly, mirroring web's
  // color-mix(in srgb, var(--stroke) 20%, transparent).
  line: "rgba(23, 19, 13, 0.2)",
  // One token for both fill and text use (buttons, active tab, links,
  // prices) - replaces the old greenDark/accentText split, which existed
  // only because the previous dark-mode green wasn't bright enough to
  // double as text; the new dark-mode green is, same as web.
  green: "#054a2b",
  red: "#d21023",
  amber: "#f0a500",
  // Text color for solid green/red fills (buttons, active tab, badges) - a
  // fixed white reads fine in light mode but fails WCAG AA against dark
  // mode's brighter accent tints (white on #2fbf71 is ~2.4:1), so this
  // flips to a dark ink there instead. Same fix web needed for the same
  // reason - see frontend/styles.css's --on-accent token.
  onAccent: "#fffaf0",
  white: "#ffffff",
  // Two-tier radius: panels/cards reach for `radius`, buttons/badges/pills
  // are always fully round (999, used as a literal, not a token).
  radius: 14,
  radiusSm: 8,
  strokeWidth: 2.5,
  strokeWidthSm: 1.5,
  // Hard offset, no blur - the signature "sticker/poster" pop. Android's
  // `elevation` can't reproduce a colored hard-offset shadow the way iOS's
  // `shadowOffset`/`shadowRadius: 0` can, so Android reads as a softened
  // approximation - a known, disclosed platform limitation, not a bug to
  // chase further. Spread onto a card-equivalent container's style array,
  // e.g. `style={[styles.card, colors.shadow]}`.
  shadow: {
    shadowColor: "#17130d",
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  shadowSm: {
    shadowColor: "#17130d",
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  // Registered names from useFonts (App.js) - see src/theme/typography.js
  // for the shared style objects built from these.
  fontDisplay: "Bungee_400Regular",
  fontBody: "WorkSans_400Regular",
  fontBodyBold: "WorkSans_800ExtraBold",
};

// "Matatu at night": the ink-black stroke/shadow convention switches to a
// warm gold glow instead of inverting to plain white-on-black - same
// convention as frontend/styles.css's dark-mode override.
export const darkColors = {
  bg: "#100d09",
  surface: "#1b160f",
  surfaceSoft: "#1f1912",
  ink: "#f3ead2",
  stroke: "#ffc93c",
  muted: "#aaa392",
  line: "rgba(255, 201, 60, 0.2)",
  green: "#2fbf71",
  red: "#ff3b4e",
  amber: "#ffc93c",
  onAccent: "#100d09",
  white: "#ffffff",
  radius: 14,
  radiusSm: 8,
  strokeWidth: 2.5,
  strokeWidthSm: 1.5,
  shadow: {
    shadowColor: "#ffc93c",
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 0,
    elevation: 6,
  },
  shadowSm: {
    shadowColor: "#ffc93c",
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
    elevation: 3,
  },
  fontDisplay: "Bungee_400Regular",
  fontBody: "WorkSans_400Regular",
  fontBodyBold: "WorkSans_800ExtraBold",
};
