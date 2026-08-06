import { fireEvent, render, waitFor } from "@testing-library/react-native";
import GoogleSignInButton from "./GoogleSignInButton.js";
import { lightColors } from "../theme/colors.js";

jest.mock("expo-auth-session/providers/google", () => ({ useAuthRequest: jest.fn() }));
jest.mock("expo-web-browser", () => ({ maybeCompleteAuthSession: jest.fn() }));
jest.mock("../context/AuthContext.js", () => ({ useAuth: jest.fn() }));
jest.mock("../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));

import * as Google from "expo-auth-session/providers/google";
import { useAuth } from "../context/AuthContext.js";
import { useTheme } from "../context/ThemeContext.js";

describe("GoogleSignInButton", () => {
  const envKeys = [
    "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID",
    "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID",
    "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID",
  ];
  const originalEnv = {};

  // jest-expo resolves react-native's Platform module to its .ios.js variant
  // at module-load time, so Platform.select always takes the "ios" branch
  // here regardless of Platform.OS - only the iOS path is exercisable in
  // this test environment. The Android branch is the same ternary, just
  // untestable from here; real Android behavior needs a real device/emulator.
  beforeEach(() => {
    jest.clearAllMocks();
    useTheme.mockReturnValue({ colors: lightColors });
    envKeys.forEach((key) => {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    });
  });

  afterEach(() => {
    envKeys.forEach((key) => {
      process.env[key] = originalEnv[key];
    });
  });

  it("renders nothing when no client ID is configured for the current platform", async () => {
    Google.useAuthRequest.mockReturnValue([{}, null, jest.fn()]);
    useAuth.mockReturnValue({ loginWithGoogle: jest.fn() });

    const { queryByText } = await render(<GoogleSignInButton />);

    expect(queryByText("Sign in with Google")).toBeNull();
  });

  it("renders on iOS when EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is set, using it in the request", async () => {
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = "ios-client-id";
    Google.useAuthRequest.mockReturnValue([{}, null, jest.fn()]);
    useAuth.mockReturnValue({ loginWithGoogle: jest.fn() });

    await render(<GoogleSignInButton />);

    expect(Google.useAuthRequest).toHaveBeenCalledWith(
      expect.objectContaining({ iosClientId: "ios-client-id" }),
    );
  });

  it("prompts on press once configured", async () => {
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = "ios-client-id";
    const promptAsync = jest.fn();
    Google.useAuthRequest.mockReturnValue([{}, null, promptAsync]);
    useAuth.mockReturnValue({ loginWithGoogle: jest.fn() });

    const { getByText } = await render(<GoogleSignInButton />);

    await fireEvent.press(getByText("Sign in with Google"));

    expect(promptAsync).toHaveBeenCalledTimes(1);
  });

  it("calls loginWithGoogle then onAuthenticated when the auth response succeeds", async () => {
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = "ios-client-id";
    const loginWithGoogle = jest.fn().mockResolvedValue({ id: "u1", roleConfirmed: false });
    useAuth.mockReturnValue({ loginWithGoogle });
    Google.useAuthRequest.mockReturnValue([
      {},
      { type: "success", params: { id_token: "fake-id-token" } },
      jest.fn(),
    ]);
    const onAuthenticated = jest.fn();

    await render(<GoogleSignInButton onAuthenticated={onAuthenticated} />);

    await waitFor(() => expect(loginWithGoogle).toHaveBeenCalledWith("fake-id-token"));
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith({ id: "u1", roleConfirmed: false }));
  });

  it("calls onError instead when the response has no id_token", async () => {
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = "ios-client-id";
    useAuth.mockReturnValue({ loginWithGoogle: jest.fn() });
    Google.useAuthRequest.mockReturnValue([{}, { type: "success", params: {} }, jest.fn()]);
    const onError = jest.fn();

    await render(<GoogleSignInButton onError={onError} />);

    await waitFor(() => expect(onError).toHaveBeenCalledWith("Google sign-in did not return a credential"));
  });

  it("calls onError when loginWithGoogle rejects", async () => {
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = "ios-client-id";
    const loginWithGoogle = jest.fn().mockRejectedValue(new Error("Invalid Google credential"));
    useAuth.mockReturnValue({ loginWithGoogle });
    Google.useAuthRequest.mockReturnValue([
      {},
      { type: "success", params: { id_token: "fake-id-token" } },
      jest.fn(),
    ]);
    const onError = jest.fn();

    await render(<GoogleSignInButton onError={onError} />);

    await waitFor(() => expect(onError).toHaveBeenCalledWith("Invalid Google credential"));
  });
});
