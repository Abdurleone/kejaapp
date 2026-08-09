import { useCallback, useEffect, useRef, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { fetchDashboardSummary } from "../api/index.js";
import { useAuth } from "../context/AuthContext.js";
import { useTheme } from "../context/ThemeContext.js";
import ColorModeToggle from "../components/ColorModeToggle.js";
import { icons, screens } from "./tabScreens.js";
import MoreStack from "./MoreStack.js";
import LiquidTabBar from "./LiquidTabBar.js";
import { getPrimaryTabs, getHiddenTabs } from "./roleTabs.js";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const { user, signedIn } = useAuth();
  const { colors } = useTheme();
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
      tabBarActiveTintColor: colors.accentText,
      tabBarInactiveTintColor: colors.muted,
      tabBarIcon: ({ color, size }) => (
        <Ionicons name={icons[route.name]} size={size} color={color} />
      ),
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.ink,
      headerTitleStyle: { fontWeight: "700" },
      headerRight: () => <ColorModeToggle />,
    }),
    [colors]
  );

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={screenOptions}
      tabBar={(props) => <LiquidTabBar {...props} />}
    >
      {primaryTabs.map((name) => (
        <Tab.Screen
          key={name}
          name={name}
          component={screens[name].component}
          options={{
            ...screens[name].options,
            ...(name === "Dashboard" && !signedIn
              ? {
                  // Mirrors frontend/src/App.jsx's ".app-header--splash" treatment:
                  // when LandingView's dark gradient hero is showing, the header
                  // and tab bar blend into it (same color as the gradient's first
                  // stop) instead of sitting on top as mismatched light bars.
                  // headerTitle (not title) so the tab bar label stays "Dashboard".
                  headerTitle: "KejaApp",
                  headerStyle: { backgroundColor: colors.greenDark },
                  headerTintColor: colors.white,
                  headerTitleStyle: { fontWeight: "800" },
                  headerShadowVisible: false,
                  headerRight: () => <ColorModeToggle color={colors.white} />,
                  // LiquidTabBar reads tabBarStyle.backgroundColor as its glass
                  // pill's tint overlay (not a full opaque replacement), so the
                  // bar still reads as "belonging to" the dark hero without
                  // losing the frosted-glass material everywhere else.
                  tabBarStyle: { backgroundColor: "rgba(3, 63, 33, 0.55)" },
                  tabBarActiveTintColor: colors.white,
                  tabBarInactiveTintColor: "rgba(255, 255, 255, 0.6)",
                }
              : {}),
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
