import { fireEvent, render, waitFor } from "@testing-library/react-native";
import LoginScreen from "./LoginScreen.js";
import { lightColors } from "../../theme/colors.js";

jest.mock("../../context/AuthContext.js", () => ({ useAuth: jest.fn() }));
jest.mock("../../context/SettingsContext.js", () => ({ useSettings: jest.fn() }));
jest.mock("../../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
// Has its own dedicated test suite (GoogleSignInButton.test.js) - the real
// component calls the actual expo-auth-session/expo-linking scheme
// resolution, which isn't set up outside a real Expo runtime.
jest.mock("../../components/GoogleSignInButton.js", () => () => null);

import { useAuth } from "../../context/AuthContext.js";
import { useSettings } from "../../context/SettingsContext.js";
import { useTheme } from "../../context/ThemeContext.js";

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTheme.mockReturnValue({ colors: lightColors });
    useSettings.mockReturnValue({ apiBaseUrl: "http://localhost:5000", setApiBaseUrl: jest.fn() });
  });

  it("signs in and navigates back on success", async () => {
    const login = jest.fn().mockResolvedValue();
    useAuth.mockReturnValue({ login });
    const goBack = jest.fn();

    const { getByText, getByLabelText } = await render(<LoginScreen navigation={{ goBack, navigate: jest.fn() }} />);

    await fireEvent.changeText(getByLabelText("Email or username"), "jane@example.com");
    await fireEvent.changeText(getByLabelText("Password"), "password123");
    await fireEvent.press(getByText("Sign in"));

    await waitFor(() => expect(goBack).toHaveBeenCalledTimes(1));
    expect(login).toHaveBeenCalledWith({ identifier: "jane@example.com", password: "password123" });
  });

  it("shows an error message when sign-in fails", async () => {
    const login = jest.fn().mockRejectedValue(new Error("Invalid credentials"));
    useAuth.mockReturnValue({ login });

    const { getByText, findByText } = await render(<LoginScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);

    await fireEvent.press(getByText("Sign in"));

    expect(await findByText("Invalid credentials")).toBeTruthy();
  });

  it("navigates to Register from the link", async () => {
    useAuth.mockReturnValue({ login: jest.fn() });
    const navigate = jest.fn();

    const { getByText } = await render(<LoginScreen navigation={{ goBack: jest.fn(), navigate }} />);

    await fireEvent.press(getByText("Need an account? Register"));

    expect(navigate).toHaveBeenCalledWith("Register");
  });
});
