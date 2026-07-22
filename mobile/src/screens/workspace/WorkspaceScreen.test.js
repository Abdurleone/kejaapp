import { fireEvent, render, waitFor } from "@testing-library/react-native";
import WorkspaceScreen from "./WorkspaceScreen.js";
import { lightColors } from "../../theme/colors.js";

const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (callback) => require("react").useEffect(callback, [callback]),
}));

jest.mock("../../context/AuthContext.js", () => ({ useAuth: jest.fn() }));
jest.mock("../../context/SettingsContext.js", () => ({
  useSettings: jest.fn(),
  resolveAssetUrl: jest.fn(() => null),
}));
jest.mock("../../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
jest.mock("../../api/index.js", () => ({
  fetchMyProperties: jest.fn(),
  fetchReceivedInquiries: jest.fn(),
  respondToInquiry: jest.fn(),
  fetchReceivedViewingRequests: jest.fn(),
  updateViewingRequestStatus: jest.fn(),
}));

import { useAuth } from "../../context/AuthContext.js";
import { useSettings } from "../../context/SettingsContext.js";
import { useTheme } from "../../context/ThemeContext.js";
import {
  fetchMyProperties,
  fetchReceivedInquiries,
  respondToInquiry,
  fetchReceivedViewingRequests,
  updateViewingRequestStatus,
} from "../../api/index.js";

describe("WorkspaceScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSettings.mockReturnValue({ apiBaseUrl: "http://localhost:5000" });
    useTheme.mockReturnValue({ colors: lightColors });
    fetchMyProperties.mockResolvedValue({ properties: [], pagination: { page: 1, pages: 1, total: 0 } });
    fetchReceivedInquiries.mockResolvedValue({ inquiries: [], pagination: { page: 1, pages: 1, total: 0 } });
    fetchReceivedViewingRequests.mockResolvedValue({
      viewingRequests: [],
      pagination: { page: 1, pages: 1, total: 0 },
    });
  });

  it("prompts sign-in when signed out", async () => {
    useAuth.mockReturnValue({ signedIn: false, user: null });

    const { getByText } = await render(<WorkspaceScreen />);

    expect(getByText("Sign in required")).toBeTruthy();
  });

  it("requires a landlord/agency account", async () => {
    useAuth.mockReturnValue({ signedIn: true, user: { role: "tenant" } });

    const { getByText } = await render(<WorkspaceScreen />);

    expect(getByText("Owner or agency account required")).toBeTruthy();
  });

  it("fetches listings, inquiries, and viewing requests exactly once each on mount, not twice", async () => {
    useAuth.mockReturnValue({ signedIn: true, user: { role: "landlord" } });

    await render(<WorkspaceScreen />);

    await waitFor(() => expect(fetchMyProperties).toHaveBeenCalledTimes(1));
    expect(fetchReceivedInquiries).toHaveBeenCalledTimes(1);
    expect(fetchReceivedViewingRequests).toHaveBeenCalledTimes(1);
  });

  it("lists the owner's properties and opens the edit screen on tap", async () => {
    useAuth.mockReturnValue({ signedIn: true, user: { role: "landlord" } });
    fetchMyProperties.mockResolvedValue({
      properties: [{ _id: "p1", title: "Cozy studio", price: { rent: 15000 } }],
      pagination: { page: 1, pages: 1, total: 1 },
    });

    const { getByText } = await render(<WorkspaceScreen />);

    await waitFor(() => expect(getByText("Cozy studio")).toBeTruthy());

    fireEvent.press(getByText("Cozy studio"));

    expect(mockNavigate).toHaveBeenCalledWith("PropertyEdit", { propertyId: "p1" });
  });

  it("shows received inquiries in the Inquiries segment and replies to one", async () => {
    useAuth.mockReturnValue({ signedIn: true, user: { role: "landlord" } });
    fetchReceivedInquiries.mockResolvedValue({
      inquiries: [
        {
          _id: "i1",
          status: "open",
          message: "Is this still available?",
          property: { title: "Cozy studio" },
          sender: { name: "Jane Doe" },
        },
      ],
      pagination: { page: 1, pages: 1, total: 1 },
    });
    respondToInquiry.mockResolvedValue({
      _id: "i1",
      status: "responded",
      message: "Is this still available?",
      response: "Yes, it is!",
      property: { title: "Cozy studio" },
      sender: { name: "Jane Doe" },
    });

    const { getByText, getByPlaceholderText } = await render(<WorkspaceScreen />);

    fireEvent.press(getByText("Inquiries"));

    await waitFor(() => expect(getByText("Is this still available?")).toBeTruthy());

    const responseInput = getByPlaceholderText("Write a response (optional)");
    fireEvent.changeText(responseInput, "Yes, it is!");
    await waitFor(() => expect(responseInput.props.value).toBe("Yes, it is!"));

    fireEvent.press(getByText("Send response"));

    await waitFor(() => expect(getByText("Yes, it is!")).toBeTruthy());
    expect(respondToInquiry).toHaveBeenCalledWith("i1", { status: "responded", response: "Yes, it is!" });
  });

  it("shows received viewing requests in the Viewing requests segment and approves one", async () => {
    useAuth.mockReturnValue({ signedIn: true, user: { role: "landlord" } });
    fetchReceivedViewingRequests.mockResolvedValue({
      viewingRequests: [
        {
          _id: "v1",
          status: "pending",
          message: "Can I view this Saturday morning?",
          property: { title: "Cozy studio" },
          requester: { name: "Jane Doe" },
        },
      ],
      pagination: { page: 1, pages: 1, total: 1 },
    });
    updateViewingRequestStatus.mockResolvedValue({
      _id: "v1",
      status: "approved",
      message: "Can I view this Saturday morning?",
      property: { title: "Cozy studio" },
      requester: { name: "Jane Doe" },
    });

    const { getByText } = await render(<WorkspaceScreen />);

    fireEvent.press(getByText("Viewing requests"));

    await waitFor(() => expect(getByText("Can I view this Saturday morning?")).toBeTruthy());

    fireEvent.press(getByText("Approve"));

    await waitFor(() => expect(updateViewingRequestStatus).toHaveBeenCalledWith("v1", { status: "approved" }));
    await waitFor(() => expect(() => getByText("Approve")).toThrow());
  });

  it("rejects a pending viewing request", async () => {
    useAuth.mockReturnValue({ signedIn: true, user: { role: "landlord" } });
    fetchReceivedViewingRequests.mockResolvedValue({
      viewingRequests: [
        {
          _id: "v1",
          status: "pending",
          message: "Can I view this Saturday morning?",
          property: { title: "Cozy studio" },
          requester: { name: "Jane Doe" },
        },
      ],
      pagination: { page: 1, pages: 1, total: 1 },
    });
    updateViewingRequestStatus.mockResolvedValue({
      _id: "v1",
      status: "rejected",
      message: "Can I view this Saturday morning?",
      property: { title: "Cozy studio" },
      requester: { name: "Jane Doe" },
    });

    const { getByText } = await render(<WorkspaceScreen />);

    fireEvent.press(getByText("Viewing requests"));

    await waitFor(() => expect(getByText("Can I view this Saturday morning?")).toBeTruthy());

    fireEvent.press(getByText("Reject"));

    await waitFor(() => expect(updateViewingRequestStatus).toHaveBeenCalledWith("v1", { status: "rejected" }));
    await waitFor(() => expect(() => getByText("Reject")).toThrow());
  });
});
