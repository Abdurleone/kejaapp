import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { fetchPublicTestimonials } from "../../api/index.js";
import { formatStatusLabel } from "../../utils/format.js";
import { useTheme } from "../../context/ThemeContext.js";
import { bodyText, boldText, displayText } from "../../theme/typography.js";
import { openLegalPage } from "../../utils/webLinks.js";
import JakezSkyline from "../../components/JakezSkyline.js";

const proofPoints = [
  { label: "Trusted listings", rotate: "-2deg" },
  { label: "Quick inquiries", rotate: "1.5deg" },
  { label: "Secure dashboard", rotate: "-1deg" },
];

const showcase = [
  {
    title: "Browse curated properties",
    body: "See the latest listings from agencies, owners and trusted landlords.",
  },
  {
    title: "Save favorites",
    body: "Keep your top rentals visible while you compare pricing and amenities.",
  },
  {
    title: "Stay in control",
    body: "Access the workspace view for saved properties and booking updates.",
  },
];

// The testimonials card is the one deliberate exception to the base frame:
// it always shows the OPPOSITE of whatever the page's current mode is - a
// dark card on the light page, a light card on the dark page - mirroring
// frontend/styles.css's .landing-testimonials/[data-color-mode="dark"]
// .landing-testimonials pair exactly, including which hue swaps for which
// (gold-on-cream measures ~1.8:1, under WCAG AA, so the light-band state
// substitutes red/green instead of literally inverting the same two hues).
const darkBand = { bg: "#17130d", card: "#1f1912", ink: "#f3ead2", accent: "#ffc93c", accent2: "#ff3b4e" };
const lightBand = { bg: "#f6ecd2", card: "#fffaec", ink: "#17130d", accent: "#d21023", accent2: "#054a2b" };

