import { NavigationContainer } from "@react-navigation/native";
import { fireEvent, render } from "@testing-library/react-native";
import MainTabs from "./MainTabs.js";
import { lightColors } from "../theme/colors.js";

// Renders MainTabs through a real @react-navigation/bottom-tabs Tab.Navigator
// (not a hand-built state/descriptors/navigation shape, unlike
// LiquidTabBar.test.js's own unit tests) so the tabBar={(props) =>
// <LiquidTabBar {...props} />} wiring itself - the one thing no other test
// exercises - gets a real integration check: real route state, real
// descriptors, a real press-to-navigate round trip.
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
jest.mock("expo-blur", () => {
  const { View } = require("react-native");
  return {
    BlurView: function BlurViewMock(props) {
      return <View {...props} />;
    },
  };
});
jest.mock("../context/AuthContext.js", () => ({ useAuth: jest.fn() }));
jest.mock("../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
jest.mock("../api/index.js", () => ({ fetchDashboardSummary: jest.fn() }));
jest.mock("./tabScreens.js", () => ({
  icons: { Dashboard: "grid", Discover: "search" },
  screens: {
    Dashboard: {
      component: function DashboardScreenMock() {
        const { Text } = require("react-native");
        return <Text>DashboardScreen</Text>;
      },
    },
    Discover: {
      component: function DiscoverScreenMock() {
        const { Text } = require("react-native");
        return <Text>DiscoverScreen</Text>;
      },
      options: { headerShown: false },
    },
  },
}));
jest.mock("./MoreStack.js", () => function MoreStackMock() {
  const { Text } = require("react-native");
  return <Text>MoreStack</Text>;
});

import { useAuth } from "../context/AuthContext.js";
import { useTheme } from "../context/ThemeContext.js";
import { fetchDashboardSummary } from "../api/index.js";

const renderMainTabs = () =>
  render(
    <NavigationContainer>
      <MainTabs />
    </NavigationContainer>
  );

describe("MainTabs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTheme.mockReturnValue({ colors: lightColors, resolvedColorMode: "light" });
  });

  it("renders the anonymous visitor's primary tabs plus More via the LiquidTabBar", async () => {
    useAuth.mockReturnValue({ user: null, signedIn: false });

    const { findByText } = await renderMainTabs();

    expect(await findByText("Dashboard")).toBeTruthy();
    expect(await findByText("Discover")).toBeTruthy();
    expect(await findByText("More")).toBeTruthy();
    expect(await findByText("DashboardScreen")).toBeTruthy();
  });

  it("navigates to the pressed tab's screen through a real Tab.Navigator round trip", async () => {
    useAuth.mockReturnValue({ user: null, signedIn: false });

    const { findByText, getByText } = await renderMainTabs();
    await findByText("DashboardScreen");

    fireEvent.press(getByText("Discover"));

    expect(await findByText("DiscoverScreen")).toBeTruthy();
  });

  it("polls for the unread count only while signed in", async () => {
    useAuth.mockReturnValue({ user: { role: "tenant" }, signedIn: true });
    fetchDashboardSummary.mockResolvedValue({ notifications: { unread: 4 } });

    const { findByText } = await renderMainTabs();

    await findByText("DashboardScreen");
    expect(fetchDashboardSummary).toHaveBeenCalledTimes(1);
  });
});
