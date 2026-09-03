import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import FeedbackPage from "../src/pages/FeedbackPage.jsx";
import { renderWithAuth } from "./helpers/renderWithAuth.jsx";

const { fetchMyFeedback, createFeedback, fetchAdminFeedback, respondToFeedback } = vi.hoisted(() => ({
  fetchMyFeedback: vi.fn(),
  createFeedback: vi.fn(),
  fetchAdminFeedback: vi.fn(),
  respondToFeedback: vi.fn(),
}));

vi.mock("../app-utils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, fetchMyFeedback, createFeedback, fetchAdminFeedback, respondToFeedback };
});

// Replaces page-components.test.js's regex-source-matching assertions for
// FeedbackPage with real render + interaction tests, for both the
// submitter view and the admin-responder view.
describe("FeedbackPage - submitter view", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("submits new feedback and shows it in the list with a confirmation", async () => {
    fetchMyFeedback.mockResolvedValue([]);
    createFeedback.mockResolvedValue({ _id: "fb-1", message: "Loved using this app!", status: "open" });
    const user = userEvent.setup();

    renderWithAuth(<FeedbackPage />, { currentUser: { role: "tenant" } });
    await screen.findByText("You haven't submitted any feedback yet.");

    await user.type(screen.getByLabelText("Your feedback"), "Loved using this app!");
    await user.click(screen.getByRole("button", { name: "Submit feedback" }));

    expect(createFeedback).toHaveBeenCalledWith({ message: "Loved using this app!", allowPublicSharing: false });
    expect(await screen.findByText("Thanks for sharing! We'll be in touch.")).toBeInTheDocument();
    expect(screen.getByText("Loved using this app!")).toBeInTheDocument();
  });

  it("passes allowPublicSharing: true when the opt-in checkbox is checked", async () => {
    fetchMyFeedback.mockResolvedValue([]);
    createFeedback.mockResolvedValue({ _id: "fb-2", message: "Great app!", status: "open" });
    const user = userEvent.setup();

    renderWithAuth(<FeedbackPage />, { currentUser: { role: "tenant" } });
    await screen.findByText("You haven't submitted any feedback yet.");

    await user.type(screen.getByLabelText("Your feedback"), "Great app!");
    await user.click(
      screen.getByLabelText("Allow this to be shown as a testimonial on our landing page if an admin responds"),
    );
    await user.click(screen.getByRole("button", { name: "Submit feedback" }));

    expect(createFeedback).toHaveBeenCalledWith({ message: "Great app!", allowPublicSharing: true });
  });

  it("renders previously submitted feedback with its status and any admin response", async () => {
    fetchMyFeedback.mockResolvedValue([
      { _id: "fb-1", message: "Great experience", status: "responded", response: { message: "Thank you!" } },
    ]);

    renderWithAuth(<FeedbackPage />, { currentUser: { role: "tenant" } });

    expect(await screen.findByText("Great experience")).toBeInTheDocument();
    expect(screen.getByText("Responded")).toBeInTheDocument();
    expect(screen.getByText(/Thank you!/)).toBeInTheDocument();
  });

  it("shows an error state with retry when loading feedback fails", async () => {
    fetchMyFeedback.mockRejectedValueOnce(new Error("Feedback down"));
    fetchMyFeedback.mockResolvedValueOnce([]);
    const user = userEvent.setup();

    renderWithAuth(<FeedbackPage />, { currentUser: { role: "tenant" } });

    expect(await screen.findByText("Feedback down")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("You haven't submitted any feedback yet.")).toBeInTheDocument();
  });
});

describe("FeedbackPage - admin view", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all feedback with submitter info", async () => {
    fetchAdminFeedback.mockResolvedValue({
      feedback: [
        { _id: "fb-1", message: "Please add dark mode", status: "open", submitter: { name: "Jane Tenant", role: "tenant" } },
      ],
      pagination: { page: 1, pages: 1, total: 1 },
    });

    renderWithAuth(<FeedbackPage />, { currentUser: { role: "admin" } });

    expect(await screen.findByText("Please add dark mode")).toBeInTheDocument();
    expect(screen.getByText("Jane Tenant (Tenant)")).toBeInTheDocument();
  });

  it("lets an admin respond to feedback", async () => {
    fetchAdminFeedback.mockResolvedValue({
      feedback: [
        { _id: "fb-1", message: "Please add dark mode", status: "open", submitter: { name: "Jane Tenant", role: "tenant" } },
      ],
      pagination: { page: 1, pages: 1, total: 1 },
    });
    respondToFeedback.mockResolvedValue({
      _id: "fb-1",
      message: "Please add dark mode",
      status: "responded",
      submitter: { name: "Jane Tenant", role: "tenant" },
      response: { message: "Added in the next release!" },
    });
    const user = userEvent.setup();

    renderWithAuth(<FeedbackPage />, { currentUser: { role: "admin" } });
    await screen.findByText("Please add dark mode");

    await user.click(screen.getByRole("button", { name: "Respond" }));
    await user.type(screen.getByLabelText("Response"), "Added in the next release!");
    await user.click(screen.getByRole("button", { name: "Send response" }));

    expect(respondToFeedback).toHaveBeenCalledWith("fb-1", { message: "Added in the next release!" });
    expect(await screen.findByText(/Added in the next release!/)).toBeInTheDocument();
  });

  it("paginates the feedback list past the first page", async () => {
    fetchAdminFeedback.mockImplementation(({ page } = {}) =>
      Promise.resolve(
        page === 2
          ? {
              feedback: [
                { _id: "fb-page2", message: "Second page item", status: "open", submitter: { name: "Sam", role: "tenant" } },
              ],
              pagination: { page: 2, pages: 2, total: 21 },
            }
          : {
              feedback: [
                { _id: "fb-page1", message: "First page item", status: "open", submitter: { name: "Jane", role: "tenant" } },
              ],
              pagination: { page: 1, pages: 2, total: 21 },
            }
      )
    );
    const user = userEvent.setup();

    renderWithAuth(<FeedbackPage />, { currentUser: { role: "admin" } });

    expect(await screen.findByText("First page item")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Second page item")).toBeInTheDocument();
    expect(screen.queryByText("First page item")).not.toBeInTheDocument();
    expect(fetchAdminFeedback).toHaveBeenLastCalledWith({ page: 2 });
  });

  it("shows the empty state when there's no feedback yet", async () => {
    fetchAdminFeedback.mockResolvedValue({ feedback: [], pagination: { page: 1, pages: 1, total: 0 } });

    renderWithAuth(<FeedbackPage />, { currentUser: { role: "admin" } });

    expect(await screen.findByText("No feedback submitted yet.")).toBeInTheDocument();
  });
});
