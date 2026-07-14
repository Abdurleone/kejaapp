import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import WorkspacePage from "../src/pages/WorkspacePage.jsx";

const { fetchMyProperties, fetchReceivedInquiries, respondToInquiry } = vi.hoisted(() => ({
  fetchMyProperties: vi.fn(),
  fetchReceivedInquiries: vi.fn(),
  respondToInquiry: vi.fn(),
}));

vi.mock("../app-utils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, fetchMyProperties, fetchReceivedInquiries, respondToInquiry };
});

const sampleProperty = {
  _id: "prop-1",
  title: "Modern Kilimani Apartment",
  price: { rent: 45000 },
  location: { area: "Kilimani" },
  status: "available",
};

const openInquiry = {
  _id: "inq-1",
  property: { title: "Modern Kilimani Apartment" },
  message: "Is this still available?",
  sender: { name: "Jane Tenant" },
  status: "open",
};

const noProperties = { properties: [], pagination: { page: 1, pages: 1, total: 0 } };
const noInquiries = { inquiries: [], pagination: { page: 1, pages: 1, total: 0 } };

// Replaces page-components.test.js's regex-source-matching assertions for
// WorkspacePage with real render + interaction tests.
describe("WorkspacePage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders listings and inquiries with real data, and opens an edit action", async () => {
    fetchMyProperties.mockResolvedValue({
      properties: [sampleProperty],
      pagination: { page: 1, pages: 1, total: 1 },
    });
    fetchReceivedInquiries.mockResolvedValue({
      inquiries: [openInquiry],
      pagination: { page: 1, pages: 1, total: 1 },
    });
    const onEditProperty = vi.fn();
    const user = userEvent.setup();

    render(<WorkspacePage onEditProperty={onEditProperty} onCreateProperty={vi.fn()} />);

    expect(await screen.findByText("Your listings (1)")).toBeInTheDocument();
    expect(screen.getAllByText("Modern Kilimani Apartment").length).toBe(2);
    expect(screen.getByText("Is this still available?")).toBeInTheDocument();
    expect(screen.getByText("Inquiries (1)")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEditProperty).toHaveBeenCalledWith("prop-1");
  });

  it("shows empty states for both sections when there's no data", async () => {
    fetchMyProperties.mockResolvedValue(noProperties);
    fetchReceivedInquiries.mockResolvedValue(noInquiries);

    render(<WorkspacePage onEditProperty={vi.fn()} onCreateProperty={vi.fn()} />);

    expect(await screen.findByText("You haven't listed any properties yet.")).toBeInTheDocument();
    expect(screen.getByText("No inquiries yet. They'll show up here once tenants reach out.")).toBeInTheDocument();
  });

  it("shows an error with retry for the listings section, independent of inquiries", async () => {
    fetchMyProperties.mockRejectedValueOnce(new Error("Listings down"));
    fetchMyProperties.mockResolvedValueOnce({
      properties: [sampleProperty],
      pagination: { page: 1, pages: 1, total: 1 },
    });
    fetchReceivedInquiries.mockResolvedValue(noInquiries);
    const user = userEvent.setup();

    render(<WorkspacePage onEditProperty={vi.fn()} onCreateProperty={vi.fn()} />);

    expect(await screen.findByText("Listings down")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Modern Kilimani Apartment")).toBeInTheDocument();
  });

  it("calls onCreateProperty when New listing is clicked", async () => {
    fetchMyProperties.mockResolvedValue(noProperties);
    fetchReceivedInquiries.mockResolvedValue(noInquiries);
    const onCreateProperty = vi.fn();
    const user = userEvent.setup();

    render(<WorkspacePage onEditProperty={vi.fn()} onCreateProperty={onCreateProperty} />);
    await screen.findByText("You haven't listed any properties yet.");

    await user.click(screen.getByRole("button", { name: "New listing" }));
    expect(onCreateProperty).toHaveBeenCalledTimes(1);
  });

  it("sends a response to an open inquiry and reflects it in place", async () => {
    fetchMyProperties.mockResolvedValue(noProperties);
    fetchReceivedInquiries.mockResolvedValue({
      inquiries: [openInquiry],
      pagination: { page: 1, pages: 1, total: 1 },
    });
    respondToInquiry.mockResolvedValue({ ...openInquiry, status: "responded", response: "Yes, still open!" });
    const user = userEvent.setup();

    render(<WorkspacePage onEditProperty={vi.fn()} onCreateProperty={vi.fn()} />);
    await screen.findByText("Is this still available?");

    await user.type(screen.getByPlaceholderText("Write a response..."), "Yes, still open!");
    await user.click(screen.getByRole("button", { name: "Send response" }));

    expect(respondToInquiry).toHaveBeenCalledWith("inq-1", { status: "responded", response: "Yes, still open!" });
    await waitFor(() => expect(screen.getByText("Your response: Yes, still open!")).toBeInTheDocument());
  });

  it("closes an inquiry without a reply", async () => {
    fetchMyProperties.mockResolvedValue(noProperties);
    fetchReceivedInquiries.mockResolvedValue({
      inquiries: [openInquiry],
      pagination: { page: 1, pages: 1, total: 1 },
    });
    respondToInquiry.mockResolvedValue({ ...openInquiry, status: "closed", response: "" });
    const user = userEvent.setup();

    render(<WorkspacePage onEditProperty={vi.fn()} onCreateProperty={vi.fn()} />);
    await screen.findByText("Is this still available?");

    await user.click(screen.getByRole("button", { name: "Close without reply" }));

    expect(respondToInquiry).toHaveBeenCalledWith("inq-1", { status: "closed", response: "" });
    await waitFor(() => expect(screen.getByText("Closed without a reply.")).toBeInTheDocument());
  });
});
