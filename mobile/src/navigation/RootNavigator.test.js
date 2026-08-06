import { NavigationContainer } from "@react-navigation/native";
import { render } from "@testing-library/react-native";
import RootNavigator from "./RootNavigator.js";

jest.mock("../context/AuthContext.js", () => ({ useAuth: jest.fn() }));
jest.mock("../components/LoadingView.js", () => function LoadingViewMock() {
  const { Text: RNText } = require("react-native");
  return <RNText>LoadingView</RNText>;
});
jest.mock("./MainTabs.js", () => function MainTabsMock() {
  const { Text: RNText } = require("react-native");
  return <RNText>MainTabs</RNText>;
});
jest.mock("../screens/auth/LoginScreen.js", () => function LoginScreenMock() {
  const { Text: RNText } = require("react-native");
  return <RNText>LoginScreen</RNText>;
});
jest.mock("../screens/auth/RegisterScreen.js", () => function RegisterScreenMock() {
  const { Text: RNText } = require("react-native");
  return <RNText>RegisterScreen</RNText>;
});
jest.mock("../screens/auth/SelectRoleScreen.js", () => function SelectRoleScreenMock() {
  const { Text: RNText } = require("react-native");
  return <RNText>SelectRoleScreen</RNText>;
});

import { useAuth } from "../context/AuthContext.js";

const renderNavigator = () =>
  render(
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );

describe("RootNavigator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a loading view while the session is restoring", async () => {
    useAuth.mockReturnValue({ loading: true, user: null });

    const { findByText, queryByText } = await renderNavigator();

    expect(await findByText("LoadingView")).toBeTruthy();
    expect(queryByText("MainTabs")).toBeNull();
    expect(queryByText("SelectRoleScreen")).toBeNull();
  });

  it("forces the role-picker for a signed-in user whose role isn't confirmed yet", async () => {
    useAuth.mockReturnValue({ loading: false, user: { role: "tenant", roleConfirmed: false } });

    const { findByText, queryByText } = await renderNavigator();

    expect(await findByText("SelectRoleScreen")).toBeTruthy();
    expect(queryByText("MainTabs")).toBeNull();
  });

  it("renders the normal tab navigator once the role is confirmed", async () => {
    useAuth.mockReturnValue({ loading: false, user: { role: "tenant", roleConfirmed: true } });

    const { findByText, queryByText } = await renderNavigator();

    expect(await findByText("MainTabs")).toBeTruthy();
    expect(queryByText("SelectRoleScreen")).toBeNull();
  });

  it("renders the normal tab navigator for a signed-out user (no roleConfirmed field at all)", async () => {
    useAuth.mockReturnValue({ loading: false, user: null });

    const { findByText, queryByText } = await renderNavigator();

    expect(await findByText("MainTabs")).toBeTruthy();
    expect(queryByText("SelectRoleScreen")).toBeNull();
  });
});
