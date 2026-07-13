import { useEffect, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { fetchDashboardSummary } from "../api/index.js";
import { useAuth } from "../context/AuthContext.js";
import DashboardScreen from "../screens/dashboard/DashboardScreen.js";
import DiscoverStack from "./DiscoverStack.js";
import SavedScreen from "../screens/saved/SavedScreen.js";
import WorkspaceStack from "./WorkspaceStack.js";
import MoversStack from "./MoversStack.js";
import RequestsScreen from "../screens/requests/RequestsScreen.js";
import NotificationsScreen from "../screens/notifications/NotificationsScreen.js";
import FeedbackScreen from "../screens/feedback/FeedbackScreen.js";
import AccountScreen from "../screens/account/AccountScreen.js";
import { useTheme } from "../context/ThemeContext.js";
import ColorModeToggle from "../components/ColorModeToggle.js";

const Tab = createBottomTabNavigator();

const icons = {
  Dashboard: "grid",
  Discover: "search",
  Saved: "heart",
  Workspace: "briefcase",
  Movers: "car",
  Requests: "chatbubbles",
  Notifications: "notifications",
  Feedback: "chatbox-ellipses",
  Account: "person-circle",
};

// Mirrors the per-role nav filtering frontend/app-utils.js does for the web
// app (roleViewAccess/canAccessView) - anonymous visitors and each signed-in
// role only see the tabs relevant to them, instead of every tab regardless
// of whether it applies (which is what made the bar feel cramped with 8
// tabs for everyone, tenant and landlord alike).
const roleTabs = {
  tenant: ["Dashboard", "Discover", "Saved", "Movers", "Requests", "Notifications", "Feedback", "Account"],
  landlord: ["Dashboard", "Workspace", "Movers", "Notifications", "Feedback", "Account"],
  agency: ["Dashboard", "Workspace", "Movers", "Notifications", "Feedback", "Account"],
  mover: ["Dashboard", "Movers", "Notifications", "Feedback", "Account"],
  admin: ["Dashboard", "Notifications", "Feedback", "Account"],
};

const anonymousTabs = ["Dashboard", "Discover", "Movers", "Account"];

const screens = {
  Dashboard: { component: DashboardScreen },
  Discover: { component: DiscoverStack, options: { headerShown: false } },
  Saved: { component: SavedScreen },
  Workspace: { component: WorkspaceStack, options: { headerShown: false } },
  Movers: { component: MoversStack, options: { headerShown: false } },
  Requests: { component: RequestsScreen },
  Notifications: { component: NotificationsScreen },
  Feedback: { component: FeedbackScreen },
  Account: { component: AccountScreen },
};

export default function MainTabs() {
  const { user, signedIn } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const visibleTabs = signedIn ? roleTabs[user?.role] || anonymousTabs : anonymousTabs;
  const [unreadCount, setUnreadCount] = useState(0);

  // The default tab bar sits close enough to the gesture-nav home indicator
  // that it read as "obstructed" once the bar had a solid dark background
  // (on a light background the indicator just blended in). Extra bottom
  // padding on top of the safe-area inset gives clear breathing room, and is
  // shared by both variants below so switching tabs doesn't jump the bar's
  // height.
  const baseTabBarStyle = {
    height: 56 + insets.bottom + 12,
    paddingTop: 8,
    paddingBottom: insets.bottom + 12,
  };

  useEffect(() => {
    if (!signedIn) {
      setUnreadCount(0);
      return;
    }

    let active = true;

    const refreshUnreadCount = async () => {
      try {
        const summary = await fetchDashboardSummary();
        if (active) setUnreadCount(summary.notifications?.unread || 0);
      } catch {
        // Non-fatal: the badge just keeps its last known value until the next refresh.
      }
    };

    refreshUnreadCount();
    // Polling rather than a push mechanism (no websockets in this app) — good enough
    // for a bell badge that only needs to notice new activity within ~30s.
    const intervalId = setInterval(refreshUnreadCount, 30000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [signedIn]);

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.greenDark,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={icons[route.name]} size={size} color={color} />
        ),
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: "700" },
        headerRight: () => <ColorModeToggle />,
        tabBarStyle: baseTabBarStyle,
      })}
    >
      {visibleTabs.map((name) => (
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
                  tabBarStyle: {
                    ...baseTabBarStyle,
                    backgroundColor: colors.greenDark,
                    borderTopWidth: 0,
                    // The library's default tab bar style always sets
                    // elevation: 8 (Android's Material drop shadow) - that's
                    // what was still showing as a "border line" after
                    // borderTopWidth: 0 alone didn't remove it.
                    elevation: 0,
                  },
                  tabBarActiveTintColor: colors.white,
                  tabBarInactiveTintColor: "rgba(255, 255, 255, 0.6)",
                }
              : {}),
            ...(name === "Notifications" && unreadCount > 0
              ? { tabBarBadge: unreadCount > 99 ? "99+" : unreadCount }
              : {}),
          }}
          listeners={
            name === "Notifications"
              ? {
                  // Tapping the tab is what "clears" the bell — NotificationsScreen
                  // marks everything read server-side; this clears the badge
                  // immediately instead of waiting on the next poll.
                  tabPress: () => setUnreadCount(0),
                }
              : undefined
          }
        />
      ))}
    </Tab.Navigator>
  );
}
