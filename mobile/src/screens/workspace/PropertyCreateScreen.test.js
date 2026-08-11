import { fireEvent, render, waitFor } from "@testing-library/react-native";
import PropertyCreateScreen from "./PropertyCreateScreen.js";
import { lightColors } from "../../theme/colors.js";

jest.mock("../../api/index.js", () => ({
  createProperty: jest.fn(),
  uploadPropertyImage: jest.fn(),
}));
jest.mock("../../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
jest.mock("../../utils/imagePicker.js", () => ({ pickImagesOrEmpty: jest.fn() }));

import { createProperty, uploadPropertyImage } from "../../api/index.js";
import { useTheme } from "../../context/ThemeContext.js";
import { pickImagesOrEmpty } from "../../utils/imagePicker.js";

const renderScreen = (navigation = { goBack: jest.fn() }) =>
  render(<PropertyCreateScreen navigation={navigation} />);

describe("PropertyCreateScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTheme.mockReturnValue({ colors: lightColors });
  });

  it("blocks submit with a validation error when the title is too short", async () => {
    const { getByText } = await renderScreen();

    await fireEvent.press(getByText("Create listing"));

    await waitFor(() => expect(getByText("Title must be at least 3 characters.")).toBeTruthy());
    expect(createProperty).not.toHaveBeenCalled();
  });

  it("creates a listing with no photos and navigates back", async () => {
    createProperty.mockResolvedValue({ _id: "p1" });
    const goBack = jest.fn();

    const { getByLabelText, getByText } = await renderScreen({ goBack });

    await fireEvent.changeText(getByLabelText("Title"), "Cozy studio");
    await fireEvent.changeText(getByLabelText("Monthly rent (KES)"), "15000");

    await fireEvent.press(getByText("Create listing"));

    await waitFor(() => expect(goBack).toHaveBeenCalledTimes(1));
    expect(createProperty).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Cozy studio" })
    );
    expect(uploadPropertyImage).not.toHaveBeenCalled();
  });

  it("stages a picked photo locally, then uploads it only after the listing is created", async () => {
    createProperty.mockResolvedValue({ _id: "p1" });
    pickImagesOrEmpty.mockResolvedValue([
      { uri: "file://new.jpg", fileName: "new.jpg", mimeType: "image/jpeg", base64: "abc123" },
    ]);
    uploadPropertyImage.mockResolvedValue({ data: {}, imageReview: { status: "ok" } });

    const { getByLabelText, getByText, queryByText } = await renderScreen();

    await fireEvent.press(getByText("Select photos"));
    await waitFor(() => expect(queryByText("No photos selected yet.")).toBeNull());
    // Not uploaded yet - the property doesn't exist server-side until submit.
    expect(uploadPropertyImage).not.toHaveBeenCalled();

    await fireEvent.changeText(getByLabelText("Title"), "Cozy studio");
    await fireEvent.changeText(getByLabelText("Monthly rent (KES)"), "15000");
    await fireEvent.press(getByText("Create listing"));

    await waitFor(() =>
      expect(uploadPropertyImage).toHaveBeenCalledWith("p1", {
        fileName: "new.jpg",
        mimeType: "image/jpeg",
        data: "abc123",
      })
    );
  });

  it("removes a staged photo before submit", async () => {
    pickImagesOrEmpty.mockResolvedValue([
      { uri: "file://new.jpg", fileName: "new.jpg", mimeType: "image/jpeg", base64: "abc123" },
    ]);

    const { getByText, queryByText } = await renderScreen();

    await fireEvent.press(getByText("Select photos"));
    await waitFor(() => expect(getByText("Remove")).toBeTruthy());

    await fireEvent.press(getByText("Remove"));

    await waitFor(() => expect(queryByText("No photos selected yet.")).toBeTruthy());
  });

  it("surfaces a create failure without navigating away", async () => {
    createProperty.mockRejectedValue(new Error("Could not create this listing."));

    const { getByLabelText, getByText } = await renderScreen();

    await fireEvent.changeText(getByLabelText("Title"), "Cozy studio");
    await fireEvent.changeText(getByLabelText("Monthly rent (KES)"), "15000");
    await fireEvent.press(getByText("Create listing"));

    await waitFor(() => expect(getByText("Could not create this listing.")).toBeTruthy());
  });
});
