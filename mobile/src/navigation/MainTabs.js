import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import DashboardScreen from "../screens/dashboard/DashboardScreen.js";
import DiscoverStack from "./DiscoverStack.js";
import SavedScreen from "../screens/saved/SavedScreen.js";
import WorkspaceStack from "./WorkspaceStack.js";
import RequestsScreen from "../screens/requests/RequestsScreen.js";
import FeedbackScreen from "../screens/feedback/FeedbackScreen.js";
import AccountScreen from "../screens/account/AccountScreen.js";
import colors from "../theme/colors.js";

const Tab = createBottomTabNavigator();

const icons = {
  Dashboard: "grid",
  Discover: "search",
  Saved: "heart",
  Workspace: "briefcase",
  Requests: "chatbubbles",
  Feedback: "chatbox-ellipses",
  Account: "person-circle",
};

export default function MainTabs() {
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
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Discover" component={DiscoverStack} options={{ headerShown: false }} />
      <Tab.Screen name="Saved" component={SavedScreen} />
      <Tab.Screen name="Workspace" component={WorkspaceStack} options={{ headerShown: false }} />
      <Tab.Screen name="Requests" component={RequestsScreen} />
      <Tab.Screen name="Feedback" component={FeedbackScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}
