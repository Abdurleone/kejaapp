import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import PropertyEditPage from "../src/pages/PropertyEditPage.jsx";

const { fetchPropertyById, updateProperty, addPropertyImage } = vi.hoisted(() => ({
  fetchPropertyById: vi.fn(),
  updateProperty: vi.fn(),
  addPropertyImage: vi.fn(),
}));

vi.mock("../app-utils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, fetchPropertyById, updateProperty, addPropertyImage };
});

const sampleProperty = {
  _id: "prop-1",
  title: "Modern Kilimani Apartment",
  price: { rent: 45000 },
  location: { county: "Nairobi", town: "Nairobi", area: "Kilimani", coordinates: { type: "Point", coordinates: [36.8, -1.3] } },
  bedrooms: 2,
  bathrooms: 1,
  images: [],
};

// Replaces page-components.test.js's regex-source-matching assertions for
// PropertyEditPage with real render + interaction tests.
describe("PropertyEditPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads the property and pre-fills the shared form", async () => {
    fetchPropertyById.mockResolvedValue(sampleProperty);

    render(<PropertyEditPage propertyId="prop-1" apiBaseUrl="http://localhost:5000" onBack={vi.fn()} />);

    expect(await screen.findByDisplayValue("Modern Kilimani Apartment")).toBeInTheDocument();
    expect(screen.getByDisplayValue("45000")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Kilimani")).toBeInTheDocument();
  });

  it("saves changes, preserving the original coordinates, and shows a confirmation", async () => {
    fetchPropertyById.mockResolvedValue(sampleProperty);
    const updated = { ...sampleProperty, title: "Updated Title" };
    updateProperty.mockResolvedValue(updated);
    const onSaved = vi.fn();
    const user = userEvent.setup();

    render(<PropertyEditPage propertyId="prop-1" apiBaseUrl="http://localhost:5000" onBack={vi.fn()} onSaved={onSaved} />);
    await screen.findByDisplayValue("Modern Kilimani Apartment");

    const titleInput = screen.getByLabelText("Title");
    await user.clear(titleInput);
    await user.type(titleInput, "Updated Title");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(updateProperty).toHaveBeenCalledWith(
        "prop-1",
        expect.objectContaining({
          title: "Updated Title",
          location: expect.objectContaining({ coordinates: sampleProperty.location.coordinates }),
        })
      )
    );
    expect(await screen.findByText("Listing updated.")).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledWith(updated);
  });

  it("pre-checks existing accessibility features and lets one be unchecked", async () => {
    fetchPropertyById.mockResolvedValue({ ...sampleProperty, accessibilityFeatures: ["wheelchairRamp", "elevatorAccess"] });
    updateProperty.mockResolvedValue({});
    const user = userEvent.setup();

    render(<PropertyEditPage propertyId="prop-1" apiBaseUrl="http://localhost:5000" onBack={vi.fn()} />);
    await screen.findByDisplayValue("Modern Kilimani Apartment");

    expect(screen.getByRole("checkbox", { name: "Wheelchair ramp" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Elevator/lift access" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Ground-floor unit" })).not.toBeChecked();

    await user.click(screen.getByRole("checkbox", { name: "Wheelchair ramp" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(updateProperty).toHaveBeenCalledWith(
        "prop-1",
        expect.objectContaining({ accessibilityFeatures: ["elevatorAccess"] })
      )
    );
  });

  it("shows a load error with a way back to the workspace", async () => {
    fetchPropertyById.mockRejectedValue(new Error("Property not found."));
    const onBack = vi.fn();
    const user = userEvent.setup();

    render(<PropertyEditPage propertyId="missing" apiBaseUrl="http://localhost:5000" onBack={onBack} />);

    expect(await screen.findByText("Property not found.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back to workspace" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("does not discard unsaved form edits when the image manager reports an update", async () => {
    fetchPropertyById.mockResolvedValue(sampleProperty);
    // The server's response to the image-only mutation reflects the
    // *last-saved* description ("stale" relative to what the landlord is
    // mid-typing below), plus the newly added image.
    addPropertyImage.mockResolvedValue({
      data: {
        ...sampleProperty,
        description: "Stale server description",
        images: [{ _id: "img-1", url: "https://example.com/photo.jpg" }],
      },
      imageReview: { status: "clear" },
    });
    const user = userEvent.setup();

    render(<PropertyEditPage propertyId="prop-1" apiBaseUrl="http://localhost:5000" onBack={vi.fn()} />);
    await screen.findByDisplayValue("Modern Kilimani Apartment");

    const descriptionInput = screen.getByLabelText("Description");
    await user.type(descriptionInput, "In-progress unsaved description");

    await user.type(screen.getByPlaceholderText("Or paste an image URL"), "https://example.com/photo.jpg");
    await user.click(screen.getByRole("button", { name: "Add by URL" }));

    await waitFor(() => expect(addPropertyImage).toHaveBeenCalled());
    await screen.findByText("Image added.");

    // The image gallery reflects the new server data...
    expect(screen.getByAltText("")).toHaveAttribute("src", expect.stringContaining("photo.jpg"));
    // ...but the unsaved description the landlord was typing must survive.
    expect(screen.getByDisplayValue("In-progress unsaved description")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Stale server description")).not.toBeInTheDocument();
  });

  it("shows a save error without losing the loaded form", async () => {
    fetchPropertyById.mockResolvedValue(sampleProperty);
    updateProperty.mockRejectedValue(new Error("Could not save your changes."));
    const user = userEvent.setup();

    render(<PropertyEditPage propertyId="prop-1" apiBaseUrl="http://localhost:5000" onBack={vi.fn()} />);
    await screen.findByDisplayValue("Modern Kilimani Apartment");

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Could not save your changes.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Modern Kilimani Apartment")).toBeInTheDocument();
  });
});
