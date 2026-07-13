import { fireEvent, render, waitFor } from "@testing-library/react-native";
import NotificationsScreen from "./NotificationsScreen.js";
import { lightColors } from "../../theme/colors.js";

const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (callback) => require("react").useEffect(callback, [callback]),
}));

jest.mock("../../context/AuthContext.js", () => ({ useAuth: jest.fn() }));
jest.mock("../../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
jest.mock("../../api/index.js", () => ({
  fetchNotifications: jest.fn(),
  markAllNotificationsAsRead: jest.fn(),
  markNotificationAsRead: jest.fn(),
}));

import { useAuth } from "../../context/AuthContext.js";
import { useTheme } from "../../context/ThemeContext.js";
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../api/index.js";

const unreadNotification = {
  _id: "n1",
  title: "New inquiry",
  message: "A tenant asked about your listing",
  isRead: false,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("NotificationsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTheme.mockReturnValue({ colors: lightColors });
    markAllNotificationsAsRead.mockResolvedValue();
  });

  it("prompts sign-in when signed out", async () => {
    useAuth.mockReturnValue({ signedIn: false });

    const { getByText } = await render(<NotificationsScreen />);

    expect(getByText("Sign in required")).toBeTruthy();
  });

  it("lists notifications and marks one as read", async () => {
    useAuth.mockReturnValue({ signedIn: true });
    fetchNotifications.mockResolvedValue([unreadNotification]);
    markNotificationAsRead.mockResolvedValue({ ...unreadNotification, isRead: true });

    const { getByText, queryByText } = await render(<NotificationsScreen />);

    await waitFor(() => expect(getByText("New inquiry")).toBeTruthy());
    expect(getByText("New")).toBeTruthy();

    await waitFor(() => expect(markAllNotificationsAsRead).toHaveBeenCalledTimes(1));

    fireEvent.press(getByText("Mark as read"));

    await waitFor(() => expect(queryByText("New")).toBeNull());
    expect(markNotificationAsRead).toHaveBeenCalledWith("n1");
  });

  it("switches to the Unread filter and refetches", async () => {
    useAuth.mockReturnValue({ signedIn: true });
    fetchNotifications.mockResolvedValue([unreadNotification]);

    const { getByText } = await render(<NotificationsScreen />);

    await waitFor(() => expect(getByText("New inquiry")).toBeTruthy());

    fetchNotifications.mockResolvedValue([]);
    fireEvent.press(getByText("Unread"));

    await waitFor(() => expect(fetchNotifications).toHaveBeenCalledWith({ unread: "true" }));
    await waitFor(() => expect(getByText("No unread notifications.")).toBeTruthy());
  });
});
