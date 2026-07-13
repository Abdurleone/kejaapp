import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import AccountScreen from "./AccountScreen.js";
import { lightColors } from "../../theme/colors.js";

const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock("../../context/AuthContext.js", () => ({ useAuth: jest.fn() }));
jest.mock("../../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
jest.mock("../../api/index.js", () => ({
  deleteSavedSearch: jest.fn(),
  fetchSavedSearches: jest.fn(),
}));

import { useAuth } from "../../context/AuthContext.js";
import { useTheme } from "../../context/ThemeContext.js";
import { deleteSavedSearch, fetchSavedSearches } from "../../api/index.js";

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
});
