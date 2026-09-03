import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import RequestsScreen from "./RequestsScreen.js";
import { lightColors } from "../../theme/colors.js";

let mockFocusCallback = null;
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: (callback) => {
    mockFocusCallback = callback;
    return require("react").useEffect(callback, [callback]);
  },
}));
jest.mock("../../context/AuthContext.js", () => ({ useAuth: jest.fn() }));
jest.mock("../../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
jest.mock("../../api/index.js", () => ({
  fetchInquiries: jest.fn(),
  fetchViewingRequests: jest.fn(),
}));

import { useAuth } from "../../context/AuthContext.js";
import { useTheme } from "../../context/ThemeContext.js";
import { fetchInquiries, fetchViewingRequests } from "../../api/index.js";

describe("RequestsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTheme.mockReturnValue({ colors: lightColors });
  });

  it("prompts sign-in when signed out", async () => {
    useAuth.mockReturnValue({ signedIn: false });

    const { getByText } = await render(<RequestsScreen />);

    expect(getByText("Sign in required")).toBeTruthy();
  });

  it("shows inquiries by default, including an owner's response", async () => {
    useAuth.mockReturnValue({ signedIn: true });
    fetchInquiries.mockResolvedValue({
      inquiries: [
        {
          _id: "i1",
          status: "responded",
          message: "Is this available?",
          response: "Yes, still available!",
          property: { title: "Cozy studio" },
        },
      ],
      pagination: { page: 1, pages: 1, total: 1 },
    });
    fetchViewingRequests.mockResolvedValue({ viewingRequests: [], pagination: { page: 1, pages: 1, total: 0 } });

    const { getByText } = await render(<RequestsScreen />);

    await waitFor(() => expect(getByText("Cozy studio")).toBeTruthy());
    expect(getByText("Yes, still available!")).toBeTruthy();
  });

  it("refetches on refocus, so a newly-sent inquiry shows up without a manual pull-to-refresh", async () => {
    useAuth.mockReturnValue({ signedIn: true });
    fetchInquiries.mockResolvedValueOnce({ inquiries: [], pagination: { page: 1, pages: 1, total: 0 } });
    fetchViewingRequests.mockResolvedValue({ viewingRequests: [], pagination: { page: 1, pages: 1, total: 0 } });

    const { findByText } = await render(<RequestsScreen />);
    await findByText("No inquiries yet");

    fetchInquiries.mockResolvedValueOnce({
      inquiries: [{ _id: "i1", status: "pending", message: "Is this available?", property: { title: "Cozy studio" } }],
      pagination: { page: 1, pages: 1, total: 1 },
    });

    await act(async () => {
      await mockFocusCallback();
    });

    await findByText("Cozy studio");
  });

  it("switches to the Viewings tab", async () => {
    useAuth.mockReturnValue({ signedIn: true });
    fetchInquiries.mockResolvedValue({ inquiries: [], pagination: { page: 1, pages: 1, total: 0 } });
    fetchViewingRequests.mockResolvedValue({
      viewingRequests: [
        {
          _id: "v1",
          status: "approved",
          property: { title: "Cozy studio" },
          requestedDate: "2026-02-01T10:00:00.000Z",
        },
      ],
      pagination: { page: 1, pages: 1, total: 1 },
    });

    const { getByText } = await render(<RequestsScreen />);

    await waitFor(() => expect(getByText("No inquiries yet")).toBeTruthy());

    fireEvent.press(getByText("Viewings"));

    await waitFor(() => expect(getByText("Cozy studio")).toBeTruthy());
  });

  it("shows an empty state for viewings", async () => {
    useAuth.mockReturnValue({ signedIn: true });
    fetchInquiries.mockResolvedValue({ inquiries: [], pagination: { page: 1, pages: 1, total: 0 } });
    fetchViewingRequests.mockResolvedValue({ viewingRequests: [], pagination: { page: 1, pages: 1, total: 0 } });

    const { getByText } = await render(<RequestsScreen />);

    await waitFor(() => expect(getByText("No inquiries yet")).toBeTruthy());

    fireEvent.press(getByText("Viewings"));

    await waitFor(() => expect(getByText("No viewing requests yet")).toBeTruthy());
  });
});
