// Shared font-family style objects, built from the names registered via
// useFonts (App.js). The one new shared primitive this port introduces -
// everything else about a screen's styles stays per-screen, matching the
// existing (lack of) shared-component pattern rather than a bigger
// architecture change.
//
// displayText is Bungee: reserve it for exactly one heading per screen (the
// page title), the same restraint frontend/styles.css uses - never body
// copy, buttons, or dense/repeated UI text. RN doesn't synthesize bold from
// a single custom font file the way it does for the system font, so bold
// labels need their own registered weight (fontBodyBold / WorkSans_800ExtraBold)
// rather than relying on a fontWeight style prop to work with a custom font.
export const displayText = { fontFamily: "Bungee_400Regular", textTransform: "uppercase" };
export const bodyText = { fontFamily: "WorkSans_400Regular" };
export const boldText = { fontFamily: "WorkSans_800ExtraBold" };
