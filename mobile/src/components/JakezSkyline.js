import Svg, { Circle, G, Polygon, Rect, Text as SvgText } from "react-native-svg";

// Mirrors frontend/src/pages/LandingPage.jsx's inline <svg className="landing-skyline">
// exactly (same viewBox, shapes, coordinates, fill colors) so the mobile
// landing screen carries the same illustrated skyline + matatu bus as web's
// matatu-poster world, not a simplified stand-in.
//
// Building/bus fill colors stay fixed regardless of color mode (they depict
// real materials, not a UI state - same reasoning as web's .mp-outline
// comment). Only the outline stroke follows `stroke` (colors.stroke),
// mirroring web's day/night "matatu at night" gold-glow swap. Web's CSS
// cascades `stroke: var(--stroke)` onto every shape inside .mp-outline,
// including ones with no explicit stroke of their own (the ground band,
// wheel hubs, the JAKEZ lettering) - <G stroke=...> reproduces that same
// inheritance here, since react-native-svg follows the same SVG stroke/fill
// inheritance model.
export default function JakezSkyline({ stroke, size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 400 400" pointerEvents="none">
      <Circle cx="320" cy="90" r="46" fill="#fffaf0" opacity="0.85" />
      <G stroke={stroke} strokeWidth={4} strokeLinejoin="round">
        <Rect x="30" y="150" width="60" height="180" fill="#fff8e6" />
        <Rect x="100" y="110" width="50" height="220" fill="#d21023" />
        <Rect x="160" y="170" width="70" height="160" fill="#f6ecd2" />
        <Rect x="240" y="90" width="55" height="240" fill="#054a2b" />
        <Rect x="305" y="140" width="65" height="190" fill="#fff8e6" />
        <Polygon points="100,110 125,80 150,110" fill="#f0a500" />
        <Rect x="115" y="140" width="18" height="18" fill="#17130d" />
        <Rect x="115" y="175" width="18" height="18" fill="#17130d" />
        <Rect x="115" y="210" width="18" height="18" fill="#17130d" />
        <Rect x="255" y="120" width="20" height="20" fill="#f6ecd2" />
        <Rect x="255" y="160" width="20" height="20" fill="#f6ecd2" />
        <Rect x="255" y="200" width="20" height="20" fill="#f6ecd2" />
      </G>
      <G stroke={stroke}>
        <Rect x="0" y="330" width="400" height="70" fill="#17130d" />
        <Rect x="40" y="290" width="150" height="55" rx="10" fill="#d21023" strokeWidth={4} />
        <Rect x="40" y="290" width="150" height="18" fill="#fff8e6" strokeWidth={4} />
        <Circle cx="70" cy="352" r="16" fill="#17130d" />
        <Circle cx="70" cy="352" r="7" fill="#c7cdd2" />
        <Circle cx="160" cy="352" r="16" fill="#17130d" />
        <Circle cx="160" cy="352" r="7" fill="#c7cdd2" />
        <SvgText x="115" y="316" textAnchor="middle" fontFamily="Bungee_400Regular" fontSize="12" fill="#fff8e6">
          JAKEZ
        </SvgText>
      </G>
    </Svg>
  );
}
