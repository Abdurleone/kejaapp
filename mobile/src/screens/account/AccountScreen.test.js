import { Alert, Linking } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import AccountScreen from "./AccountScreen.js";
import { lightColors } from "../../theme/colors.js";

const mockNavigate = jest.fn();
let mockFocusCallback = null;
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (callback) => {
    mockFocusCallback = callback;
    return require("react").useEffect(callback, [callback]);
  },
}));
jest.mock("../../context/AuthContext.js", () => ({ useAuth: jest.fn() }));
jest.mock("../../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
jest.mock("../../api/index.js", () => ({
  changeCurrentUserPassword: jest.fn(),
  deleteCurrentAccount: jest.fn(),
  deleteSavedSearch: jest.fn(),
  fetchSavedSearches: jest.fn(),
  updateCurrentUser: jest.fn(),
}));

import { useAuth } from "../../context/AuthContext.js";
import { useTheme } from "../../context/ThemeContext.js";
import {
  changeCurrentUserPassword,
  deleteCurrentAccount,
  deleteSavedSearch,
  fetchSavedSearches,
  updateCurrentUser,
} from "../../api/index.js";

describe("AccountScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTheme.mockReturnValue({ colors: lightColors });
  });

  it("offers sign in/create account when signed out", async () => {
    useAuth.mockReturnValue({ signedIn: false, user: null, logout: jest.fn() });

    const { getByText } = await render(<AccountScreen />);

    fireEvent.press(getByText("Sign in"));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("Login"));

    fireEvent.press(getByText("Create account"));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("Register"));
  });

  it("shows account details when signed in", async () => {
    useAuth.mockReturnValue({
      signedIn: true,
      user: { name: "Jane Doe", username: "janedoe", email: "jane@example.com", role: "landlord", phone: "0700000000" },
      logout: jest.fn(),
    });

    const { getByText } = await render(<AccountScreen />);

    expect(getByText("Jane Doe")).toBeTruthy();
    expect(getByText("jane@example.com")).toBeTruthy();
    expect(getByText("landlord")).toBeTruthy();
  });

  it("lists and removes a tenant's saved searches", async () => {
    useAuth.mockReturnValue({
      signedIn: true,
      user: { name: "Jane Doe", role: "tenant" },
      logout: jest.fn(),
    });
    fetchSavedSearches.mockResolvedValue([{ _id: "s1", county: "Nairobi" }]);
    deleteSavedSearch.mockResolvedValue();

    const { getByText, queryByText } = await render(<AccountScreen />);

    await waitFor(() => expect(getByText("in Nairobi")).toBeTruthy());

    fireEvent.press(getByText("Remove"));

    await waitFor(() => expect(queryByText("in Nairobi")).toBeNull());
    expect(deleteSavedSearch).toHaveBeenCalledWith("s1");
  });

  it("reloads saved searches on every focus, not just the first mount (staleness guard)", async () => {
    // Regression test: a saved search created from Discover's location
    // filters used to never appear here until app restart, since Account
    // only fetched once at mount and MainTabs keeps tab screens mounted
    // across switches.
    useAuth.mockReturnValue({
      signedIn: true,
      user: { name: "Jane Doe", role: "tenant" },
      logout: jest.fn(),
    });
    fetchSavedSearches.mockResolvedValue([]);

    const { getByText, queryByText } = await render(<AccountScreen />);
    await waitFor(() => expect(queryByText("Loading...")).toBeNull());
    expect(getByText(/no saved searches yet/i)).toBeTruthy();

    fetchSavedSearches.mockResolvedValue([{ _id: "s1", county: "Nairobi" }]);

    await act(async () => {
      mockFocusCallback();
    });

    await waitFor(() => expect(fetchSavedSearches).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(getByText("in Nairobi")).toBeTruthy());
  });

  it("edits and saves the profile, updating the displayed name", async () => {
    const updateUser = jest.fn();
    useAuth.mockReturnValue({
      signedIn: true,
      user: { name: "Jane Doe", username: "janedoe", email: "jane@example.com", role: "tenant", phone: "0700000000" },
      logout: jest.fn(),
      updateUser,
    });
    fetchSavedSearches.mockResolvedValue([]);
    updateCurrentUser.mockResolvedValue({ name: "Jane Smith", username: "janedoe", email: "jane@example.com", role: "tenant", phone: "0711111111" });

    const { getByText, getByLabelText } = await render(<AccountScreen />);

    await fireEvent.press(getByText("Edit"));
    await fireEvent.changeText(getByLabelText("Name"), "Jane Smith");
    await fireEvent.changeText(getByLabelText("Phone"), "0711111111");
    await fireEvent.press(getByText("Save"));

    await waitFor(() =>
      expect(updateCurrentUser).toHaveBeenCalledWith({ name: "Jane Smith", phone: "0711111111" })
    );
    expect(updateUser).toHaveBeenCalledWith({
      name: "Jane Smith",
      username: "janedoe",
      email: "jane@example.com",
      role: "tenant",
      phone: "0711111111",
    });
    await waitFor(() => expect(getByText("Profile updated.")).toBeTruthy());
  });

  it("requires a non-blank name before saving the profile", async () => {
    useAuth.mockReturnValue({
      signedIn: true,
      user: { name: "Jane Doe", role: "tenant" },
      logout: jest.fn(),
      updateUser: jest.fn(),
    });
    fetchSavedSearches.mockResolvedValue([]);

    const { getByText, getByLabelText } = await render(<AccountScreen />);

    await fireEvent.press(getByText("Edit"));
    await fireEvent.changeText(getByLabelText("Name"), "   ");
    await fireEvent.press(getByText("Save"));

    await waitFor(() => expect(getByText("Name is required.")).toBeTruthy());
    expect(updateCurrentUser).not.toHaveBeenCalled();
  });

  it("changes the password when the new password and confirmation match", async () => {
    useAuth.mockReturnValue({
      signedIn: true,
      user: { name: "Jane Doe", role: "tenant" },
      logout: jest.fn(),
      updateUser: jest.fn(),
    });
    fetchSavedSearches.mockResolvedValue([]);
    changeCurrentUserPassword.mockResolvedValue({ message: "Password updated" });

    const { getByText, getByLabelText, getAllByText } = await render(<AccountScreen />);

    await fireEvent.changeText(getByLabelText("Current password"), "oldpass123");
    await fireEvent.changeText(getByLabelText("New password"), "newpass123");
    await fireEvent.changeText(getByLabelText("Confirm new password"), "newpass123");
    await fireEvent.press(getAllByText("Change password").at(-1));

    await waitFor(() =>
      expect(changeCurrentUserPassword).toHaveBeenCalledWith({
        currentPassword: "oldpass123",
        newPassword: "newpass123",
      })
    );
    await waitFor(() => expect(getByText("Password updated.")).toBeTruthy());
  });

  it("blocks the password change client-side when confirmation doesn't match", async () => {
    useAuth.mockReturnValue({
      signedIn: true,
      user: { name: "Jane Doe", role: "tenant" },
      logout: jest.fn(),
      updateUser: jest.fn(),
    });
    fetchSavedSearches.mockResolvedValue([]);

    const { getByText, getByLabelText, getAllByText } = await render(<AccountScreen />);

    await fireEvent.changeText(getByLabelText("Current password"), "oldpass123");
    await fireEvent.changeText(getByLabelText("New password"), "newpass123");
    await fireEvent.changeText(getByLabelText("Confirm new password"), "mismatch123");
    await fireEvent.press(getAllByText("Change password").at(-1));

    await waitFor(() => expect(getByText("New password and confirmation don't match.")).toBeTruthy());
    expect(changeCurrentUserPassword).not.toHaveBeenCalled();
  });

  it("confirms before signing out", async () => {
    const logout = jest.fn();
    useAuth.mockReturnValue({
      signedIn: true,
      user: { name: "Jane Doe", role: "tenant" },
      logout,
    });
    fetchSavedSearches.mockResolvedValue([]);
    jest.spyOn(Alert, "alert").mockImplementation((title, message, buttons) => {
      buttons.find((button) => button.text === "Sign out").onPress();
    });

    const { getByText } = await render(<AccountScreen />);

    fireEvent.press(getByText("Sign out"));

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("opens the Terms and Privacy pages via the device browser", async () => {
    useAuth.mockReturnValue({
      signedIn: true,
      user: { name: "Jane Doe", role: "tenant" },
      logout: jest.fn(),
    });
    fetchSavedSearches.mockResolvedValue([]);
    jest.spyOn(Linking, "openURL").mockResolvedValue();

    const { getByText } = await render(<AccountScreen />);

    await fireEvent.press(getByText("Terms of Service"));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining("/terms"));

    await fireEvent.press(getByText("Privacy & Data Protection"));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining("/privacy"));
  });

  it("shows a copyright line with the current year", async () => {
    useAuth.mockReturnValue({
      signedIn: true,
      user: { name: "Jane Doe", role: "tenant" },
      logout: jest.fn(),
    });
    fetchSavedSearches.mockResolvedValue([]);

    const { getByText } = await render(<AccountScreen />);

    expect(getByText(`© ${new Date().getFullYear()} KejaApp`)).toBeTruthy();
  });

  it("keeps the delete-account button disabled until the confirmation text exactly matches DELETE", async () => {
    useAuth.mockReturnValue({
      signedIn: true,
      user: { name: "Jane Doe", role: "tenant" },
      logout: jest.fn(),
    });
    fetchSavedSearches.mockResolvedValue([]);
    jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByText, getByLabelText } = await render(<AccountScreen />);

    await fireEvent.changeText(getByLabelText("Type DELETE to confirm"), "delete");
    await fireEvent.press(getByText("Delete my account"));
    expect(Alert.alert).not.toHaveBeenCalled();

    await fireEvent.changeText(getByLabelText("Type DELETE to confirm"), "DELETE");
    await fireEvent.press(getByText("Delete my account"));
    expect(Alert.alert).toHaveBeenCalledTimes(1);
  });

  it("deletes the account and signs out after confirming", async () => {
    const logout = jest.fn();
    useAuth.mockReturnValue({
      signedIn: true,
      user: { name: "Jane Doe", role: "tenant" },
      logout,
    });
    fetchSavedSearches.mockResolvedValue([]);
    deleteCurrentAccount.mockResolvedValue({ message: "Account and associated data deleted" });
    jest.spyOn(Alert, "alert").mockImplementation((title, message, buttons) => {
      buttons.find((button) => button.text === "Delete my account").onPress();
    });

    const { getByText, getByLabelText } = await render(<AccountScreen />);

    await fireEvent.changeText(getByLabelText("Type DELETE to confirm"), "DELETE");
    await fireEvent.press(getByText("Delete my account"));

    await waitFor(() => expect(deleteCurrentAccount).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
  });

  it("shows an error and stays signed in if account deletion fails", async () => {
    const logout = jest.fn();
    useAuth.mockReturnValue({
      signedIn: true,
      user: { name: "Jane Doe", role: "tenant" },
      logout,
    });
    fetchSavedSearches.mockResolvedValue([]);
    deleteCurrentAccount.mockRejectedValue(new Error("Network down"));
    jest.spyOn(Alert, "alert").mockImplementation((title, message, buttons) => {
      buttons.find((button) => button.text === "Delete my account").onPress();
    });

    const { getByText, getByLabelText } = await render(<AccountScreen />);

    await fireEvent.changeText(getByLabelText("Type DELETE to confirm"), "DELETE");
    await fireEvent.press(getByText("Delete my account"));

    await waitFor(() => expect(getByText("Network down")).toBeTruthy());
    expect(logout).not.toHaveBeenCalled();
  });
});
