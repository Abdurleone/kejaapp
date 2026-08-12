import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { fetchDashboardSummary } from "../api/index.js";
import { useAuth } from "../context/AuthContext.js";
import { useTheme } from "../context/ThemeContext.js";
import ColorModeToggle from "../components/ColorModeToggle.js";
import { displayText } from "../theme/typography.js";
import { icons, screens } from "./tabScreens.js";
import MoreStack from "./MoreStack.js";
import { getPrimaryTabs, getHiddenTabs } from "./roleTabs.js";

const Tab = createBottomTabNavigator();

// Mirrors frontend/src/App.jsx's .brand-block: a circular logo badge (same
// keja-logo.png source web uses) next to a two-tone "Keja"/"App" wordmark
// (App in red) - web shows this in the header on every page; mobile's
// header instead shows each tab's own title everywhere else (its
// screen-level equivalent of web's separate .view-header h2), so this only
// replaces the title on the one screen that's plain "KejaApp" text today.
function BrandTitle({ colors }) {
  return (
    <View style={brandStyles.row}>
      <Image
        source={require("../../assets/keja-logo.png")}
        style={[brandStyles.mark, { borderWidth: colors.strokeWidthSm, borderColor: colors.stroke }, colors.shadowSm]}
      />
      <Text style={[brandStyles.wordmark, { color: colors.ink }]}>
        Keja
        <Text style={{ color: colors.red }}>App</Text>
      </Text>
    </View>
  );
}

const brandStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mark: {
    width: 32,
    height: 32,
    borderRadius: 999,
  },
  wordmark: {
    ...displayText,
    fontSize: 16,
  },
});

export default function MainTabs() {
  const { user, signedIn } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const primaryTabs = getPrimaryTabs(signedIn, user?.role);
  const hiddenTabs = getHiddenTabs(signedIn, user?.role);
  const [unreadCount, setUnreadCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  // The default tab bar sits close enough to the gesture-nav home indicator
  // that it read as "obstructed" once the bar had a solid dark background
  // (on a light background the indicator just blended in). Extra bottom
  // padding on top of the safe-area inset gives clear breathing room, and is
  // shared by both variants below so switching tabs doesn't jump the bar's
  // height.
  const baseTabBarStyle = useMemo(
    () => ({
      height: 56 + insets.bottom + 12,
      paddingTop: 8,
      paddingBottom: insets.bottom + 12,
    }),
    [insets.bottom]
  );

  const refreshUnreadCount = useCallback(async () => {
    try {
      const summary = await fetchDashboardSummary();
      if (mountedRef.current) setUnreadCount(summary.notifications?.unread || 0);
    } catch {
      // Non-fatal: the badge just keeps its last known value until the next refresh.
    }
  }, []);

  useEffect(() => {
    if (!signedIn) {
      // Nothing was started while signed out, so there's nothing to tear
      // down - just reset the badge, not deriving avoidable state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnreadCount(0);
      return undefined;
    }

    refreshUnreadCount();
    // Polling rather than a push mechanism (no websockets in this app) — good enough
    // for a bell badge that only needs to notice new activity within ~30s.
    const intervalId = setInterval(refreshUnreadCount, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [signedIn, refreshUnreadCount]);

  const screenOptions = useCallback(
    ({ route }) => ({
      tabBarActiveTintColor: colors.green,
      tabBarInactiveTintColor: colors.muted,
      tabBarIcon: ({ color, size }) => (
        <Ionicons name={icons[route.name]} size={size} color={color} />
      ),
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.ink,
      headerTitleStyle: { ...displayText, fontSize: 18 },
      headerRight: () => <ColorModeToggle />,
      tabBarStyle: baseTabBarStyle,
    }),
    [colors, baseTabBarStyle]
  );

  return (
    <Tab.Navigator initialRouteName="Dashboard" screenOptions={screenOptions}>
      {primaryTabs.map((name) => (
        <Tab.Screen
          key={name}
          name={name}
          component={screens[name].component}
          options={{
            ...screens[name].options,
            // Mirrors frontend/styles.css's .app-header--splash: the
            // signed-out header is visually identical to every other
            // header (same cream/surface background, same stroke), not a
            // separate treatment - previously overridden to green here to
            // blend into LandingView's old dark-gradient hero, which no
            // longer exists now that LandingView uses the same cream
            // background as every other screen (see docs/project/DESIGN.md's Landing
            // page exception - the bespoke content is the sticker/skyline/
            // testimonials-flip, not a different base chrome color).
            ...(name === "Dashboard" && !signedIn ? { headerTitle: () => <BrandTitle colors={colors} /> } : {}),
          }}
        />
      ))}
      <Tab.Screen
        name="More"
        options={{
          headerShown: false,
          ...(hiddenTabs.includes("Notifications") && unreadCount > 0
            ? { tabBarBadge: unreadCount > 99 ? "99+" : unreadCount }
            : {}),
        }}
      >
        {() => (
          <MoreStack hiddenTabs={hiddenTabs} unreadCount={unreadCount} onOpenNotifications={refreshUnreadCount} />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
