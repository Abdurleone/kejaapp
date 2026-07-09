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
  red: "#bb0a1e",
  white: "#ffffff",
};

// Default export kept as the light palette for any lingering static usage.
export default lightColors;
