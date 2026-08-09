import { Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { fireEvent, render } from "@testing-library/react-native";
import LiquidTabBar from "./LiquidTabBar.js";
import { lightColors } from "../theme/colors.js";

jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
jest.mock("../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
jest.mock("expo-blur", () => {
  const { View } = require("react-native");
  return {
    BlurView: function BlurViewMock(props) {
      return <View {...props} />;
    },
  };
});

import { useTheme } from "../context/ThemeContext.js";

const routes = [
  { key: "Dashboard-key", name: "Dashboard", params: undefined },
  { key: "Discover-key", name: "Discover", params: undefined },
  { key: "More-key", name: "More", params: undefined },
];

const makeIcon = (label) =>
  function IconMock() {
    return <Text>{`icon:${label}`}</Text>;
  };

const descriptorsFor = (overrides = {}) => ({
  "Dashboard-key": { options: { title: "Dashboard", tabBarIcon: makeIcon("Dashboard") } },
  "Discover-key": { options: { title: "Discover", tabBarIcon: makeIcon("Discover") } },
  "More-key": { options: { title: "More", tabBarIcon: makeIcon("More") } },
  ...overrides,
});

const renderTabBar = async ({ index = 0, descriptors = descriptorsFor(), navigation } = {}) => {
  const state = { routes, index };
  const nav = navigation || { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() };
  const utils = await render(
    <NavigationContainer>
      <LiquidTabBar state={state} descriptors={descriptors} navigation={nav} />
    </NavigationContainer>
  );
  return { ...utils, navigation: nav };
};

describe("LiquidTabBar", () => {
  beforeEach(() => {
    useTheme.mockReturnValue({ colors: lightColors, resolvedColorMode: "light" });
  });

  it("renders every route's label and icon", async () => {
    const { getByText } = await renderTabBar();

    expect(getByText("Dashboard")).toBeTruthy();
    expect(getByText("Discover")).toBeTruthy();
    expect(getByText("More")).toBeTruthy();
    expect(getByText("icon:Dashboard")).toBeTruthy();
    expect(getByText("icon:Discover")).toBeTruthy();
    expect(getByText("icon:More")).toBeTruthy();
  });

  it("marks only the focused tab as selected", async () => {
    const descriptors = descriptorsFor({
      "Dashboard-key": {
        options: { title: "Dashboard", tabBarIcon: makeIcon("Dashboard"), tabBarButtonTestID: "tab-dashboard" },
      },
      "Discover-key": {
        options: { title: "Discover", tabBarIcon: makeIcon("Discover"), tabBarButtonTestID: "tab-discover" },
      },
    });

    const { getByTestId } = await renderTabBar({ index: 1, descriptors });

    expect(getByTestId("tab-dashboard").props.accessibilityState).toEqual({});
    expect(getByTestId("tab-discover").props.accessibilityState).toEqual({ selected: true });
  });

  it("navigates to the pressed tab when it isn't already focused", async () => {
    const { getByText, navigation } = await renderTabBar({ index: 0 });

    fireEvent.press(getByText("Discover"));

    expect(navigation.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "tabPress", target: "Discover-key" })
    );
    expect(navigation.navigate).toHaveBeenCalledWith("Discover", undefined);
  });

  it("does not navigate when the focused tab is pressed again", async () => {
    const { getByText, navigation } = await renderTabBar({ index: 0 });

    fireEvent.press(getByText("Dashboard"));

    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it("does not navigate when a listener calls preventDefault on tabPress", async () => {
    const navigation = { emit: jest.fn(() => ({ defaultPrevented: true })), navigate: jest.fn() };
    const { getByText } = await renderTabBar({ index: 0, navigation });

    fireEvent.press(getByText("Discover"));

    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it("renders a badge when the route's tabBarBadge option is set", async () => {
    const descriptors = descriptorsFor({
      "More-key": { options: { title: "More", tabBarIcon: makeIcon("More"), tabBarBadge: 3 } },
    });

    const { getByText } = await renderTabBar({ descriptors });

    expect(getByText("3")).toBeTruthy();
  });

  it("does not crash when the focused route overrides tint colors and tabBarStyle background", async () => {
    const descriptors = descriptorsFor({
      "Dashboard-key": {
        options: {
          title: "Dashboard",
          tabBarIcon: makeIcon("Dashboard"),
          tabBarActiveTintColor: "#ffffff",
          tabBarInactiveTintColor: "rgba(255, 255, 255, 0.6)",
          tabBarStyle: { backgroundColor: "rgba(3, 63, 33, 0.55)" },
        },
      },
    });

    const { getByText } = await renderTabBar({ index: 0, descriptors });

    expect(getByText("Dashboard")).toBeTruthy();
  });
});
