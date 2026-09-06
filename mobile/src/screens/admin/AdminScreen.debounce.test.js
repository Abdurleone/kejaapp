import { fireEvent, render, waitFor } from "@testing-library/react-native";
import AdminScreen from "./AdminScreen.js";
import { lightColors } from "../../theme/colors.js";

// Kept in its own file (separate from AdminScreen.test.js): these tests
// exercise the user-search's real (non-mocked) setTimeout debounce, and
// mixing real timers with the rest of that file's synchronous act()-wrapped
// tests caused cross-test leakage - a debounce callback from one test firing
// during the next test's render, matching the same MoversScreen quirk this
// pattern was already isolated for.
const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (callback) => require("react").useEffect(callback, [callback]),
}));

jest.mock("../../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
jest.mock("../../api/index.js", () => ({
  fetchAdminUsers: jest.fn(),
  fetchAdminReviews: jest.fn(),
}));

import { useTheme } from "../../context/ThemeContext.js";
import { fetchAdminUsers } from "../../api/index.js";

describe("AdminScreen users search debounce", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTheme.mockReturnValue({ colors: lightColors });
  });

  it("debounces the search input instead of fetching per keystroke", async () => {
    fetchAdminUsers.mockResolvedValue({ users: [], pagination: { page: 1, pages: 1, total: 0 } });

    const { getByText, getByPlaceholderText, unmount } = await render(<AdminScreen />);
    await waitFor(() => expect(getByText("No users match this search")).toBeTruthy());

    // A single change is enough to prove the fetch is debounced rather than
    // immediate - simulating several rapid keystrokes here was observed to
    // leave real timers in a state that corrupted a *later* test.
    const input = getByPlaceholderText("Search by name, email, or phone");
    fireEvent.changeText(input, "jane");

    // The mount fetch only, not yet the search change - proves it doesn't
    // fire on the same tick as the keystroke.
    expect(fetchAdminUsers).toHaveBeenCalledTimes(1);

    await waitFor(
      () => expect(fetchAdminUsers).toHaveBeenLastCalledWith(expect.objectContaining({ search: "jane" })),
      { timeout: 1000 }
    );
    expect(fetchAdminUsers).toHaveBeenCalledTimes(2);

    unmount();
  });

  it("ignores a stale response that resolves after a newer filter change (race-condition guard)", async () => {
    const deferred = () => {
      let resolve;
      const promise = new Promise((res) => {
        resolve = res;
      });
      return { promise, resolve };
    };
    const initial = deferred();
    const filtered = deferred();
    fetchAdminUsers.mockImplementationOnce(() => initial.promise).mockImplementationOnce(() => filtered.promise);

    const { getByText, queryByText, unmount } = await render(<AdminScreen />);
    await waitFor(() => expect(fetchAdminUsers).toHaveBeenCalledTimes(1));

    fireEvent.press(getByText("Landlord"));
    await waitFor(() => expect(fetchAdminUsers).toHaveBeenCalledTimes(2));

    // Resolve the newer (filtered) request first, then the older (initial,
    // now-stale) one - the out-of-order network scenario that used to let
    // the stale response overwrite the list with results for a filter the
    // user no longer has selected.
    filtered.resolve({
      users: [
        { _id: "u2", name: "New Filtered User", email: "new@example.com", role: "landlord", accountStatus: "active" },
      ],
      pagination: { page: 1, pages: 1, total: 1 },
    });
    await waitFor(() => expect(getByText("New Filtered User")).toBeTruthy());

    initial.resolve({
      users: [
        { _id: "u1", name: "Stale Unfiltered User", email: "stale@example.com", role: "tenant", accountStatus: "active" },
      ],
      pagination: { page: 1, pages: 1, total: 1 },
    });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(queryByText("Stale Unfiltered User")).toBeNull();
    expect(getByText("New Filtered User")).toBeTruthy();

    unmount();
  });
});
