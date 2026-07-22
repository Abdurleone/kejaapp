import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import NotificationsScreen, { resolveNotificationTarget } from "./NotificationsScreen.js";
import { lightColors } from "../../theme/colors.js";

const mockNavigate = jest.fn();
let focusCallback = null;
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (callback) => {
    focusCallback = callback;
    return require("react").useEffect(callback, [callback]);
  },
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

    expect(markAllNotificationsAsRead).not.toHaveBeenCalled();

    fireEvent.press(getByText("Mark as read"));

    await waitFor(() => expect(queryByText("New")).toBeNull());
    expect(markNotificationAsRead).toHaveBeenCalledWith("n1");
  });

  it("marks every notification as read via the bulk button", async () => {
    useAuth.mockReturnValue({ signedIn: true });
    fetchNotifications.mockResolvedValue([unreadNotification]);

    const { getByText, queryByText } = await render(<NotificationsScreen />);

    await waitFor(() => expect(getByText("New inquiry")).toBeTruthy());
    expect(getByText("New")).toBeTruthy();

    fireEvent.press(getByText("Mark all as read"));

    await waitFor(() => expect(markAllNotificationsAsRead).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(queryByText("New")).toBeNull());
    expect(queryByText("Mark all as read")).toBeNull();
  });

  it("reloads the list on every focus, not just the first mount (staleness guard)", async () => {
    useAuth.mockReturnValue({ signedIn: true });
    fetchNotifications.mockResolvedValue([unreadNotification]);

    const { getByText, queryByText } = await render(<NotificationsScreen />);
    await waitFor(() => expect(getByText("New inquiry")).toBeTruthy());

    // A new notification arrives while the user is on another tab, then
    // they come back to this one - the list must pick it up, not stay
    // stuck on whatever it looked like the first time this screen mounted.
    const freshNotification = {
      _id: "n2",
      title: "New viewing request",
      message: "A tenant requested a viewing",
      isRead: false,
      createdAt: "2026-01-02T00:00:00.000Z",
    };
    fetchNotifications.mockResolvedValue([freshNotification]);

    await act(async () => {
      focusCallback();
    });

    await waitFor(() => expect(fetchNotifications).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(getByText("New viewing request")).toBeTruthy());
    expect(queryByText("New inquiry")).toBeNull();
    expect(markAllNotificationsAsRead).not.toHaveBeenCalled();
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

  it("lets a mover open a mover_request notification, marking it read and navigating to Movers", async () => {
    const moverRequestNotification = {
      _id: "n3",
      type: "mover_request",
      title: "New moving service request",
      message: "SwiftMove Nairobi received a new service request.",
      isRead: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      data: { mover: "mover-1", moverRequest: "req-1", status: "pending" },
    };
    useAuth.mockReturnValue({ signedIn: true, user: { role: "mover" } });
    fetchNotifications.mockResolvedValue([moverRequestNotification]);
    markNotificationAsRead.mockResolvedValue({ ...moverRequestNotification, isRead: true });

    const { getByText } = await render(<NotificationsScreen />);
    await waitFor(() => expect(getByText("New moving service request")).toBeTruthy());

    fireEvent.press(getByText("View request"));

    expect(markNotificationAsRead).toHaveBeenCalledWith("n3");
    expect(mockNavigate).toHaveBeenCalledWith("Movers", {
      screen: "MoversList",
      params: { highlightId: "req-1" },
    });
  });

  it("lets a landlord/agency open a viewing notification, navigating to the Workspace tab", async () => {
    const viewingNotification = {
      _id: "n4",
      type: "viewing",
      title: "New viewing request",
      message: "A tenant requested a viewing.",
      isRead: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      data: { property: "prop-1", viewingRequest: "view-1", status: "pending" },
    };
    useAuth.mockReturnValue({ signedIn: true, user: { role: "agency" } });
    fetchNotifications.mockResolvedValue([viewingNotification]);
    markNotificationAsRead.mockResolvedValue({ ...viewingNotification, isRead: true });

    const { getByText } = await render(<NotificationsScreen />);
    await waitFor(() => expect(getByText("New viewing request")).toBeTruthy());

    fireEvent.press(getByText("View request"));

    expect(mockNavigate).toHaveBeenCalledWith("Workspace", {
      screen: "WorkspaceList",
      params: { highlightId: "view-1", initialTab: "viewingRequests" },
    });
  });

  it("does not show a View request action for a notification the current user can't act on", async () => {
    const statusChangeNotification = {
      _id: "n5",
      type: "mover_request",
      title: "Your request was accepted",
      message: "SwiftMove Nairobi accepted your request.",
      isRead: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      data: { mover: "mover-1", moverRequest: "req-1", status: "accepted" },
    };
    useAuth.mockReturnValue({ signedIn: true, user: { role: "tenant" } });
    fetchNotifications.mockResolvedValue([statusChangeNotification]);

    const { getByText, queryByText } = await render(<NotificationsScreen />);
    await waitFor(() => expect(getByText("Your request was accepted")).toBeTruthy());

    expect(queryByText("View request")).toBeNull();
  });
});

describe("resolveNotificationTarget", () => {
  it("routes a mover_request notification to Movers only for the mover role", () => {
    const notification = { type: "mover_request", data: { moverRequest: "req-1" } };
    expect(resolveNotificationTarget(notification, "mover")).toEqual({
      tab: "Movers",
      screen: "MoversList",
      params: { highlightId: "req-1" },
    });
    expect(resolveNotificationTarget(notification, "tenant")).toBeNull();
  });

  it("routes a viewing notification to Workspace's viewing-requests tab for landlord/agency", () => {
    const notification = { type: "viewing", data: { viewingRequest: "view-1" } };
    expect(resolveNotificationTarget(notification, "landlord")).toEqual({
      tab: "Workspace",
      screen: "WorkspaceList",
      params: { highlightId: "view-1", initialTab: "viewingRequests" },
    });
    expect(resolveNotificationTarget(notification, "tenant")).toBeNull();
  });

  it("routes an inquiry notification to Workspace's inquiries tab for landlord/agency", () => {
    const notification = { type: "inquiry", data: { inquiry: "inq-1" } };
    expect(resolveNotificationTarget(notification, "agency")).toEqual({
      tab: "Workspace",
      screen: "WorkspaceList",
      params: { highlightId: "inq-1", initialTab: "inquiries" },
    });
    expect(resolveNotificationTarget(notification, "mover")).toBeNull();
  });

  it("returns null for other notification types", () => {
    expect(resolveNotificationTarget({ type: "system", data: {} }, "admin")).toBeNull();
  });
});
