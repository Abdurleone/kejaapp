import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import PropertyDetailPage from "../src/pages/PropertyDetailPage.jsx";
import { renderWithAuth } from "./helpers/renderWithAuth.jsx";

const { fetchPropertyById, fetchFavorites, fetchPropertyMovers, saveFavorite, createInquiry } = vi.hoisted(() => ({
  fetchPropertyById: vi.fn(),
  fetchFavorites: vi.fn(),
  fetchPropertyMovers: vi.fn(),
  saveFavorite: vi.fn(),
  createInquiry: vi.fn(),
}));

vi.mock("../app-utils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, fetchPropertyById, fetchFavorites, fetchPropertyMovers, saveFavorite, createInquiry };
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
  fetchFavorites.mockResolvedValue(props.favorites ?? []);
  fetchPropertyMovers.mockResolvedValue(props.movers ?? noMovers);
  fetchPropertyById.mockResolvedValue(props.property ?? sampleProperty);

  return renderWithAuth(
    <PropertyDetailPage propertyId="prop-1" apiBaseUrl="http://localhost:5000" onBack={props.onBack ?? vi.fn()} />,
    { currentUser: props.currentUser ?? null, signedIn: props.signedIn ?? false }
  );
};

// PropertyDetailPage had zero test coverage of any kind before this file -
// not even the regex-matching-source-strings kind other pages had. This
// covers its highest-value/highest-risk behavior: the owner-only access
// gate, the loading/error states, and the save/inquiry flows. The viewing-
// request and movers sections are left for a future slice - this file is
// already covering a lot of ground and splitting keeps each PR reviewable.
describe("PropertyDetailPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading skeleton before the property has loaded", () => {
    fetchPropertyById.mockReturnValue(new Promise(() => {}));
    fetchFavorites.mockResolvedValue([]);
    fetchPropertyMovers.mockResolvedValue(noMovers);

    const { container } = renderWithAuth(
      <PropertyDetailPage propertyId="prop-1" apiBaseUrl="http://localhost:5000" onBack={vi.fn()} />
    );

    expect(container.querySelector(".property-detail-skeleton, [class*='skeleton']")).not.toBeNull();
  });

  it("shows an error state with a Back action when the property fails to load", async () => {
    fetchPropertyById.mockRejectedValue(new Error("Property not found"));
    fetchFavorites.mockResolvedValue([]);
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
});
