// Shared between MainTabs.js (pinned tabs) and MoreStack.js (everything tucked
// under the "More" tab) so both sides of the pinned/hidden split render the
// exact same icon + screen for a given route name.
import DashboardScreen from "../screens/dashboard/DashboardScreen.js";
import DiscoverStack from "./DiscoverStack.js";
import SavedScreen from "../screens/saved/SavedScreen.js";
import WorkspaceStack from "./WorkspaceStack.js";
import MoversStack from "./MoversStack.js";
import RequestsScreen from "../screens/requests/RequestsScreen.js";
import NotificationsScreen from "../screens/notifications/NotificationsScreen.js";
import FeedbackScreen from "../screens/feedback/FeedbackScreen.js";
import AccountScreen from "../screens/account/AccountScreen.js";
import AdminStack from "./AdminStack.js";

export const icons = {
  Dashboard: "grid",
  Discover: "search",
  Saved: "heart",
  Workspace: "briefcase",
  Movers: "car",
  Requests: "chatbubbles",
  Notifications: "notifications",
  Feedback: "chatbox-ellipses",
  Account: "person-circle",
  Admin: "shield-checkmark",
  More: "ellipsis-horizontal",
};

export const screens = {
  Dashboard: { component: DashboardScreen },
  Discover: { component: DiscoverStack, options: { headerShown: false } },
  Saved: { component: SavedScreen },
  Workspace: { component: WorkspaceStack, options: { headerShown: false } },
  Movers: { component: MoversStack, options: { headerShown: false } },
  Requests: { component: RequestsScreen },
  Notifications: { component: NotificationsScreen },
  Feedback: { component: FeedbackScreen },
  Account: { component: AccountScreen },
  Admin: { component: AdminStack, options: { headerShown: false } },
};
