import { fireEvent, render } from "@testing-library/react-native";
import ViewingRequestFormScreen from "./ViewingRequestFormScreen.js";
import { lightColors } from "../../theme/colors.js";

// This screen requires the native DateTimePicker unconditionally at module
// load whenever Platform.OS !== "web" (true under jest, which reports
// "ios") - stub it out entirely since none of these tests need to actually
// open the native picker (the scheduled-viewing tests submit using the
// screen's own default date).
jest.mock("@react-native-community/datetimepicker", () => "DateTimePicker");
jest.mock("../../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
jest.mock("../../api/index.js", () => ({ createViewingRequest: jest.fn() }));

import { useTheme } from "../../context/ThemeContext.js";
import { createViewingRequest } from "../../api/index.js";

const renderScreen = (viewingType, navigation = { goBack: jest.fn() }) =>
  render(
    <ViewingRequestFormScreen
      route={{ params: { propertyId: "p1", viewingType } }}
      navigation={navigation}
    />,
  );

describe("ViewingRequestFormScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTheme.mockReturnValue({ colors: lightColors });
  });

  it("submits an open-viewing request with no date required", async () => {
    createViewingRequest.mockResolvedValue({ _id: "v1" });

    const { getByText, findByText } = await renderScreen("open");

    expect(getByText(/open viewing/)).toBeTruthy();

    await fireEvent.press(getByText("Request viewing"));

    expect(await findByText("Viewing requested")).toBeTruthy();
    expect(getByText(/approved automatically/)).toBeTruthy();
    expect(createViewingRequest).toHaveBeenCalledWith({
      property: "p1",
      requestedDate: undefined,
      message: "",
    });
  });

  it("submits a scheduled-viewing request using the default future date", async () => {
    createViewingRequest.mockResolvedValue({ _id: "v2" });

    const { getByText, getByLabelText, findByText } = await renderScreen("scheduled");

    await fireEvent.changeText(getByLabelText("Message"), "Weekday evenings work best");
    await fireEvent.press(getByText("Request viewing"));

    expect(await findByText("Viewing requested")).toBeTruthy();
    expect(getByText(/owner will confirm/)).toBeTruthy();
    expect(createViewingRequest).toHaveBeenCalledTimes(1);
    const payload = createViewingRequest.mock.calls[0][0];
    expect(payload.property).toBe("p1");
    expect(payload.message).toBe("Weekday evenings work best");
    expect(typeof payload.requestedDate).toBe("string");
  });

  it("shows an error message when the request fails", async () => {
    createViewingRequest.mockRejectedValue(new Error("Slot no longer available"));

    const { getByText, findByText } = await renderScreen("open");

    await fireEvent.press(getByText("Request viewing"));

    expect(await findByText("Slot no longer available")).toBeTruthy();
  });

  it("navigates back after a successful request", async () => {
    createViewingRequest.mockResolvedValue({ _id: "v1" });
    const goBack = jest.fn();

    const { getByText, findByText } = await renderScreen("open", { goBack });

    await fireEvent.press(getByText("Request viewing"));
    await findByText("Viewing requested");

    await fireEvent.press(getByText("Back to property"));
    expect(goBack).toHaveBeenCalledTimes(1);
  });
});
