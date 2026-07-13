import { fireEvent, render, waitFor } from "@testing-library/react-native";
import PropertyEditScreen from "./PropertyEditScreen.js";
import { lightColors } from "../../theme/colors.js";

jest.mock("../../api/index.js", () => ({
  fetchProperty: jest.fn(),
  updateProperty: jest.fn(),
  uploadPropertyImage: jest.fn(),
  removePropertyImage: jest.fn(),
}));
jest.mock("../../context/SettingsContext.js", () => ({
  useSettings: jest.fn(),
  resolveAssetUrl: jest.fn((url) => url),
}));
jest.mock("../../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
jest.mock("../../utils/imagePicker.js", () => ({ pickImagesOrEmpty: jest.fn() }));

import {
  fetchProperty,
  removePropertyImage,
  updateProperty,
  uploadPropertyImage,
} from "../../api/index.js";
import { useSettings } from "../../context/SettingsContext.js";
import { useTheme } from "../../context/ThemeContext.js";
import { pickImagesOrEmpty } from "../../utils/imagePicker.js";

const baseProperty = {
  _id: "p1",
  title: "Cozy studio",
  description: "Near town",
  type: "studio",
  status: "available",
  viewingType: "scheduled",
  viewingInstructions: "",
  price: { rent: 15000, deposit: 15000, agencyFee: 0 },
  location: { county: "Nairobi", town: "Westlands", area: "Chiromo" },
  bedrooms: 1,
  bathrooms: 1,
  amenities: ["Parking"],
  contact: { preferredMethod: "inquiry", phone: "", email: "", whatsapp: "", availableHours: "", notes: "" },
  images: [{ _id: "img1", url: "/uploads/img1.jpg" }],
};

const renderScreen = (navigation = { goBack: jest.fn() }) =>
  render(<PropertyEditScreen route={{ params: { propertyId: "p1" } }} navigation={navigation} />);

describe("PropertyEditScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSettings.mockReturnValue({ apiBaseUrl: "http://localhost:5000" });
    useTheme.mockReturnValue({ colors: lightColors });
  });

  it("loads and pre-fills the form with the existing listing", async () => {
    fetchProperty.mockResolvedValue(baseProperty);

    const { getByDisplayValue, getByText } = await renderScreen();

    await waitFor(() => expect(getByDisplayValue("Cozy studio")).toBeTruthy());
    expect(getByDisplayValue("Near town")).toBeTruthy();
    expect(getByText("Remove")).toBeTruthy();
  });

  it("submits an update and navigates back", async () => {
    fetchProperty.mockResolvedValue(baseProperty);
    updateProperty.mockResolvedValue({ ...baseProperty, title: "Updated studio" });
    const goBack = jest.fn();

    const { getByDisplayValue, getByText } = await renderScreen({ goBack });

    await waitFor(() => expect(getByDisplayValue("Cozy studio")).toBeTruthy());

    fireEvent.changeText(getByDisplayValue("Cozy studio"), "Updated studio");
    await waitFor(() => expect(getByDisplayValue("Updated studio")).toBeTruthy());

    fireEvent.press(getByText("Save changes"));

    await waitFor(() => expect(goBack).toHaveBeenCalledTimes(1));
    expect(updateProperty).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({ title: "Updated studio" })
    );
  });

  it("adds a photo and shows a duplicate-flag notice", async () => {
    fetchProperty.mockResolvedValue(baseProperty);
    pickImagesOrEmpty.mockResolvedValue([
      { uri: "file://new.jpg", fileName: "new.jpg", mimeType: "image/jpeg", base64: "abc123" },
    ]);
    uploadPropertyImage.mockResolvedValue({
      data: { ...baseProperty, images: [...baseProperty.images, { _id: "img2", url: "/uploads/img2.jpg" }] },
      imageReview: { status: "suspicious" },
    });

    const { getByText } = await renderScreen();

    await waitFor(() => expect(getByText("Add photo")).toBeTruthy());

    fireEvent.press(getByText("Add photo"));

    await waitFor(() =>
      expect(getByText("Photo added, but it was flagged as a possible duplicate for admin review.")).toBeTruthy()
    );
    expect(uploadPropertyImage).toHaveBeenCalledWith("p1", {
      fileName: "new.jpg",
      mimeType: "image/jpeg",
      data: "abc123",
    });
  });

  it("removes an existing photo", async () => {
    fetchProperty.mockResolvedValue(baseProperty);
    removePropertyImage.mockResolvedValue({ ...baseProperty, images: [] });

    const { getByText, queryByText } = await renderScreen();

    await waitFor(() => expect(getByText("Remove")).toBeTruthy());

    fireEvent.press(getByText("Remove"));

    await waitFor(() => expect(queryByText("Remove")).toBeNull());
    expect(removePropertyImage).toHaveBeenCalledWith("p1", "img1");
  });
});
