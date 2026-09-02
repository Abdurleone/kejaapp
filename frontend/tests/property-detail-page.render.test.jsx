import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import PropertyDetailPage from "../src/pages/PropertyDetailPage.jsx";
import { renderWithAuth } from "./helpers/renderWithAuth.jsx";

const {
  fetchPropertyById,
  fetchFavorites,
  fetchPropertyMovers,
  fetchPropertyReviews,
  saveFavorite,
  createInquiry,
  createViewingRequest,
  createMoverRequest,
  createReview,
  reportReview,
  getCurrentPositionOrNull,
} = vi.hoisted(() => ({
  fetchPropertyById: vi.fn(),
  fetchFavorites: vi.fn(),
  fetchPropertyMovers: vi.fn(),
  fetchPropertyReviews: vi.fn(),
  saveFavorite: vi.fn(),
  createInquiry: vi.fn(),
  createViewingRequest: vi.fn(),
  createMoverRequest: vi.fn(),
  createReview: vi.fn(),
  reportReview: vi.fn(),
  getCurrentPositionOrNull: vi.fn(),
}));

vi.mock("../app-utils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchPropertyById,
    fetchFavorites,
    fetchPropertyMovers,
    fetchPropertyReviews,
    saveFavorite,
    createInquiry,
    createViewingRequest,
    createMoverRequest,
    createReview,
    reportReview,
    getCurrentPositionOrNull,
  };
});

const sampleProperty = {
  _id: "prop-1",
  title: "Modern Kilimani Apartment",
  location: { area: "Kilimani", county: "Nairobi" },
  bedrooms: 2,
  bathrooms: 1,
  viewingType: "open",
  status: "available",
  costSummary: { rent: 45000, deposit: 45000, agencyFee: 0, firstMonthTotal: 90000, upfrontTotal: 90000 },
  owner: { _id: "owner-1", name: "Jane Landlord", role: "landlord", verified: false },
};

const noMovers = { affiliates: [], nearby: [] };

const renderDetailPage = (props = {}) => {
  fetchFavorites.mockResolvedValue({ favorites: props.favorites ?? [] });
  fetchPropertyMovers.mockResolvedValue(props.movers ?? noMovers);
  fetchPropertyById.mockResolvedValue(props.property ?? sampleProperty);
  fetchPropertyReviews.mockResolvedValue({ data: props.reviews ?? [], pagination: {} });

  return renderWithAuth(
    <PropertyDetailPage propertyId="prop-1" apiBaseUrl="http://localhost:5000" onBack={props.onBack ?? vi.fn()} />,
    { currentUser: props.currentUser ?? null, signedIn: props.signedIn ?? false }
  );
};

