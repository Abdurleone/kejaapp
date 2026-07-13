import { fireEvent, render, waitFor } from "@testing-library/react-native";
import DiscoverScreen from "./DiscoverScreen.js";
import { lightColors } from "../../theme/colors.js";

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));
jest.mock("../../context/AuthContext.js", () => ({ useAuth: jest.fn() }));
jest.mock("../../context/SettingsContext.js", () => ({
  useSettings: jest.fn(),
  resolveAssetUrl: jest.fn(() => null),
}));
jest.mock("../../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
jest.mock("../../api/index.js", () => ({
  createSavedSearch: jest.fn(),
  fetchFavorites: jest.fn(),
  fetchProperties: jest.fn(),
  saveFavorite: jest.fn(),
}));

import * as Location from "expo-location";
import { useAuth } from "../../context/AuthContext.js";
import { useSettings } from "../../context/SettingsContext.js";
import { useTheme } from "../../context/ThemeContext.js";
import { createSavedSearch, fetchFavorites, fetchProperties, saveFavorite } from "../../api/index.js";

const property = { _id: "p1", title: "Cozy studio", price: { rent: 15000 } };

describe("DiscoverScreen", () => {
  let navigation;

  beforeEach(() => {
    jest.clearAllMocks();
    useSettings.mockReturnValue({ apiBaseUrl: "http://localhost:5000" });
    useTheme.mockReturnValue({ colors: lightColors });
    useAuth.mockReturnValue({ signedIn: false });
    fetchProperties.mockResolvedValue([property]);
    fetchFavorites.mockResolvedValue([]);
    navigation = { navigate: jest.fn() };
  });

  it("lists properties and opens the detail screen on tap", async () => {
    const { getByText } = await render(<DiscoverScreen navigation={navigation} />);

    await waitFor(() => expect(getByText("Cozy studio")).toBeTruthy());

    fireEvent.press(getByText("Cozy studio"));

    expect(navigation.navigate).toHaveBeenCalledWith("PropertyDetail", { propertyId: "p1" });
  });

  it("redirects to sign in when saving a favorite while signed out", async () => {
    const { getByText } = await render(<DiscoverScreen navigation={navigation} />);

    await waitFor(() => expect(getByText("Cozy studio")).toBeTruthy());

    fireEvent.press(getByText("Save"));

    expect(navigation.navigate).toHaveBeenCalledWith("Login");
    expect(saveFavorite).not.toHaveBeenCalled();
  });

  it("saves a favorite when signed in", async () => {
    useAuth.mockReturnValue({ signedIn: true });
    saveFavorite.mockResolvedValue();

    const { getByText } = await render(<DiscoverScreen navigation={navigation} />);

    await waitFor(() => expect(getByText("Cozy studio")).toBeTruthy());

    fireEvent.press(getByText("Save"));

    await waitFor(() => expect(saveFavorite).toHaveBeenCalledWith("p1"));
  });

  it("finds nearby properties and offers to save the search", async () => {
    useAuth.mockReturnValue({ signedIn: true });
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
    Location.getCurrentPositionAsync.mockResolvedValue({ coords: { latitude: -1.3, longitude: 36.8 } });
    createSavedSearch.mockResolvedValue({});

    const { getByText } = await render(<DiscoverScreen navigation={navigation} />);

    await waitFor(() => expect(getByText("Cozy studio")).toBeTruthy());

    fireEvent.press(getByText("Near me"));

    await waitFor(() =>
      expect(fetchProperties).toHaveBeenCalledWith(
        expect.objectContaining({ lat: -1.3, lng: 36.8, radiusKm: 5 })
      )
    );

    fireEvent.press(getByText("Save search"));

    await waitFor(() =>
      expect(getByText("Saved! We'll notify you when a matching listing appears.")).toBeTruthy()
    );
    expect(createSavedSearch).toHaveBeenCalledWith({ lat: -1.3, lng: 36.8, radiusKm: 5 });
  });

  it("shows a location error when permission is denied", async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: "denied" });

    const { getByText } = await render(<DiscoverScreen navigation={navigation} />);

    await waitFor(() => expect(getByText("Cozy studio")).toBeTruthy());

    fireEvent.press(getByText("Near me"));

    await waitFor(() => expect(getByText("Location permission was denied.")).toBeTruthy());
  });

  it("filters by type and bedrooms, and applies a price range", async () => {
    const { getByText, getByPlaceholderText } = await render(<DiscoverScreen navigation={navigation} />);

    await waitFor(() => expect(getByText("Cozy studio")).toBeTruthy());

    fireEvent.press(getByText("Studio"));
    await waitFor(() => expect(fetchProperties).toHaveBeenCalledWith(expect.objectContaining({ type: "studio" })));

    fireEvent.press(getByText("2+"));
    await waitFor(() => expect(fetchProperties).toHaveBeenCalledWith(expect.objectContaining({ bedrooms: "2" })));

    const minInput = getByPlaceholderText("Min rent");
    const maxInput = getByPlaceholderText("Max rent");
    fireEvent.changeText(minInput, "10000");
    await waitFor(() => expect(minInput.props.value).toBe("10000"));

    fireEvent.changeText(maxInput, "20000");
    await waitFor(() => expect(maxInput.props.value).toBe("20000"));

    fireEvent.press(getByText("Apply price"));

    await waitFor(() =>
      expect(fetchProperties).toHaveBeenLastCalledWith(
        expect.objectContaining({ minRent: "10000", maxRent: "20000", type: "studio", bedrooms: "2" })
      )
    );
  });

  it("includes type/bedrooms/price in a saved search", async () => {
    useAuth.mockReturnValue({ signedIn: true });
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
    Location.getCurrentPositionAsync.mockResolvedValue({ coords: { latitude: -1.3, longitude: 36.8 } });
    createSavedSearch.mockResolvedValue({});

    const { getByText, getByPlaceholderText } = await render(<DiscoverScreen navigation={navigation} />);

    await waitFor(() => expect(getByText("Cozy studio")).toBeTruthy());

    fireEvent.press(getByText("Studio"));
    await waitFor(() => expect(fetchProperties).toHaveBeenCalledWith(expect.objectContaining({ type: "studio" })));

    const minInput = getByPlaceholderText("Min rent");
    fireEvent.changeText(minInput, "10000");
    await waitFor(() => expect(minInput.props.value).toBe("10000"));

    fireEvent.press(getByText("Near me"));
    await waitFor(() => expect(fetchProperties).toHaveBeenCalledWith(expect.objectContaining({ lat: -1.3 })));

    fireEvent.press(getByText("Save search"));

    await waitFor(() =>
      expect(createSavedSearch).toHaveBeenCalledWith({
        lat: -1.3,
        lng: 36.8,
        radiusKm: 5,
        type: "studio",
        minRent: 10000,
      })
    );
    await waitFor(() =>
      expect(getByText("Saved! We'll notify you when a matching listing appears.")).toBeTruthy()
    );
  });
});
