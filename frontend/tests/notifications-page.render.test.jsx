import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import NotificationsPage, { resolveNotificationTarget } from "../src/pages/NotificationsPage.jsx";

const { fetchNotifications, markAllNotificationsAsRead, markNotificationAsRead } = vi.hoisted(() => ({
  fetchNotifications: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
  markNotificationAsRead: vi.fn(),
}));

vi.mock("../app-utils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, fetchNotifications, markAllNotificationsAsRead, markNotificationAsRead };
});

const sampleNotification = {
  _id: "n1",
  title: "New property inquiry",
  message: "Modern Kilimani Apartment received a new inquiry.",
  isRead: false,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("NotificationsPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders notifications with title and message", async () => {
    fetchNotifications.mockResolvedValue([sampleNotification]);

    render(<NotificationsPage />);

    expect(await screen.findByText("New property inquiry")).toBeInTheDocument();
    expect(screen.getByText("Modern Kilimani Apartment received a new inquiry.")).toBeInTheDocument();
  });

  it("exposes the loading state as an accessible status region, not hidden by aria-hidden", () => {
    fetchNotifications.mockReturnValue(new Promise(() => {})); // never resolves - stays in loading state

    render(<NotificationsPage />);

    expect(screen.getByRole("status", { name: "Loading notifications" })).toBeInTheDocument();
  });

  it("shows an inline error when marking a notification as read fails, without hiding the rest of the list", async () => {
    fetchNotifications.mockResolvedValue([sampleNotification]);
    markNotificationAsRead.mockRejectedValue(new Error("Could not mark this notification as read."));
    const user = userEvent.setup();

    render(<NotificationsPage />);
    await screen.findByText("New property inquiry");

    await user.click(screen.getByRole("button", { name: "Mark as read" }));

    expect(await screen.findByText("Could not mark this notification as read.")).toBeInTheDocument();
    // The notification stays visible - a failed action no longer nukes the whole list.
    expect(screen.getByText("New property inquiry")).toBeInTheDocument();
  });

  it("lets a mover open a mover_request notification, marking it read and navigating to Movers", async () => {
    const moverRequestNotification = {
      _id: "n2",
      type: "mover_request",
      title: "New moving service request",
      message: "SwiftMove Nairobi received a new service request.",
      isRead: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      data: { mover: "mover-1", moverRequest: "req-1", status: "pending" },
    };
    fetchNotifications.mockResolvedValue([moverRequestNotification]);
    markNotificationAsRead.mockResolvedValue({ ...moverRequestNotification, isRead: true });
    const onNavigateToRequest = vi.fn();
    const user = userEvent.setup();

    render(
      <NotificationsPage currentUser={{ role: "mover" }} onNavigateToRequest={onNavigateToRequest} />
    );
    await screen.findByText("New moving service request");

    await user.click(screen.getByRole("button", { name: "View request" }));

    expect(markNotificationAsRead).toHaveBeenCalledWith("n2");
    expect(onNavigateToRequest).toHaveBeenCalledWith({ view: "movers", highlightId: "req-1" });
  });

  it("lets a landlord/agency open a viewing notification, navigating to the Workspace tab", async () => {
    const viewingNotification = {
      _id: "n3",
      type: "viewing",
      title: "New viewing request",
      message: "A tenant requested a viewing.",
      isRead: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      data: { property: "prop-1", viewingRequest: "view-1", status: "pending" },
    };
    fetchNotifications.mockResolvedValue([viewingNotification]);
    markNotificationAsRead.mockResolvedValue({ ...viewingNotification, isRead: true });
    const onNavigateToRequest = vi.fn();
    const user = userEvent.setup();

    render(
      <NotificationsPage currentUser={{ role: "agency" }} onNavigateToRequest={onNavigateToRequest} />
    );
    await screen.findByText("New viewing request");

    await user.click(screen.getByRole("button", { name: "View request" }));

    expect(onNavigateToRequest).toHaveBeenCalledWith({ view: "owner", highlightId: "view-1" });
  });

  it("does not show a View request action for a notification the current user can't act on", async () => {
    // A tenant getting told their own mover request was accepted has no
    // "my sent requests" screen to land on yet - stays read-only.
    const statusChangeNotification = {
      _id: "n4",
      type: "mover_request",
      title: "Your request was accepted",
      message: "SwiftMove Nairobi accepted your request.",
      isRead: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      data: { mover: "mover-1", moverRequest: "req-1", status: "accepted" },
    };
    fetchNotifications.mockResolvedValue([statusChangeNotification]);

    render(<NotificationsPage currentUser={{ role: "tenant" }} onNavigateToRequest={vi.fn()} />);
    await screen.findByText("Your request was accepted");

    expect(screen.queryByRole("button", { name: "View request" })).not.toBeInTheDocument();
  });
});

describe("resolveNotificationTarget", () => {
  it("routes a mover_request notification to Movers only for the mover role", () => {
    const notification = { type: "mover_request", data: { moverRequest: "req-1" } };
    expect(resolveNotificationTarget(notification, "mover")).toEqual({
      view: "movers",
      highlightId: "req-1",
    });
    expect(resolveNotificationTarget(notification, "tenant")).toBeNull();
  });

  it("routes a viewing notification to Workspace only for landlord/agency", () => {
    const notification = { type: "viewing", data: { viewingRequest: "view-1" } };
    expect(resolveNotificationTarget(notification, "landlord")).toEqual({
      view: "owner",
      highlightId: "view-1",
    });
    expect(resolveNotificationTarget(notification, "agency")).toEqual({
      view: "owner",
      highlightId: "view-1",
    });
    expect(resolveNotificationTarget(notification, "tenant")).toBeNull();
  });

  it("routes an inquiry notification to Workspace only for landlord/agency", () => {
    const notification = { type: "inquiry", data: { inquiry: "inq-1" } };
    expect(resolveNotificationTarget(notification, "landlord")).toEqual({
      view: "owner",
      highlightId: "inq-1",
    });
    expect(resolveNotificationTarget(notification, "mover")).toBeNull();
  });

  it("returns null for other notification types", () => {
    expect(resolveNotificationTarget({ type: "system", data: {} }, "admin")).toBeNull();
  });
});