// Mirrors frontend/src/pages/LandingPage.jsx - the actual current
// matatu-poster landing page (sign-painted cream world, sticker badge,
// illustrated skyline, thick strokes, hard shadows) - not the app's own
// pre-matatu "gradient hero" treatment this screen used to carry. See
// docs/project/DESIGN.md's Landing page exception section: this bespoke content is
// scoped to this one screen, same as web scopes it to .landing-page alone.
export default function LandingView() {
  const navigation = useNavigation();
  const { colors, resolvedColorMode } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const styles = createStyles(colors);
  const [testimonials, setTestimonials] = useState([]);
  const scrollRef = useRef(null);
  const showcaseY = useRef(0);
  const band = resolvedColorMode === "dark" ? lightBand : darkBand;
  const skylineSize = Math.min(windowWidth * 0.52, 260);

  useEffect(() => {
    let active = true;

    fetchPublicTestimonials()
      .then((data) => {
        if (active) setTestimonials(data);
      })
      .catch(() => {
        // Fail-soft: a marketing screen shouldn't show an error state to
        // signed-out visitors - stays at [], which renders the same empty
        // state as a genuinely-empty response (matches web; it can't tell
        // the two apart either, since it never sets an error state here).
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.page}>
      <View style={styles.hero}>
        <View style={styles.stickerWrap}>
          <Text style={styles.stickerText}>Karibu Nyumbani</Text>
        </View>
        <Text style={styles.headline}>Find the right home in Nairobi and beyond.</Text>
        <Text style={styles.subtext}>
          JakezApp helps you discover verified rentals, save favorites, and manage requests from
          one clean workspace.
        </Text>

        <View style={styles.actionsRow}>
          <Pressable style={styles.cta} onPress={() => navigation.navigate("Discover")}>
            <Text style={styles.ctaLabel}>Start searching</Text>
          </Pressable>
          <Pressable
            hitSlop={8}
            onPress={() => scrollRef.current?.scrollTo({ y: showcaseY.current, animated: true })}
          >
            <Text style={styles.ghostLink}>See how it works</Text>
          </Pressable>
        </View>

        <View style={styles.proofRow}>
          {proofPoints.map((point) => (
            <View key={point.label} style={[styles.proofPill, { transform: [{ rotate: point.rotate }] }]}>
              <Text style={styles.proofPillText}>{point.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View
        style={styles.showcase}
        onLayout={(event) => {
          showcaseY.current = event.nativeEvent.layout.y;
        }}
      >
        {showcase.map((item) => (
          <View key={item.title} style={styles.showcaseItem}>
            <Text style={styles.showcaseTitle}>{item.title}</Text>
            <Text style={styles.showcaseBody}>{item.body}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.testimonials, { backgroundColor: band.bg }]}>
        <Text style={[styles.testimonialsTitle, { color: band.accent }]}>What our users say</Text>
        {testimonials.length > 0 ? (
          testimonials.map((item) => (
            <View
              key={item._id}
              style={[styles.testimonialCard, { borderColor: band.accent, backgroundColor: band.card }]}
            >
              <Text style={[styles.testimonialMessage, { color: band.ink }]}>{item.message}</Text>
              <Text style={[styles.testimonialCite, { color: band.accent2 }]}>
                — {item.submitter?.name || "JakezApp user"}
                {item.submitter?.role ? `, ${formatStatusLabel(item.submitter.role)}` : ""}
              </Text>
            </View>
          ))
        ) : (
          <Text style={[styles.testimonialsEmpty, { color: band.ink, borderColor: band.accent }]}>
            No shared experiences yet — real tenant, landlord, agency, and mover stories will show
            up here as they come in.
          </Text>
        )}
      </View>

      <View style={styles.skylineWrap} pointerEvents="none">
        <JakezSkyline stroke={colors.stroke} size={skylineSize} />
      </View>

      <View style={styles.footer}>
        <Pressable onPress={() => openLegalPage("/privacy")} hitSlop={8}>
          <Text style={styles.footerLink}>Privacy</Text>
        </Pressable>
        <Pressable onPress={() => openLegalPage("/terms")} hitSlop={8}>
          <Text style={styles.footerLink}>Terms</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  page: {
    padding: 24,
    paddingBottom: 40,
    gap: 24,
  },
  hero: {
    gap: 14,
  },
  stickerWrap: {
    alignSelf: "flex-start",
    backgroundColor: colors.amber,
    borderWidth: colors.strokeWidth,
    borderColor: colors.stroke,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
    transform: [{ rotate: "-3deg" }],
    ...colors.shadowSm,
  },
  stickerText: {
    ...boldText,
    fontSize: 11,
    color: colors.ink,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headline: {
    ...displayText,
    fontSize: 32,
    color: colors.ink,
    lineHeight: 36,
  },
  subtext: {
    ...bodyText,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
  },
  cta: {
    alignSelf: "flex-start",
    backgroundColor: colors.red,
    borderWidth: colors.strokeWidth,
    borderColor: colors.stroke,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 26,
    ...colors.shadow,
  },
  ctaLabel: {
    ...boldText,
    color: colors.onAccent,
    fontSize: 15,
  },
  ghostLink: {
    ...boldText,
    fontSize: 14,
    color: colors.ink,
    textDecorationLine: "underline",
    textDecorationColor: colors.amber,
  },
  proofRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  proofPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: colors.strokeWidth,
    borderColor: colors.stroke,
    backgroundColor: colors.surfaceSoft,
    ...colors.shadowSm,
  },
  proofPillText: {
    ...boldText,
    fontSize: 11,
    color: colors.ink,
    textTransform: "uppercase",
  },
  showcase: {
    gap: 12,
    padding: 14,
    borderRadius: colors.radius,
    borderWidth: colors.strokeWidth,
    borderColor: colors.stroke,
    backgroundColor: colors.surfaceSoft,
    ...colors.shadow,
  },
  showcaseItem: {
    gap: 4,
    padding: 12,
    borderRadius: colors.radiusSm,
    borderWidth: colors.strokeWidthSm,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  showcaseTitle: {
    ...boldText,
    fontSize: 15,
    color: colors.ink,
  },
  showcaseBody: {
    ...bodyText,
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
  testimonials: {
    gap: 14,
    padding: 20,
    borderRadius: colors.radius,
  },
  testimonialsTitle: {
    ...displayText,
    fontSize: 17,
  },
  testimonialCard: {
    padding: 14,
    borderRadius: colors.radiusSm,
    borderWidth: colors.strokeWidth,
    gap: 8,
  },
  testimonialMessage: {
    ...bodyText,
    fontSize: 14,
    lineHeight: 20,
  },
  testimonialCite: {
    ...boldText,
    fontSize: 11,
    textTransform: "uppercase",
  },
  testimonialsEmpty: {
    ...bodyText,
    fontSize: 14,
    lineHeight: 20,
    padding: 14,
    borderRadius: colors.radiusSm,
    borderWidth: colors.strokeWidthSm,
    borderStyle: "dashed",
  },
  skylineWrap: {
    alignItems: "flex-end",
    opacity: 0.9,
  },
  footer: {
    flexDirection: "row",
    gap: 20,
    paddingTop: 16,
    borderTopWidth: colors.strokeWidth,
    borderTopColor: colors.stroke,
  },
  footerLink: {
    ...boldText,
    fontSize: 13,
    color: colors.ink,
  },
  });
