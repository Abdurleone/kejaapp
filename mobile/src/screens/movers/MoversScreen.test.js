import { fireEvent, render, waitFor } from "@testing-library/react-native";
import MoversScreen from "./MoversScreen.js";
import { lightColors } from "../../theme/colors.js";

const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
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
import {
  affiliateMover,
  fetchMoverProfileStatus,
  fetchMovers,
  fetchReceivedMoverRequests,
  updateMoverRequestStatus,
} from "../../api/index.js";

const mover = {
  _id: "m1",
  name: "Speedy Movers",
  verified: true,
  location: { town: "Westlands", county: "Nairobi" },
  serviceTypes: ["local"],
  basePrice: 5000,
  affiliatedOwners: [],
};

describe("MoversScreen (directory)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTheme.mockReturnValue({ colors: lightColors });
    fetchMovers.mockResolvedValue([mover]);
  });

  it("lets a tenant request a mover's service", async () => {
    useAuth.mockReturnValue({ user: { _id: "t1", role: "tenant" } });

    const { getByText } = await render(<MoversScreen />);

    await waitFor(() => expect(getByText("Speedy Movers")).toBeTruthy());

    fireEvent.press(getByText("Request service"));

    expect(mockNavigate).toHaveBeenCalledWith("MoverRequestForm", { moverId: "m1", moverName: "Speedy Movers" });
  });

  it("prompts an anonymous visitor to sign in", async () => {
    useAuth.mockReturnValue({ user: null });

    const { getByText } = await render(<MoversScreen />);

    await waitFor(() => expect(getByText("Speedy Movers")).toBeTruthy());

    fireEvent.press(getByText("Sign in to request service"));

    expect(mockNavigate).toHaveBeenCalledWith("Login");
  });

  it("lets a landlord add and remove a mover affiliate", async () => {
    useAuth.mockReturnValue({ user: { _id: "o1", role: "landlord" } });
    affiliateMover.mockResolvedValue({ ...mover, affiliatedOwners: ["o1"] });

    const { getByText } = await render(<MoversScreen />);

    await waitFor(() => expect(getByText("Speedy Movers")).toBeTruthy());

    fireEvent.press(getByText("Add as affiliate"));

    await waitFor(() => expect(getByText("Remove affiliate")).toBeTruthy());
    expect(affiliateMover).toHaveBeenCalledWith("m1");
  });

  it("filters movers by service type", async () => {
    useAuth.mockReturnValue({ user: { _id: "t1", role: "tenant" } });

    const { getByText } = await render(<MoversScreen />);

    await waitFor(() => expect(getByText("Speedy Movers")).toBeTruthy());

    fireEvent.press(getByText("Local move"));

    await waitFor(() => expect(fetchMovers).toHaveBeenCalledWith({ serviceType: "local", county: "" }));
  });
});

describe("MoversScreen (mover dashboard)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTheme.mockReturnValue({ colors: lightColors });
    useAuth.mockReturnValue({ user: { _id: "mv1", role: "mover" } });
  });

  it("shows the mover's profile and accepts a received request", async () => {
    fetchMoverProfileStatus.mockResolvedValue({
      status: "approved",
      verified: true,
      name: "Speedy Movers",
      serviceTypes: ["local"],
      location: { town: "Westlands", county: "Nairobi" },
    });
    fetchReceivedMoverRequests.mockResolvedValue([
      { _id: "req1", status: "pending", message: "Need help moving", tenant: { name: "Jane" } },
    ]);
    updateMoverRequestStatus.mockResolvedValue({ _id: "req1", status: "accepted", message: "Need help moving" });

    const { getByText } = await render(<MoversScreen />);

    await waitFor(() => expect(getByText("Need help moving")).toBeTruthy());

    fireEvent.press(getByText("Accept"));

    await waitFor(() =>
      expect(updateMoverRequestStatus).toHaveBeenCalledWith("req1", { status: "accepted", response: "" })
    );
  });

  it("shows the profile submission form when no profile exists yet", async () => {
    fetchMoverProfileStatus.mockResolvedValue({ status: "not_submitted" });

    const { getByText } = await render(<MoversScreen />);

    await waitFor(() => expect(getByText("Your mover profile")).toBeTruthy());
  });
});
