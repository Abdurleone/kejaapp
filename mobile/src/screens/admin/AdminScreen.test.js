import { fireEvent, render, waitFor } from "@testing-library/react-native";
import AdminScreen from "./AdminScreen.js";
import { lightColors } from "../../theme/colors.js";

const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock("../../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
jest.mock("../../api/index.js", () => ({
  fetchAdminUsers: jest.fn(),
  fetchAdminReviews: jest.fn(),
  fetchReportedReviews: jest.fn(),
  hideReview: jest.fn(),
  dismissReviewReport: jest.fn(),
}));

import { useTheme } from "../../context/ThemeContext.js";
import {
  fetchAdminUsers,
  fetchAdminReviews,
  fetchReportedReviews,
  hideReview,
  dismissReviewReport,
} from "../../api/index.js";

describe("AdminScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTheme.mockReturnValue({ colors: lightColors });
  });

  it("lists users and navigates to the detail screen on tap", async () => {
    fetchAdminUsers.mockResolvedValue({
      users: [{ _id: "u1", name: "Jane Doe", email: "jane@example.com", role: "tenant", accountStatus: "active" }],
      pagination: { page: 1, pages: 1, total: 1 },
    });

    const { getByText } = await render(<AdminScreen />);

    await waitFor(() => expect(getByText("Jane Doe")).toBeTruthy());

    fireEvent.press(getByText("Jane Doe"));

    expect(mockNavigate).toHaveBeenCalledWith("AdminUserDetail", { userId: "u1" });
  });

  it("shows an empty state when no users match the search", async () => {
    fetchAdminUsers.mockResolvedValue({ users: [], pagination: { page: 1, pages: 1, total: 0 } });

    const { getByText } = await render(<AdminScreen />);

    await waitFor(() => expect(getByText("No users match this search")).toBeTruthy());
  });

  it("can filter the user list down to the mover role", async () => {
    // Regression test: the Mover role chip was missing entirely from
    // roleFilters, even though the backend and web frontend both already
    // supported filtering by it - an admin on mobile had no way to narrow
    // the user list down to mover accounts.
    fetchAdminUsers.mockResolvedValue({ users: [], pagination: { page: 1, pages: 1, total: 0 } });

    const { getByText } = await render(<AdminScreen />);

    await waitFor(() => expect(fetchAdminUsers).toHaveBeenCalledTimes(1));

    fireEvent.press(getByText("Mover"));

    await waitFor(() =>
      expect(fetchAdminUsers).toHaveBeenLastCalledWith(expect.objectContaining({ role: "mover" }))
    );
  });

  it("switches to the Reviews segment and shows a read-only review list", async () => {
    fetchAdminUsers.mockResolvedValue({ users: [], pagination: { page: 1, pages: 1, total: 0 } });
    fetchAdminReviews.mockResolvedValue([
      {
        _id: "r1",
        rating: 4,
        comment: "Great place",
        property: { title: "Cozy studio" },
        user: { name: "Jane Doe" },
        ownerResponse: null,
      },
    ]);

    const { getByText, queryByText } = await render(<AdminScreen />);

    await waitFor(() => expect(getByText("No users match this search")).toBeTruthy());

    fireEvent.press(getByText("Reviews"));

    await waitFor(() => expect(getByText("Great place")).toBeTruthy());
    expect(getByText("Cozy studio")).toBeTruthy();
    // Read-only: no action buttons rendered anywhere in the review card.
    expect(queryByText("Remove")).toBeNull();
    expect(queryByText("Delete")).toBeNull();
  });

  it("shows report reason/reporter and Hide/Dismiss actions on the Reported sub-tab", async () => {
    fetchAdminUsers.mockResolvedValue({ users: [], pagination: { page: 1, pages: 1, total: 0 } });
    fetchAdminReviews.mockResolvedValue([]);
    fetchReportedReviews.mockResolvedValue([
      {
        _id: "r1",
        rating: 2,
        comment: "Not accurate",
        property: { title: "Cozy studio" },
        user: { name: "Jane Doe" },
        report: { reason: "Fake review", reportedBy: { name: "Amina" } },
      },
    ]);

    const { getByText, queryByText } = await render(<AdminScreen />);

    await waitFor(() => expect(getByText("No users match this search")).toBeTruthy());
    fireEvent.press(getByText("Reviews"));
    await waitFor(() => expect(getByText("No reviews yet")).toBeTruthy());

    fireEvent.press(getByText("Reported"));

    await waitFor(() => expect(getByText("Fake review")).toBeTruthy());
    expect(getByText("Reported by Amina")).toBeTruthy();
    expect(getByText("Hide")).toBeTruthy();
    expect(getByText("Dismiss")).toBeTruthy();
    expect(queryByText("No reviews yet")).toBeNull();
  });

  it("removes a review from the Reported list after Hide", async () => {
    fetchAdminUsers.mockResolvedValue({ users: [], pagination: { page: 1, pages: 1, total: 0 } });
    fetchAdminReviews.mockResolvedValue([]);
    fetchReportedReviews.mockResolvedValue([
      {
        _id: "r1",
        rating: 2,
        comment: "Not accurate",
        property: { title: "Cozy studio" },
        user: { name: "Jane Doe" },
        report: { reason: "Fake review", reportedBy: { name: "Amina" } },
      },
    ]);
    hideReview.mockResolvedValue({});

    const { getByText, queryByText } = await render(<AdminScreen />);

    await waitFor(() => expect(getByText("No users match this search")).toBeTruthy());
    fireEvent.press(getByText("Reviews"));
    await waitFor(() => expect(getByText("No reviews yet")).toBeTruthy());
    fireEvent.press(getByText("Reported"));
    await waitFor(() => expect(getByText("Fake review")).toBeTruthy());

    fireEvent.press(getByText("Hide"));

    await waitFor(() => expect(hideReview).toHaveBeenCalledWith("r1"));
    await waitFor(() => expect(queryByText("Fake review")).toBeNull());
  });

  it("removes a review from the Reported list after Dismiss", async () => {
    fetchAdminUsers.mockResolvedValue({ users: [], pagination: { page: 1, pages: 1, total: 0 } });
    fetchAdminReviews.mockResolvedValue([]);
    fetchReportedReviews.mockResolvedValue([
      {
        _id: "r1",
        rating: 2,
        comment: "Not accurate",
        property: { title: "Cozy studio" },
        user: { name: "Jane Doe" },
        report: { reason: "Fake review", reportedBy: { name: "Amina" } },
      },
    ]);
    dismissReviewReport.mockResolvedValue({});

    const { getByText, queryByText } = await render(<AdminScreen />);

    await waitFor(() => expect(getByText("No users match this search")).toBeTruthy());
    fireEvent.press(getByText("Reviews"));
    await waitFor(() => expect(getByText("No reviews yet")).toBeTruthy());
    fireEvent.press(getByText("Reported"));
    await waitFor(() => expect(getByText("Fake review")).toBeTruthy());

    fireEvent.press(getByText("Dismiss"));

    await waitFor(() => expect(dismissReviewReport).toHaveBeenCalledWith("r1"));
    await waitFor(() => expect(queryByText("Fake review")).toBeNull());
  });
});
