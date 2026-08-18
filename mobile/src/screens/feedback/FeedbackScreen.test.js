import { fireEvent, render, waitFor } from "@testing-library/react-native";
import FeedbackScreen from "./FeedbackScreen.js";
import { lightColors } from "../../theme/colors.js";

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock("../../context/AuthContext.js", () => ({ useAuth: jest.fn() }));
jest.mock("../../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
jest.mock("../../api/index.js", () => ({
  createFeedback: jest.fn(),
  fetchAdminFeedback: jest.fn(),
  fetchMyFeedback: jest.fn(),
  respondToFeedback: jest.fn(),
}));

import { useAuth } from "../../context/AuthContext.js";
import { useTheme } from "../../context/ThemeContext.js";
import { createFeedback, fetchAdminFeedback, fetchMyFeedback, respondToFeedback } from "../../api/index.js";

describe("FeedbackScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTheme.mockReturnValue({ colors: lightColors });
  });

  it("prompts sign-in when signed out", async () => {
    useAuth.mockReturnValue({ signedIn: false, user: null });

    const { getByText } = await render(<FeedbackScreen />);

    expect(getByText("Sign in required")).toBeTruthy();
  });

  it("lets a tenant submit feedback", async () => {
    useAuth.mockReturnValue({ signedIn: true, user: { role: "tenant" } });
    fetchMyFeedback.mockResolvedValue([]);
    createFeedback.mockResolvedValue({ _id: "f1", message: "Loved it!", status: "open" });

    const { getByText, getByPlaceholderText } = await render(<FeedbackScreen />);

    await waitFor(() => expect(getByText("Share your experience")).toBeTruthy());

    const input = getByPlaceholderText("Tell us how JakezApp helped you find your next home...");
    fireEvent.changeText(input, "Loved it!");
    await waitFor(() => expect(input.props.value).toBe("Loved it!"));

    fireEvent.press(getByText("Submit feedback"));

    await waitFor(() => expect(getByText("Thanks for sharing! We will be in touch.")).toBeTruthy());
    expect(createFeedback).toHaveBeenCalledWith({ message: "Loved it!", allowPublicSharing: false });
    expect(getByText("Loved it!")).toBeTruthy();
  });

  it("passes allowPublicSharing: true when the opt-in switch is toggled on", async () => {
    useAuth.mockReturnValue({ signedIn: true, user: { role: "tenant" } });
    fetchMyFeedback.mockResolvedValue([]);
    createFeedback.mockResolvedValue({ _id: "f2", message: "Great!", status: "open" });

    const { getByText, getByPlaceholderText, getByRole } = await render(<FeedbackScreen />);

    await waitFor(() => expect(getByText("Share your experience")).toBeTruthy());

    const input = getByPlaceholderText("Tell us how JakezApp helped you find your next home...");
    fireEvent.changeText(input, "Great!");
    await waitFor(() => expect(input.props.value).toBe("Great!"));
    fireEvent.press(getByRole("checkbox"));
    await waitFor(() => expect(getByRole("checkbox").props.accessibilityState.checked).toBe(true));
    fireEvent.press(getByText("Submit feedback"));

    await waitFor(() => expect(getByText("Thanks for sharing! We will be in touch.")).toBeTruthy());
    expect(createFeedback).toHaveBeenCalledWith({ message: "Great!", allowPublicSharing: true });
  });

  it("lets an admin respond to a submitted feedback item", async () => {
    useAuth.mockReturnValue({ signedIn: true, user: { role: "admin" } });
    fetchAdminFeedback.mockResolvedValue([
      { _id: "f1", message: "Loved it!", status: "open", submitter: { name: "Jane", role: "tenant" } },
    ]);
    respondToFeedback.mockResolvedValue({
      _id: "f1",
      message: "Loved it!",
      status: "responded",
      submitter: { name: "Jane", role: "tenant" },
      response: { message: "Thank you!" },
    });

    const { getByText, getByPlaceholderText } = await render(<FeedbackScreen />);

    await waitFor(() => expect(getByText("Loved it!")).toBeTruthy());

    fireEvent.press(getByText("Respond"));

    await waitFor(() => expect(getByPlaceholderText("Write a response...")).toBeTruthy());
    const input = getByPlaceholderText("Write a response...");
    fireEvent.changeText(input, "Thank you!");
    await waitFor(() => expect(input.props.value).toBe("Thank you!"));

    fireEvent.press(getByText("Send response"));

    await waitFor(() => expect(getByText("Thank you!")).toBeTruthy());
    expect(respondToFeedback).toHaveBeenCalledWith("f1", { message: "Thank you!" });
  });

  it("shows an admin-specific empty state", async () => {
    useAuth.mockReturnValue({ signedIn: true, user: { role: "admin" } });
    fetchAdminFeedback.mockResolvedValue([]);

    const { getByText } = await render(<FeedbackScreen />);

    await waitFor(() => expect(getByText("No feedback submitted yet.")).toBeTruthy());
  });
});
