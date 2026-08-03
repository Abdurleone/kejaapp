// Mirrors the Kenyan-flag-derived palette in frontend/styles.css (including
// its light/dark variants) so the mobile app and web app read as the same
// product in both color modes.
export const lightColors = {
  bg: "#f7f7f6",
  surface: "#ffffff",
  surfaceSoft: "#f1f1ef",
  ink: "#141414",
  muted: "#5c5c59",
  line: "#dcdcda",
  greenDark: "#033f21",
  accentText: "#033f21",
  red: "#bb0a1e",
  white: "#ffffff",
};

export const darkColors = {
  bg: "#121212",
  surface: "#1c1c1c",
  surfaceSoft: "#242424",
  ink: "#f2f2f2",
  muted: "#a8a8a5",
  line: "#3a3a38",
  greenDark: "#033f21",
  // Text/icon-only counterpart to greenDark, used wherever it renders
  // directly against a neutral surface (badges, prices, links, tab
  // labels) rather than as a solid brand-green fill (buttons, pills with
  // white text, the landing hero gradient) - those keep the unchanged
  // deep greenDark in both modes. greenDark itself is identical in light
  // and dark (#033f21), so text using it directly was ~1.3:1 against
  // dark surfaces (fails WCAG AA); this matches frontend/styles.css's
  // own dark-mode --green (~6:1 against dark surfaces).
  accentText: "#4caf50",
  red: "#bb0a1e",
  white: "#ffffff",
};
