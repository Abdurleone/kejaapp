import { fireEvent, render, waitFor } from "@testing-library/react-native";
import DashboardScreen from "./DashboardScreen.js";
import { lightColors } from "../../theme/colors.js";

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock("../../context/AuthContext.js", () => ({ useAuth: jest.fn() }));
jest.mock("../../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
jest.mock("../../api/index.js", () => ({
  fetchDashboardSummary: jest.fn(),
  fetchPublicTestimonials: jest.fn(),
}));

import { useAuth } from "../../context/AuthContext.js";
import { useTheme } from "../../context/ThemeContext.js";
import { fetchDashboardSummary, fetchPublicTestimonials } from "../../api/index.js";

describe("DashboardScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTheme.mockReturnValue({ colors: lightColors });
    fetchPublicTestimonials.mockResolvedValue([]);
  });

  it("shows the landing page when signed out", async () => {
    useAuth.mockReturnValue({ signedIn: false, user: null });

    const { getByText } = await render(<DashboardScreen />);

    await waitFor(() => expect(getByText("Trusted listings")).toBeTruthy());
    expect(fetchDashboardSummary).not.toHaveBeenCalled();
  });

  it("shows a tenant's activity summary once loaded", async () => {
    useAuth.mockReturnValue({ signedIn: true, user: { role: "tenant", name: "Jane" } });
    fetchDashboardSummary.mockResolvedValue({
      notifications: { unread: 3 },
      tenant: {
        savedProperties: 2,
        inquiries: { open: 1 },
        viewings: { approved: 1 },
      },
    });

    const { getByText } = await render(<DashboardScreen />);

    await waitFor(() => expect(getByText("Your activity")).toBeTruthy());
    expect(getByText("3")).toBeTruthy();
    expect(getByText("Tenant overview for Jane.")).toBeTruthy();
  });

  it("shows an owner's listing summary", async () => {
    useAuth.mockReturnValue({ signedIn: true, user: { role: "landlord", name: "Owner Joe" } });
    fetchDashboardSummary.mockResolvedValue({
      notifications: { unread: 0 },
      owner: {
        properties: { available: 4 },
        incomingInquiries: { open: 2 },
        incomingViewings: { approved: 1 },
      },
    });

    const { getByText } = await render(<DashboardScreen />);

    await waitFor(() => expect(getByText("Your listings")).toBeTruthy());
    expect(getByText("4")).toBeTruthy();
  });

  it("shows a retry action when loading fails", async () => {
    useAuth.mockReturnValue({ signedIn: true, user: { role: "tenant" } });
    fetchDashboardSummary
      .mockRejectedValueOnce(new Error("Network down"))
      .mockResolvedValueOnce({ notifications: { unread: 0 }, tenant: { savedProperties: 0, inquiries: {}, viewings: {} } });

    const { getByText } = await render(<DashboardScreen />);

    await waitFor(() => expect(getByText("Network down")).toBeTruthy());

    fireEvent.press(getByText("Retry"));

    await waitFor(() => expect(getByText("Your activity")).toBeTruthy());
  });
});
