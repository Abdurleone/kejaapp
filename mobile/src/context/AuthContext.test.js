import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Pressable, Text, View } from "react-native";
import { AuthProvider, useAuth } from "./AuthContext.js";

jest.mock("../api/index.js", () => ({
  fetchCurrentUser: jest.fn(),
  getAuthToken: jest.fn(),
  loginUser: jest.fn(),
  loginWithGoogle: jest.fn(),
  logoutUser: jest.fn(),
  registerUser: jest.fn(),
}));
jest.mock("../services/pushNotifications.js", () => ({
  registerForPushNotifications: jest.fn(),
  unregisterForPushNotifications: jest.fn(),
}));

import {
  fetchCurrentUser,
  getAuthToken,
  loginUser,
  loginWithGoogle,
  logoutUser,
  registerUser,
} from "../api/index.js";
import {
  registerForPushNotifications,
  unregisterForPushNotifications,
} from "../services/pushNotifications.js";

function Consumer() {
  const { user, signedIn, loading, login, register, loginWithGoogle: loginWithGoogleFn, logout, updateUser } =
    useAuth();

  return (
    <View>
      <Text>{loading ? "loading" : signedIn ? `signed-in:${user.name}` : "signed-out"}</Text>
      <Pressable onPress={() => login({ identifier: "jane", password: "pw" })}>
        <Text>login</Text>
      </Pressable>
      <Pressable onPress={() => register({ name: "Jane" })}>
        <Text>register</Text>
      </Pressable>
      <Pressable onPress={() => loginWithGoogleFn("fake-id-token")}>
        <Text>loginWithGoogle</Text>
      </Pressable>
      <Pressable onPress={logout}>
        <Text>logout</Text>
      </Pressable>
      <Pressable onPress={() => updateUser({ name: "Jane Updated" })}>
        <Text>updateUser</Text>
      </Pressable>
    </View>
  );
}

const renderConsumer = () =>
  render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>
  );

describe("AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts signed out when there is no stored token", async () => {
    getAuthToken.mockResolvedValue("");

    const { getByText } = await renderConsumer();

    await waitFor(() => expect(getByText("signed-out")).toBeTruthy());
    expect(fetchCurrentUser).not.toHaveBeenCalled();
  });

  it("restores the session when a stored token resolves to a valid user", async () => {
    getAuthToken.mockResolvedValue("stored-token");
    fetchCurrentUser.mockResolvedValue({ name: "Jane" });

    const { getByText } = await renderConsumer();

    await waitFor(() => expect(getByText("signed-in:Jane")).toBeTruthy());
    expect(registerForPushNotifications).toHaveBeenCalledTimes(1);
  });

  it("falls back to signed out when a stored token is invalid", async () => {
    getAuthToken.mockResolvedValue("stale-token");
    fetchCurrentUser.mockRejectedValue(new Error("invalid token"));

    const { getByText } = await renderConsumer();

    await waitFor(() => expect(getByText("signed-out")).toBeTruthy());
  });

  it("login signs the user in and registers for push", async () => {
    getAuthToken.mockResolvedValue("");
    loginUser.mockResolvedValue({ user: { name: "Jane" } });

    const { getByText } = await renderConsumer();

    await waitFor(() => expect(getByText("signed-out")).toBeTruthy());

    fireEvent.press(getByText("login"));

    await waitFor(() => expect(getByText("signed-in:Jane")).toBeTruthy());
    expect(loginUser).toHaveBeenCalledWith({ identifier: "jane", password: "pw" });
    expect(registerForPushNotifications).toHaveBeenCalledTimes(1);
  });

  it("register signs the user in and registers for push", async () => {
    getAuthToken.mockResolvedValue("");
    registerUser.mockResolvedValue({ user: { name: "Jane" } });

    const { getByText } = await renderConsumer();

    await waitFor(() => expect(getByText("signed-out")).toBeTruthy());

    fireEvent.press(getByText("register"));

    await waitFor(() => expect(getByText("signed-in:Jane")).toBeTruthy());
    expect(registerForPushNotifications).toHaveBeenCalledTimes(1);
  });

  it("loginWithGoogle signs the user in and registers for push", async () => {
    getAuthToken.mockResolvedValue("");
    loginWithGoogle.mockResolvedValue({ user: { name: "Jane" } });

    const { getByText } = await renderConsumer();

    await waitFor(() => expect(getByText("signed-out")).toBeTruthy());

    fireEvent.press(getByText("loginWithGoogle"));

    await waitFor(() => expect(getByText("signed-in:Jane")).toBeTruthy());
    expect(loginWithGoogle).toHaveBeenCalledWith("fake-id-token");
    expect(registerForPushNotifications).toHaveBeenCalledTimes(1);
  });

  it("logout unregisters push before signing out", async () => {
    getAuthToken.mockResolvedValue("stored-token");
    fetchCurrentUser.mockResolvedValue({ name: "Jane" });
    logoutUser.mockResolvedValue();
    unregisterForPushNotifications.mockResolvedValue();

    const { getByText } = await renderConsumer();

    await waitFor(() => expect(getByText("signed-in:Jane")).toBeTruthy());

    fireEvent.press(getByText("logout"));

    await waitFor(() => expect(getByText("signed-out")).toBeTruthy());
    expect(unregisterForPushNotifications).toHaveBeenCalledTimes(1);
    expect(logoutUser).toHaveBeenCalledTimes(1);
  });

  it("updateUser replaces the current user with server-fresh data", async () => {
    getAuthToken.mockResolvedValue("stored-token");
    fetchCurrentUser.mockResolvedValue({ name: "Jane" });

    const { getByText } = await renderConsumer();

    await waitFor(() => expect(getByText("signed-in:Jane")).toBeTruthy());

    await fireEvent.press(getByText("updateUser"));

    await waitFor(() => expect(getByText("signed-in:Jane Updated")).toBeTruthy());
  });

  it("keeps the same login/register/logout function references across a sign-in that changes user", async () => {
    // The outer `value` object is only memoized on [user, loading, ...], so
    // it's already a new object whenever user changes - that alone doesn't
    // prove login/register/logout are individually stable. Wrapping each in
    // useCallback is what keeps *their* references identical even across a
    // render where the surrounding value object necessarily changes; without
    // it, this render would have captured a fresh closure for each instead.
    getAuthToken.mockResolvedValue("");
    loginUser.mockResolvedValue({ user: { name: "Jane" } });
    const captured = [];

    function CaptureConsumer() {
      const value = useAuth();
      captured.push(value);
      return (
        <Pressable onPress={() => value.login({ identifier: "jane", password: "pw" })}>
          <Text>{value.signedIn ? `signed-in:${value.user.name}` : "signed-out"}</Text>
        </Pressable>
      );
    }

    const { getByText } = await render(
      <AuthProvider>
        <CaptureConsumer />
      </AuthProvider>
    );
    await waitFor(() => expect(getByText("signed-out")).toBeTruthy());
    const beforeLogin = captured[captured.length - 1].login;

    fireEvent.press(getByText("signed-out"));
    await waitFor(() => expect(getByText("signed-in:Jane")).toBeTruthy());
    const afterLogin = captured[captured.length - 1].login;

    expect(afterLogin).toBe(beforeLogin);
  });
});