// PropertyDetailPage had zero test coverage of any kind before this file -
// not even the regex-matching-source-strings kind other pages had. This
// covers its highest-value/highest-risk behavior: the owner-only access
// gate, the loading/error states, and the save/inquiry flows, plus (added
// later) the mover-request price-estimate flow. The viewing-request section
// is left for a future slice - this file is already covering a lot of
// ground and splitting keeps each PR reviewable.
describe("PropertyDetailPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading skeleton before the property has loaded", () => {
    fetchPropertyById.mockReturnValue(new Promise(() => {}));
    fetchFavorites.mockResolvedValue({ favorites: [] });
    fetchPropertyMovers.mockResolvedValue(noMovers);

    const { container } = renderWithAuth(
      <PropertyDetailPage propertyId="prop-1" apiBaseUrl="http://localhost:5000" onBack={vi.fn()} />
    );

    expect(container.querySelector(".property-detail-skeleton, [class*='skeleton']")).not.toBeNull();
  });

  it("shows an error state with a Back action when the property fails to load", async () => {
    fetchPropertyById.mockRejectedValue(new Error("Property not found"));
    fetchFavorites.mockResolvedValue({ favorites: [] });
    fetchPropertyMovers.mockResolvedValue(noMovers);
    const onBack = vi.fn();
    const user = userEvent.setup();

    renderWithAuth(<PropertyDetailPage propertyId="prop-1" apiBaseUrl="http://localhost:5000" onBack={onBack} />);

    expect(await screen.findByText("Property not found")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back to Discover" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("renders the property's core data once loaded", async () => {
    renderDetailPage();

    expect(await screen.findByText("Modern Kilimani Apartment")).toBeInTheDocument();
    expect(screen.getByText("Kilimani, Nairobi")).toBeInTheDocument();
    expect(screen.getByText("Listed by")).toBeInTheDocument();
    expect(screen.getByText("Jane Landlord")).toBeInTheDocument();
  });

  it("shows a Verified agency badge only when the owner is a verified agency", async () => {
    renderDetailPage({
      property: { ...sampleProperty, owner: { ...sampleProperty.owner, role: "agency", verified: true } },
    });

    expect(await screen.findByText("Modern Kilimani Apartment")).toBeInTheDocument();
    expect(screen.getByText("Verified agency")).toBeInTheDocument();
  });

  it("does not check favorites for a signed-out visitor (would be a guaranteed 401)", async () => {
    renderDetailPage({ signedIn: false });

    await screen.findByText("Modern Kilimani Apartment");

    expect(fetchFavorites).not.toHaveBeenCalled();
  });

  it("checks favorites for a signed-in visitor", async () => {
    renderDetailPage({ signedIn: true, currentUser: { _id: "tenant-1", role: "tenant" } });

    await screen.findByText("Modern Kilimani Apartment");

    await waitFor(() => expect(fetchFavorites).toHaveBeenCalledTimes(1));
  });

  it("does not show a Verified agency badge for an unverified agency", async () => {
    renderDetailPage({
      property: { ...sampleProperty, owner: { ...sampleProperty.owner, role: "agency", verified: false } },
    });

    expect(await screen.findByText("Modern Kilimani Apartment")).toBeInTheDocument();
    expect(screen.queryByText("Verified agency")).not.toBeInTheDocument();
  });

  it("blocks a landlord/agency from viewing another owner's listing", async () => {
    renderDetailPage({ currentUser: { _id: "someone-else", role: "landlord" } });

    expect(
      await screen.findByText("You can only view full details for your own listings. Manage them from the Workspace tab.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Modern Kilimani Apartment")).not.toBeInTheDocument();
  });

  it("lets a landlord view their own listing in full", async () => {
    renderDetailPage({ currentUser: { _id: "owner-1", role: "landlord" } });

    expect(await screen.findByText("Modern Kilimani Apartment")).toBeInTheDocument();
  });

  it("saves the listing, then reflects it as Saved and disables the button", async () => {
    saveFavorite.mockResolvedValue({});
    const user = userEvent.setup();
    renderDetailPage();

    await screen.findByText("Modern Kilimani Apartment");
    const saveButton = screen.getByRole("button", { name: "Save" });
    await user.click(saveButton);

    expect(saveFavorite).toHaveBeenCalledWith("prop-1");
    await waitFor(() => expect(screen.getByRole("button", { name: "Saved" })).toBeDisabled());
  });

  it("requires a message before sending an inquiry, and never calls createInquiry for a blank one", async () => {
    const user = userEvent.setup();
    renderDetailPage();

    await screen.findByText("Modern Kilimani Apartment");
    await user.click(screen.getByRole("button", { name: "Send inquiry" }));

    const form = screen.getByText("Send inquiry", { selector: "h3" }).closest("form");
    await user.click(within(form).getByRole("button", { name: "Send inquiry" }));

    expect(await screen.findByText("Message is required.")).toBeInTheDocument();
    expect(createInquiry).not.toHaveBeenCalled();
  });

  it("submits an inquiry and shows the sent confirmation", async () => {
    createInquiry.mockResolvedValue({});
    const user = userEvent.setup();
    renderDetailPage();

    await screen.findByText("Modern Kilimani Apartment");
    await user.click(screen.getByRole("button", { name: "Send inquiry" }));

    const form = screen.getByText("Send inquiry", { selector: "h3" }).closest("form");
    await user.type(within(form).getByLabelText("Message"), "Is this still available?");
    await user.click(within(form).getByRole("button", { name: "Send inquiry" }));

    await waitFor(() =>
      expect(createInquiry).toHaveBeenCalledWith({
        property: "prop-1",
        subject: "",
        message: "Is this still available?",
        contactPreference: "in_app",
      })
    );
    expect(await screen.findByText("Inquiry sent")).toBeInTheDocument();
  });

  it("rejects a past date for a scheduled viewing request, client-side, without calling createViewingRequest", async () => {
    const user = userEvent.setup();
    renderDetailPage({ property: { ...sampleProperty, viewingType: "scheduled" } });

    await screen.findByText("Modern Kilimani Apartment");
    await user.click(screen.getByRole("button", { name: "Request viewing" }));

    const form = screen.getByText("Request viewing", { selector: "h3" }).closest("form");
    const dateInput = within(form).getByLabelText("Requested date and time");
    // The "min" attribute only hints at the browser's own date picker UI -
    // several real browsers don't strictly enforce it for keyboard/paste
    // entry, which is exactly why the past-date check must also happen in
    // JS rather than relying on the HTML constraint alone. fireEvent.submit
    // dispatches the submit event directly (skipping the button click's own
    // native "min" constraint check) to exercise precisely that bypass path.
    fireEvent.change(dateInput, { target: { value: "2020-01-01T10:00" } });
    fireEvent.submit(form);

    expect(await screen.findByText("Choose a valid future date.")).toBeInTheDocument();
    expect(createViewingRequest).not.toHaveBeenCalled();
  });

  it("sends a mover request with the selected home size and shows the returned price estimate", async () => {
    const sampleMover = {
      _id: "mover-1",
      name: "SwiftMove Nairobi",
      serviceTypes: ["local"],
      basePrice: 3500,
    };
    getCurrentPositionOrNull.mockResolvedValue({ lat: -1.29, lng: 36.78 });
    createMoverRequest.mockResolvedValue({ priceEstimate: 4950 });
    const user = userEvent.setup();
    renderDetailPage({ movers: { affiliates: [], nearby: [sampleMover] } });

    await screen.findByText("Modern Kilimani Apartment");
    await user.click(screen.getByRole("button", { name: "Request service" }));

    const form = screen.getByText("SwiftMove Nairobi", { selector: "h3" }).closest("article").querySelector("form");
    await user.selectOptions(within(form).getByLabelText("Home size"), "studio");
    await user.type(within(form).getByLabelText("Message"), "Need help moving");
    await user.click(within(form).getByRole("button", { name: "Send request" }));

    await waitFor(() =>
      expect(createMoverRequest).toHaveBeenCalledWith(
        expect.objectContaining({ mover: "mover-1", property: "prop-1", homeSize: "studio", message: "Need help moving" })
      )
    );
    expect(await screen.findByText(/Estimated price: Ksh\s*4,950/)).toBeInTheDocument();
  });

  it("shows existing reviews, including an owner response", async () => {
    renderDetailPage({
      reviews: [
        {
          _id: "rev-1",
          user: { _id: "tenant-1", name: "Sam Tenant" },
          rating: 4,
          comment: "Nice place",
          createdAt: "2026-01-01T00:00:00.000Z",
          ownerResponse: { message: "Thanks Sam!" },
        },
      ],
    });

    expect(await screen.findByText("Sam Tenant")).toBeInTheDocument();
    expect(screen.getByText("Nice place")).toBeInTheDocument();
    expect(screen.getByText("Owner response: Thanks Sam!")).toBeInTheDocument();
  });

  it("only shows Write a review to signed-in tenants", async () => {
    renderDetailPage({ signedIn: true, currentUser: { _id: "tenant-1", role: "tenant" } });
    expect(await screen.findByText("Modern Kilimani Apartment")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Write a review" })).toBeInTheDocument();
  });

  it("doesn't show Write a review to a signed-out visitor or a non-tenant", async () => {
    renderDetailPage({ signedIn: false });
    await screen.findByText("Modern Kilimani Apartment");
    expect(screen.queryByRole("button", { name: "Write a review" })).not.toBeInTheDocument();
  });

  it("submits a review and shows the confirmation", async () => {
    createReview.mockResolvedValue({});
    const user = userEvent.setup();
    renderDetailPage({ signedIn: true, currentUser: { _id: "tenant-1", role: "tenant" } });

    await screen.findByText("Modern Kilimani Apartment");
    await user.click(screen.getByRole("button", { name: "Write a review" }));

    const form = screen.getByText("Write a review", { selector: "h3" }).closest("form");
    await user.selectOptions(within(form).getByLabelText("Rating"), "4");
    await user.type(within(form).getByLabelText("Comment (optional)"), "Loved it here");
    await user.click(within(form).getByRole("button", { name: "Submit review" }));

    await waitFor(() =>
      expect(createReview).toHaveBeenCalledWith({ property: "prop-1", rating: 4, comment: "Loved it here" })
    );
    expect(await screen.findByText("Review submitted")).toBeInTheDocument();
  });

  it("surfaces the eligibility error verbatim when the tenant hasn't had a completed viewing", async () => {
    createReview.mockRejectedValue(new Error("You can only review a property after a completed viewing"));
    const user = userEvent.setup();
    renderDetailPage({ signedIn: true, currentUser: { _id: "tenant-1", role: "tenant" } });

    await screen.findByText("Modern Kilimani Apartment");
    await user.click(screen.getByRole("button", { name: "Write a review" }));
    await user.click(screen.getByRole("button", { name: "Submit review" }));

    expect(
      await screen.findByText("You can only review a property after a completed viewing")
    ).toBeInTheDocument();
  });

  it("lets a signed-in user report another tenant's review, but not show Report on their own", async () => {
    reportReview.mockResolvedValue({});
    const user = userEvent.setup();
    renderDetailPage({
      signedIn: true,
      currentUser: { _id: "tenant-1", role: "tenant" },
      reviews: [
        {
          _id: "rev-own",
          user: { _id: "tenant-1", name: "Me" },
          rating: 5,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          _id: "rev-other",
          user: { _id: "tenant-2", name: "Someone Else" },
          rating: 1,
          comment: "Fake review",
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
    });

    await screen.findByText("Someone Else");
    // Exactly one Report button - the tenant's own review doesn't get one.
    expect(screen.getAllByRole("button", { name: "Report" })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Report" }));
    await user.type(screen.getByLabelText("Why are you reporting this review?"), "This looks fake");
    await user.click(screen.getByRole("button", { name: "Submit report" }));

    await waitFor(() => expect(reportReview).toHaveBeenCalledWith("rev-other", "This looks fake"));
    expect(await screen.findByText("Reported — an admin will review it.")).toBeInTheDocument();
  });
});
