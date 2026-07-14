import { fireEvent, render, waitFor } from "@testing-library/react-native";
import LandingView from "./LandingView.js";
import { lightColors } from "../../theme/colors.js";

const mockNavigate = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock("../../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
jest.mock("../../api/index.js", () => ({ fetchPublicTestimonials: jest.fn() }));

import { useTheme } from "../../context/ThemeContext.js";
import { fetchPublicTestimonials } from "../../api/index.js";

describe("LandingView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTheme.mockReturnValue({ colors: lightColors });
  });

  it("renders the hero pitch and navigates to Discover on Start searching", async () => {
    fetchPublicTestimonials.mockResolvedValue([]);

    const { getByText } = await render(<LandingView />);

    expect(getByText("Find the right home in Nairobi and beyond.")).toBeTruthy();

    await fireEvent.press(getByText("Start searching"));

    expect(mockNavigate).toHaveBeenCalledWith("Discover");
  });

  it("shows testimonials once they load", async () => {
    fetchPublicTestimonials.mockResolvedValue([
      { _id: "t1", message: "Wonderful App", submitter: { name: "Demo Tenant", role: "tenant" } },
    ]);

    const { findByText, getByText } = await render(<LandingView />);

    expect(await findByText("Wonderful App")).toBeTruthy();
    expect(getByText("— Demo Tenant, Tenant")).toBeTruthy();
  });

  it("fails soft and shows no testimonials section when the fetch rejects", async () => {
    fetchPublicTestimonials.mockRejectedValue(new Error("network error"));

    const { queryByText } = await render(<LandingView />);

    await waitFor(() => expect(fetchPublicTestimonials).toHaveBeenCalledTimes(1));
    expect(queryByText("What our users say")).toBeNull();
  });
});
