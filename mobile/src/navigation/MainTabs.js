import { useEffect, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
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
  const visibleTabs = signedIn ? roleTabs[user?.role] || anonymousTabs : anonymousTabs;
  const [unreadCount, setUnreadCount] = useState(0);

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
      })}
    >
      {visibleTabs.map((name) => (
        <Tab.Screen
          key={name}
          name={name}
          component={screens[name].component}
          options={{
            ...screens[name].options,
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
