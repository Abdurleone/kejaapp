import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import SavedScreen from "./SavedScreen.js";
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
jest.mock("../../context/SettingsContext.js", () => ({
  useSettings: jest.fn(),
  resolveAssetUrl: jest.fn(() => null),
}));
jest.mock("../../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
jest.mock("../../api/index.js", () => ({
  fetchFavorites: jest.fn(),
  removeFavorite: jest.fn(),
}));

import { useAuth } from "../../context/AuthContext.js";
import { useSettings } from "../../context/SettingsContext.js";
import { useTheme } from "../../context/ThemeContext.js";
import { fetchFavorites, removeFavorite } from "../../api/index.js";

describe("SavedScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSettings.mockReturnValue({ apiBaseUrl: "http://localhost:5000" });
    useTheme.mockReturnValue({ colors: lightColors });
  });

  it("prompts sign-in when signed out", async () => {
    useAuth.mockReturnValue({ signedIn: false });

    const { getByText } = await render(<SavedScreen />);

    expect(getByText("Sign in required")).toBeTruthy();

    fireEvent.press(getByText("Sign in"));
    expect(mockNavigate).toHaveBeenCalledWith("Login");
  });

  it("lists saved properties and removes one", async () => {
    useAuth.mockReturnValue({ signedIn: true });
    fetchFavorites.mockResolvedValue([
      { _id: "fav1", property: { _id: "p1", title: "Cozy studio", price: { rent: 15000 } } },
    ]);
    removeFavorite.mockResolvedValue();

    const { getByText, queryByText } = await render(<SavedScreen />);

    await waitFor(() => expect(getByText("Cozy studio")).toBeTruthy());

    fireEvent.press(getByText("Remove from saved"));

    await waitFor(() => expect(queryByText("Cozy studio")).toBeNull());
    expect(removeFavorite).toHaveBeenCalledWith("p1");
  });

  it("refetches on refocus, so a favorite added elsewhere shows up without remounting", async () => {
    useAuth.mockReturnValue({ signedIn: true });
    fetchFavorites.mockResolvedValueOnce([]);

    const { findByText } = await render(<SavedScreen />);

    await findByText("No saved listings yet");

    fetchFavorites.mockResolvedValueOnce([
      { _id: "fav1", property: { _id: "p1", title: "Cozy studio", price: { rent: 15000 } } },
    ]);

    await act(async () => {
      await mockFocusCallback();
    });

    await findByText("Cozy studio");
  });

  it("shows an empty state with no saved properties", async () => {
    useAuth.mockReturnValue({ signedIn: true });
    fetchFavorites.mockResolvedValue([]);

    const { getByText } = await render(<SavedScreen />);

    await waitFor(() => expect(getByText("No saved listings yet")).toBeTruthy());

    fireEvent.press(getByText("Browse listings"));
    expect(mockNavigate).toHaveBeenCalledWith("Discover");
  });

  it("shows a retry action when loading fails", async () => {
    useAuth.mockReturnValue({ signedIn: true });
    fetchFavorites.mockRejectedValueOnce(new Error("Network down")).mockResolvedValueOnce([]);

    const { getByText } = await render(<SavedScreen />);

    await waitFor(() => expect(getByText("Network down")).toBeTruthy());

    fireEvent.press(getByText("Retry"));

    await waitFor(() => expect(getByText("No saved listings yet")).toBeTruthy());
  });
});
