import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import NotificationsPage from "../src/pages/NotificationsPage.jsx";

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
});
