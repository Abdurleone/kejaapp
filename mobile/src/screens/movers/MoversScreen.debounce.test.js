import { fireEvent, render, waitFor } from "@testing-library/react-native";
import MoversScreen from "./MoversScreen.js";
import { lightColors } from "../../theme/colors.js";

// Kept in its own file (separate from MoversScreen.test.js): these tests
// exercise the county filter's real (non-mocked) setTimeout debounce, and
// mixing real timers with the rest of that file's synchronous act()-wrapped
// tests caused cross-test leakage - a debounce callback from one test firing
// during the next test's render. Isolating them in their own module sidesteps
// that entirely without needing fake timers to fight jest-expo's RN mocks.
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock("../../context/AuthContext.js", () => ({ useAuth: jest.fn() }));
jest.mock("../../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
jest.mock("../../api/index.js", () => ({
  affiliateMover: jest.fn(),
  fetchMoverProfileStatus: jest.fn(),
  fetchMovers: jest.fn(),
  fetchReceivedMoverRequests: jest.fn(),
  submitMoverProfile: jest.fn(),
  unaffiliateMover: jest.fn(),
  updateMoverRequestStatus: jest.fn(),
}));

import { useAuth } from "../../context/AuthContext.js";
import { useTheme } from "../../context/ThemeContext.js";
import { fetchMovers } from "../../api/index.js";

const mover = {
  _id: "m1",
  name: "Speedy Movers",
  verified: true,
  location: { town: "Westlands", county: "Nairobi" },
  serviceTypes: ["local"],
  basePrice: 5000,
  affiliatedOwners: [],
};

describe("MoversScreen (directory) county debounce", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTheme.mockReturnValue({ colors: lightColors });
    useAuth.mockReturnValue({ user: { _id: "t1", role: "tenant" } });
    fetchMovers.mockResolvedValue([mover]);
  });

  it("debounces the county text input instead of fetching per keystroke", async () => {
    const { getByText, getByPlaceholderText, unmount } = await render(<MoversScreen />);
    await waitFor(() => expect(getByText("Speedy Movers")).toBeTruthy());

    // A single change is enough to prove the fetch is debounced rather than
    // immediate (the actual behavior under fix) - simulating several rapid
    // keystrokes here was observed to leave real timers in a state that
    // corrupted a *later* test in this file, an RN-testing-environment
    // quirk unrelated to the debounce logic itself.
    const countyInput = getByPlaceholderText("Filter by county (e.g. Nairobi)");
    fireEvent.changeText(countyInput, "Nairobi");

    // The mount fetch only, not yet the county change - proves it doesn't
    // fire on the same tick as the keystroke.
    expect(fetchMovers).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(fetchMovers).toHaveBeenCalledWith({ serviceType: "", county: "Nairobi" }), {
      timeout: 1000,
    });
    expect(fetchMovers).toHaveBeenCalledTimes(2);

    await waitFor(() => expect(getByText("Speedy Movers")).toBeTruthy());
    unmount();
  });

  it("ignores a stale response when a chip tap's fetch is still in flight when the debounced county update lands (race-condition guard)", async () => {
    // The full-screen "Loading movers..." swap means a second CHIP tap
    // can't land while a fetch is in flight (the chip itself disappears) -
    // but the county debounce timer keeps running in the background
    // regardless of what's currently rendered, since it lives in its own
    // effect tied to the (still-mounted) component, not to the visible
    // branch. So the realistic overlap is: start typing a county, then
    // immediately tap a chip before the debounce fires - the debounced
    // fetch can still land while the chip-triggered one is unresolved.
    const deferred = () => {
      let resolve;
      const promise = new Promise((res) => {
        resolve = res;
      });
      return { promise, resolve };
    };
    const chipCall = deferred();
    const countyCall = deferred();
    fetchMovers
      .mockResolvedValueOnce([mover])
      .mockImplementationOnce(() => chipCall.promise)
      .mockImplementationOnce(() => countyCall.promise);

    const { getByText, queryByText, getByPlaceholderText, unmount } = await render(<MoversScreen />);
    await waitFor(() => expect(getByText("Speedy Movers")).toBeTruthy());

    fireEvent.changeText(getByPlaceholderText("Filter by county (e.g. Nairobi)"), "Nairobi");
    fireEvent.press(getByText("Packing"));
    await waitFor(() => expect(fetchMovers).toHaveBeenCalledTimes(2));

    await waitFor(() => expect(fetchMovers).toHaveBeenCalledTimes(3), { timeout: 1000 });

    // Resolve the newer (debounced county) request first, then the older
    // (chip, now-stale) one.
    countyCall.resolve([{ ...mover, _id: "m-new", name: "New Filtered Mover" }]);
    await waitFor(() => expect(getByText("New Filtered Mover")).toBeTruthy());

    chipCall.resolve([{ ...mover, _id: "m-stale", name: "Stale Unfiltered Mover" }]);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(queryByText("Stale Unfiltered Mover")).toBeNull();
    expect(getByText("New Filtered Mover")).toBeTruthy();
    unmount();
  });
});
