import { fireEvent, render } from "@testing-library/react-native";
import { Platform } from "react-native";
import MoverRequestFormScreen from "./MoverRequestFormScreen.js";
import { lightColors } from "../../theme/colors.js";

// This screen requires the native DateTimePicker unconditionally at module
// load whenever Platform.OS !== "web" (true under jest, which reports
// "ios") - stub it out entirely since none of these tests need to actually
// open the native picker (matching ViewingRequestFormScreen's convention).
jest.mock("@react-native-community/datetimepicker", () => "DateTimePicker");
jest.mock("../../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
jest.mock("../../api/index.js", () => ({ createMoverRequest: jest.fn() }));
jest.mock("../../utils/location.js", () => ({ getCurrentPositionOrNull: jest.fn() }));

import { useTheme } from "../../context/ThemeContext.js";
import { createMoverRequest } from "../../api/index.js";
import { getCurrentPositionOrNull } from "../../utils/location.js";

const renderScreen = (params = {}, navigation = { goBack: jest.fn() }) =>
  render(
    <MoverRequestFormScreen
      route={{ params: { moverId: "m1", moverName: "Nairobi Movers", propertyId: "p1", ...params } }}
      navigation={navigation}
    />,
  );

describe("MoverRequestFormScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTheme.mockReturnValue({ colors: lightColors });
  });

  it("requires a message before submitting", async () => {
    const { getByText } = await renderScreen();

    await fireEvent.press(getByText("Send request"));

    expect(getByText("Message is required.")).toBeTruthy();
    expect(createMoverRequest).not.toHaveBeenCalled();
  });

  it("requires a home size before submitting", async () => {
    const { getByText, getByPlaceholderText } = await renderScreen();

    await fireEvent.changeText(getByPlaceholderText("Tell them about your move..."), "Moving a 2-bedroom flat");
    await fireEvent.press(getByText("Send request"));

    expect(getByText("Home size is required.")).toBeTruthy();
    expect(createMoverRequest).not.toHaveBeenCalled();
  });

  it("submits with the device's resolved pickup location, home size, and no preferred date chosen", async () => {
    getCurrentPositionOrNull.mockResolvedValue({ lat: -1.28, lng: 36.82 });
    createMoverRequest.mockResolvedValue({ _id: "r1", priceEstimate: 4950 });

    const { getByText, getByPlaceholderText, findByText } = await renderScreen();

    await fireEvent.press(getByText("2 Bedroom"));
    await fireEvent.changeText(getByPlaceholderText("Tell them about your move..."), "Moving a 2-bedroom flat");
    await fireEvent.press(getByText("Send request"));

    expect(await findByText(/Nairobi Movers will respond soon\..*Estimated price: Ksh\s*4,950\./)).toBeTruthy();
    expect(createMoverRequest).toHaveBeenCalledWith({
      mover: "m1",
      property: "p1",
      homeSize: "2br",
      message: "Moving a 2-bedroom flat",
      preferredDate: undefined,
      pickupLat: -1.28,
      pickupLng: 36.82,
    });
  });

  describe("preferred date (web platform text fallback)", () => {
    const originalPlatformOS = Platform.OS;

    afterEach(() => {
      Platform.OS = originalPlatformOS;
    });

    it("rejects a past preferred date without calling createMoverRequest", async () => {
      Platform.OS = "web";
      getCurrentPositionOrNull.mockResolvedValue(null);

      const { getByText, getByPlaceholderText, findByText } = await renderScreen();

      await fireEvent.press(getByText("2 Bedroom"));
      await fireEvent.changeText(getByPlaceholderText("Tell them about your move..."), "Moving a 2-bedroom flat");
      await fireEvent.changeText(getByPlaceholderText("YYYY-MM-DD"), "2020-01-01");
      await fireEvent.press(getByText("Send request"));

      expect(await findByText("Choose a valid date, today or later.")).toBeTruthy();
      expect(createMoverRequest).not.toHaveBeenCalled();
    });

    it("submits a valid future preferred date", async () => {
      Platform.OS = "web";
      getCurrentPositionOrNull.mockResolvedValue(null);
      createMoverRequest.mockResolvedValue({ _id: "r1" });

      const { getByText, getByPlaceholderText, findByText } = await renderScreen();

      await fireEvent.press(getByText("2 Bedroom"));
      await fireEvent.changeText(getByPlaceholderText("Tell them about your move..."), "Moving a 2-bedroom flat");
      await fireEvent.changeText(getByPlaceholderText("YYYY-MM-DD"), "2026-08-01");
      await fireEvent.press(getByText("Send request"));

      expect(await findByText("Nairobi Movers will respond soon.")).toBeTruthy();
      const payload = createMoverRequest.mock.calls[0][0];
      expect(typeof payload.preferredDate).toBe("string");
    });
  });

  it("still submits when location permission is denied", async () => {
    getCurrentPositionOrNull.mockResolvedValue(null);
    createMoverRequest.mockResolvedValue({ _id: "r1" });

    const { getByText, getByPlaceholderText, findByText } = await renderScreen();

    await fireEvent.press(getByText("2 Bedroom"));
    await fireEvent.changeText(getByPlaceholderText("Tell them about your move..."), "Moving a 2-bedroom flat");
    await fireEvent.press(getByText("Send request"));

    await findByText("Nairobi Movers will respond soon.");
    expect(createMoverRequest).toHaveBeenCalledWith(
      expect.objectContaining({ pickupLat: undefined, pickupLng: undefined }),
    );
  });

  it("falls back to a generic confirmation when moverName is missing", async () => {
    getCurrentPositionOrNull.mockResolvedValue(null);
    createMoverRequest.mockResolvedValue({ _id: "r1" });

    const { getByText, getByPlaceholderText, findByText } = await renderScreen({ moverName: undefined });

    await fireEvent.press(getByText("2 Bedroom"));
    await fireEvent.changeText(getByPlaceholderText("Tell them about your move..."), "Moving a 2-bedroom flat");
    await fireEvent.press(getByText("Send request"));

    expect(await findByText("The mover will respond soon.")).toBeTruthy();
  });

  it("shows an error message when the request fails", async () => {
    getCurrentPositionOrNull.mockResolvedValue(null);
    createMoverRequest.mockRejectedValue(new Error("Mover is no longer available"));

    const { getByText, getByPlaceholderText, findByText } = await renderScreen();

    await fireEvent.press(getByText("2 Bedroom"));
    await fireEvent.changeText(getByPlaceholderText("Tell them about your move..."), "Moving a 2-bedroom flat");
    await fireEvent.press(getByText("Send request"));

    expect(await findByText("Mover is no longer available")).toBeTruthy();
  });

  it("navigates back after a successful request", async () => {
    getCurrentPositionOrNull.mockResolvedValue(null);
    createMoverRequest.mockResolvedValue({ _id: "r1" });
    const goBack = jest.fn();

    const { getByText, getByPlaceholderText, findByText } = await renderScreen({}, { goBack });

    await fireEvent.press(getByText("2 Bedroom"));
    await fireEvent.changeText(getByPlaceholderText("Tell them about your move..."), "Moving a 2-bedroom flat");
    await fireEvent.press(getByText("Send request"));
    await findByText("Nairobi Movers will respond soon.");

    await fireEvent.press(getByText("Done"));
    expect(goBack).toHaveBeenCalledTimes(1);
  });
});
