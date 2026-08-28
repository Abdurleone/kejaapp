import { fireEvent, render, waitFor } from "@testing-library/react-native";
import RegisterScreen from "./RegisterScreen.js";
import { lightColors } from "../../theme/colors.js";

jest.mock("../../context/AuthContext.js", () => ({ useAuth: jest.fn() }));
jest.mock("../../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
// Has its own dedicated test suite (GoogleSignInButton.test.js) - the real
// component calls the actual expo-auth-session/expo-linking scheme
// resolution, which isn't set up outside a real Expo runtime.
jest.mock("../../components/GoogleSignInButton.js", () => () => null);

import { useAuth } from "../../context/AuthContext.js";
import { useTheme } from "../../context/ThemeContext.js";

describe("RegisterScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTheme.mockReturnValue({ colors: lightColors });
  });

  it("submits the form and navigates back on success", async () => {
    const register = jest.fn().mockResolvedValue();
    useAuth.mockReturnValue({ register });
    const goBack = jest.fn();

    const { getAllByText, getByText, getByLabelText } = await render(
      <RegisterScreen navigation={{ goBack, navigate: jest.fn() }} />,
    );

    await fireEvent.changeText(getByLabelText("Name"), "Jane Tenant");
    await fireEvent.changeText(getByLabelText("Email"), " jane@example.com ");
    await fireEvent.changeText(getByLabelText("Username"), "janet");
    await fireEvent.changeText(getByLabelText("Phone"), "0700000000");
    await fireEvent.changeText(getByLabelText("Password"), "password123");
    await fireEvent.press(getByText("Landlord"));
    await fireEvent.press(getByLabelText("I agree to the Terms of Service and Privacy & Data Protection Policy"));
    // "Create account" is both the screen title and the submit button label -
    // the button is the last (and only interactive) match.
    const submitButtons = getAllByText("Create account");
    await fireEvent.press(submitButtons[submitButtons.length - 1]);

    await waitFor(() => expect(goBack).toHaveBeenCalledTimes(1));
    expect(register).toHaveBeenCalledWith({
      name: "Jane Tenant",
      email: "jane@example.com",
      username: "janet",
      password: "password123",
      phone: "0700000000",
      role: "landlord",
      termsAccepted: true,
    });
  });

  it("rejects submission when the terms checkbox isn't checked, without calling register", async () => {
    const register = jest.fn();
    useAuth.mockReturnValue({ register });

    const { getAllByText, getByLabelText, findByText } = await render(
      <RegisterScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />,
    );

    await fireEvent.changeText(getByLabelText("Name"), "Jane Tenant");
    await fireEvent.changeText(getByLabelText("Email"), "jane@example.com");
    await fireEvent.changeText(getByLabelText("Username"), "janet");
    await fireEvent.changeText(getByLabelText("Password"), "password123");
    const submitButtons = getAllByText("Create account");
    await fireEvent.press(submitButtons[submitButtons.length - 1]);

    expect(await findByText("You must agree to the Terms of Service to create an account.")).toBeTruthy();
    expect(register).not.toHaveBeenCalled();
  });

  it("shows an error and username suggestions when registration fails", async () => {
    const register = jest.fn().mockRejectedValue(
      Object.assign(new Error("Username already taken"), { suggestions: ["janet2", "janet3"] }),
    );
    useAuth.mockReturnValue({ register });

    const { getAllByText, getByText, getByLabelText, findByText } = await render(
      <RegisterScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />,
    );

    await fireEvent.changeText(getByLabelText("Name"), "Jane Tenant");
    await fireEvent.changeText(getByLabelText("Email"), "jane@example.com");
    await fireEvent.changeText(getByLabelText("Username"), "janet");
    await fireEvent.changeText(getByLabelText("Password"), "password123");
    await fireEvent.press(getByLabelText("I agree to the Terms of Service and Privacy & Data Protection Policy"));
    const submitButtons = getAllByText("Create account");
    await fireEvent.press(submitButtons[submitButtons.length - 1]);

    expect(await findByText("Username already taken")).toBeTruthy();
    expect(getByText("janet2")).toBeTruthy();
    expect(getByText("janet3")).toBeTruthy();
  });

  it("applies a suggested username and clears the suggestion list", async () => {
    const register = jest.fn().mockRejectedValue(
      Object.assign(new Error("Username already taken"), { suggestions: ["janet2"] }),
    );
    useAuth.mockReturnValue({ register });

    const { getAllByText, getByText, findByText, getByLabelText, queryByText } = await render(
      <RegisterScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />,
    );

    await fireEvent.changeText(getByLabelText("Name"), "Jane Tenant");
    await fireEvent.changeText(getByLabelText("Email"), "jane@example.com");
    await fireEvent.changeText(getByLabelText("Username"), "janet");
    await fireEvent.changeText(getByLabelText("Password"), "password123");
    await fireEvent.press(getByLabelText("I agree to the Terms of Service and Privacy & Data Protection Policy"));
    const submitButtons = getAllByText("Create account");
    await fireEvent.press(submitButtons[submitButtons.length - 1]);
    await findByText("janet2");

    await fireEvent.press(getByText("janet2"));

    expect(getByLabelText("Username").props.value).toBe("janet2");
    expect(queryByText("janet2")).toBeNull();
  });

  describe("client-side validation", () => {
    const fillValidForm = async (getByLabelText, overrides = {}) => {
      const values = {
        name: "Jane Tenant",
        email: "jane@example.com",
        username: "janet",
        password: "password123",
        ...overrides,
      };
      await fireEvent.changeText(getByLabelText("Name"), values.name);
      await fireEvent.changeText(getByLabelText("Email"), values.email);
      await fireEvent.changeText(getByLabelText("Username"), values.username);
      await fireEvent.changeText(getByLabelText("Password"), values.password);
    };

    it("rejects a blank name without calling register", async () => {
      const register = jest.fn();
      useAuth.mockReturnValue({ register });

      const { getAllByText, getByLabelText, findByText } = await render(
        <RegisterScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />,
      );

      await fillValidForm(getByLabelText, { name: "   " });
      const submitButtons = getAllByText("Create account");
      await fireEvent.press(submitButtons[submitButtons.length - 1]);

      expect(await findByText("Name is required.")).toBeTruthy();
      expect(register).not.toHaveBeenCalled();
    });

    it("rejects a malformed email without calling register", async () => {
      const register = jest.fn();
      useAuth.mockReturnValue({ register });

      const { getAllByText, getByLabelText, findByText } = await render(
        <RegisterScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />,
      );

      await fillValidForm(getByLabelText, { email: "not-an-email" });
      const submitButtons = getAllByText("Create account");
      await fireEvent.press(submitButtons[submitButtons.length - 1]);

      expect(await findByText("Enter a valid email address.")).toBeTruthy();
      expect(register).not.toHaveBeenCalled();
    });

    it("rejects a blank username without calling register", async () => {
      const register = jest.fn();
      useAuth.mockReturnValue({ register });

      const { getAllByText, getByLabelText, findByText } = await render(
        <RegisterScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />,
      );

      await fillValidForm(getByLabelText, { username: "  " });
      const submitButtons = getAllByText("Create account");
      await fireEvent.press(submitButtons[submitButtons.length - 1]);

      expect(await findByText("Username is required.")).toBeTruthy();
      expect(register).not.toHaveBeenCalled();
    });

    it("rejects a too-short password without calling register", async () => {
      const register = jest.fn();
      useAuth.mockReturnValue({ register });

      const { getAllByText, getByLabelText, findByText } = await render(
        <RegisterScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />,
      );

      await fillValidForm(getByLabelText, { password: "short" });
      const submitButtons = getAllByText("Create account");
      await fireEvent.press(submitButtons[submitButtons.length - 1]);

      expect(await findByText("Password must be at least 8 characters.")).toBeTruthy();
      expect(register).not.toHaveBeenCalled();
    });
  });

  it("navigates to Login from the link", async () => {
    useAuth.mockReturnValue({ register: jest.fn() });
    const navigate = jest.fn();

    const { getByText } = await render(<RegisterScreen navigation={{ goBack: jest.fn(), navigate }} />);

    await fireEvent.press(getByText("Already have an account? Sign in"));

    expect(navigate).toHaveBeenCalledWith("Login");
  });
});
