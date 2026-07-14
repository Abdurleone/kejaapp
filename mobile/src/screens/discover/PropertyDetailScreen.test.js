import { fireEvent, render, waitFor } from "@testing-library/react-native";
import PropertyDetailScreen from "./PropertyDetailScreen.js";
import { lightColors } from "../../theme/colors.js";

jest.mock("../../context/AuthContext.js", () => ({ useAuth: jest.fn() }));
jest.mock("../../context/SettingsContext.js", () => ({
  useSettings: jest.fn(),
  resolveAssetUrl: jest.fn(() => null),
}));
jest.mock("../../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
jest.mock("../../api/index.js", () => ({
  fetchProperty: jest.fn(),
  fetchFavorites: jest.fn(),
  fetchPropertyMovers: jest.fn(),
  saveFavorite: jest.fn(),
}));

import { useAuth } from "../../context/AuthContext.js";
import { useSettings } from "../../context/SettingsContext.js";
import { useTheme } from "../../context/ThemeContext.js";
import { fetchFavorites, fetchProperty, fetchPropertyMovers, saveFavorite } from "../../api/index.js";
import { formatKes } from "../../utils/format.js";

const baseProperty = {
  _id: "p1",
  title: "Cozy studio",
  description: "Near town",
  location: { area: "Chiromo", county: "Nairobi" },
  bedrooms: 1,
  bathrooms: 1,
  viewingType: "scheduled",
  status: "available",
  ratingAverage: 4.5,
  ratingCount: 3,
  owner: { _id: "owner1", name: "Jane Landlord", role: "landlord" },
  costSummary: { rent: 15000, deposit: 15000, agencyFee: 0, firstMonthTotal: 30000, upfrontTotal: 30000 },
  contact: {},
  amenities: [],
};

const renderScreen = (navigation = { navigate: jest.fn() }) =>
  render(<PropertyDetailScreen route={{ params: { propertyId: "p1" } }} navigation={navigation} />);

describe("PropertyDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTheme.mockReturnValue({ colors: lightColors });
    useSettings.mockReturnValue({ apiBaseUrl: "http://localhost:5000" });
    fetchFavorites.mockResolvedValue([]);
    fetchPropertyMovers.mockResolvedValue({ affiliates: [], nearby: [] });
  });

  it("prompts sign-in when signed out", async () => {
    useAuth.mockReturnValue({ signedIn: false, user: null });
    const navigate = jest.fn();

    const { getByText } = await renderScreen({ navigate });

    expect(getByText("Sign in to continue")).toBeTruthy();
    await fireEvent.press(getByText("Sign in"));
    expect(navigate).toHaveBeenCalledWith("Login");
    expect(fetchProperty).not.toHaveBeenCalled();
  });

  it("tells movers this page isn't for them, without fetching anything", async () => {
    useAuth.mockReturnValue({ signedIn: true, user: { _id: "u1", role: "mover" } });

    const { getByText } = await renderScreen();

    expect(getByText("Not available for movers")).toBeTruthy();
    expect(fetchProperty).not.toHaveBeenCalled();
  });

  it("loads and renders a listing's full details for a tenant", async () => {
    useAuth.mockReturnValue({ signedIn: true, user: { _id: "u1", role: "tenant" } });
    fetchProperty.mockResolvedValue(baseProperty);

    const { getAllByText, getByText, findByText } = await renderScreen();

    expect(await findByText("Cozy studio")).toBeTruthy();
    expect(getByText("Chiromo, Nairobi")).toBeTruthy();
    // firstMonthTotal and upfrontTotal are both 30000 in this fixture, so
    // both CostRow entries render the identical formatted string.
    expect(getAllByText(formatKes(30000)).length).toBe(2);
  });

  it("blocks a landlord from viewing another owner's listing", async () => {
    useAuth.mockReturnValue({ signedIn: true, user: { _id: "otherOwner", role: "landlord" } });
    fetchProperty.mockResolvedValue(baseProperty);

    const { findByText } = await renderScreen();

    expect(await findByText("Not your listing")).toBeTruthy();
  });

  it("lets the owner view their own listing", async () => {
    useAuth.mockReturnValue({ signedIn: true, user: { _id: "owner1", role: "landlord" } });
    fetchProperty.mockResolvedValue(baseProperty);

    const { findByText } = await renderScreen();

    expect(await findByText("Cozy studio")).toBeTruthy();
  });

  it("saves the listing as a favorite", async () => {
    useAuth.mockReturnValue({ signedIn: true, user: { _id: "u1", role: "tenant" } });
    fetchProperty.mockResolvedValue(baseProperty);
    saveFavorite.mockResolvedValue({});

    const { findByText, getByText } = await renderScreen();
    await findByText("Cozy studio");

    await fireEvent.press(getByText("Save"));

    await waitFor(() => expect(getByText("Saved")).toBeTruthy());
    expect(saveFavorite).toHaveBeenCalledWith("p1");
  });

  it("shows a retry action when loading fails, and retries on demand", async () => {
    useAuth.mockReturnValue({ signedIn: true, user: { _id: "u1", role: "tenant" } });
    fetchProperty.mockRejectedValueOnce(new Error("Network error"));
    fetchProperty.mockResolvedValueOnce(baseProperty);

    const { findByText, getByText } = await renderScreen();

    expect(await findByText("Network error")).toBeTruthy();

    await fireEvent.press(getByText("Retry"));

    expect(await findByText("Cozy studio")).toBeTruthy();
    expect(fetchProperty).toHaveBeenCalledTimes(2);
  });

  it("navigates to the inquiry and viewing-request forms", async () => {
    useAuth.mockReturnValue({ signedIn: true, user: { _id: "u1", role: "tenant" } });
    fetchProperty.mockResolvedValue(baseProperty);
    const navigate = jest.fn();

    const { findByText, getByText } = await renderScreen({ navigate });
    await findByText("Cozy studio");

    await fireEvent.press(getByText("Send inquiry"));
    expect(navigate).toHaveBeenCalledWith("InquiryForm", { propertyId: "p1", viewingType: "scheduled" });

    await fireEvent.press(getByText("Request viewing"));
    expect(navigate).toHaveBeenCalledWith("ViewingRequestForm", { propertyId: "p1", viewingType: "scheduled" });
  });
});
