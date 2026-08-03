import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { fetchPublicTestimonials } from "../../api/index.js";
import { formatStatusLabel } from "../../utils/format.js";
import { useTheme } from "../../context/ThemeContext.js";

const proofPoints = ["Trusted listings", "Quick inquiries", "Secure dashboard"];

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

// Mirrors frontend/src/pages/LandingPage.jsx so signed-out visitors get the
// same pitch on mobile as they do on the web app: one full-page dark gradient
// (with a large centered logo) behind the hero, showcase and testimonials,
// rather than a gradient card sitting on a plain page background.
export default function LandingView() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const styles = createStyles(colors, windowHeight);
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    let active = true;

    fetchPublicTestimonials()
      .then((data) => {
        if (active) setTestimonials(data);
      })
      .catch(() => {
        // Fail-soft: a marketing screen shouldn't show an error state to signed-out visitors.
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.page}>
      <LinearGradient
        colors={[colors.greenDark, "#0d2318", "#060b08"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.hero}>
        <View style={styles.logoWrap}>
          <Image
            // icon.png is the same artwork as keja-logo.png at 1024x1024
            // instead of 128x128 - needed here since the watermark renders
            // much larger than the source logo file, which blurred badly
            // when upscaled 8x.
            source={require("../../../assets/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* A normal (non-absolute) flow child starting at the same top edge
            as logoWrap below, so the copy is guaranteed to sit embedded on
            top of the watermark's band instead of stacking below it - and
            hero's height still grows naturally to fit all the copy, so
            nothing overflows into the showcase section underneath. */}
        <Text style={styles.headline}>Find the right home in Nairobi and beyond.</Text>
        <Text style={styles.subtext}>
          KejaApp helps you discover verified rentals, save favorites, and manage requests from
          one clean workspace.
        </Text>

        <View style={styles.proofRow}>
          {proofPoints.map((point) => (
            <View key={point} style={styles.proofPill}>
              <Text style={styles.proofPillText}>{point}</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.cta} onPress={() => navigation.navigate("Discover")}>
          <Text style={styles.ctaLabel}>Start searching</Text>
        </Pressable>
      </View>

      <View style={styles.showcase}>
        {showcase.map((item) => (
          <View key={item.title} style={styles.showcaseItem}>
            <Text style={styles.showcaseTitle}>{item.title}</Text>
            <Text style={styles.showcaseBody}>{item.body}</Text>
          </View>
        ))}
      </View>

      {testimonials.length > 0 ? (
        <View style={styles.testimonials}>
          <Text style={styles.testimonialsTitle}>What our users say</Text>
          {testimonials.map((item) => (
            <View key={item._id} style={styles.testimonialCard}>
              <Text style={styles.testimonialMessage}>{item.message}</Text>
              <Text style={styles.testimonialCite}>
                — {item.submitter?.name || "KejaApp user"}
                {item.submitter?.role ? `, ${formatStatusLabel(item.submitter.role)}` : ""}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const createStyles = (colors, windowHeight) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.greenDark,
  },
  page: {
    position: "relative",
    overflow: "hidden",
    minHeight: windowHeight,
    padding: 24,
    paddingBottom: 40,
    gap: 24,
  },
  hero: {
    position: "relative",
    gap: 18,
  },
  logoWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 340,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 340,
    height: 340,
    opacity: 0.22,
  },
  headline: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.white,
    lineHeight: 38,
  },
  subtext: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255, 255, 255, 0.86)",
  },
  proofRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  proofPill: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.28)",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  proofPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.white,
  },
  cta: {
    alignSelf: "flex-start",
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  ctaLabel: {
    // Literal, not colors.ink - this button's background is always white
    // (branding choice against the hero gradient), so its text must stay
    // dark regardless of color mode, unlike colors.ink which flips to
    // near-white in dark mode and would otherwise vanish against it.
    color: "#141414",
    fontWeight: "800",
    fontSize: 15,
  },
  showcase: {
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
    backgroundColor: "rgba(15, 22, 18, 0.54)",
  },
  showcaseItem: {
    gap: 4,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  showcaseTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.white,
  },
  showcaseBody: {
    fontSize: 13,
    lineHeight: 19,
    color: "rgba(255, 255, 255, 0.78)",
  },
  testimonials: {
    gap: 14,
  },
  testimonialsTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.white,
  },
  testimonialCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    gap: 8,
  },
  testimonialMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255, 255, 255, 0.9)",
  },
  testimonialCite: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
  },
  });
