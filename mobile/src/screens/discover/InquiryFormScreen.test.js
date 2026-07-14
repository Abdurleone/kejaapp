import { fireEvent, render } from "@testing-library/react-native";
import InquiryFormScreen from "./InquiryFormScreen.js";
import { lightColors } from "../../theme/colors.js";

jest.mock("../../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
jest.mock("../../api/index.js", () => ({ createInquiry: jest.fn() }));

import { useTheme } from "../../context/ThemeContext.js";
import { createInquiry } from "../../api/index.js";

const renderScreen = (navigation = { goBack: jest.fn() }) =>
  render(<InquiryFormScreen route={{ params: { propertyId: "p1" } }} navigation={navigation} />);

describe("InquiryFormScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTheme.mockReturnValue({ colors: lightColors });
  });

  it("requires a message before submitting", async () => {
    const { getByText } = await renderScreen();

    await fireEvent.press(getByText("Send inquiry"));

    expect(getByText("Message is required.")).toBeTruthy();
    expect(createInquiry).not.toHaveBeenCalled();
  });

  it("sends the inquiry and shows a confirmation screen", async () => {
    createInquiry.mockResolvedValue({ _id: "i1" });
    const goBack = jest.fn();

    const { getByText, getByLabelText, findByText } = await renderScreen({ goBack });

    await fireEvent.changeText(getByLabelText("Subject"), "Viewing this week?");
    await fireEvent.changeText(getByLabelText("Message"), "Is this still available?");
    await fireEvent.press(getByText("Phone"));
    await fireEvent.press(getByText("Send inquiry"));

    expect(await findByText("Inquiry sent")).toBeTruthy();
    expect(createInquiry).toHaveBeenCalledWith({
      property: "p1",
      subject: "Viewing this week?",
      message: "Is this still available?",
      contactPreference: "phone",
    });

    await fireEvent.press(getByText("Back to property"));
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it("shows an error message when the inquiry fails to send", async () => {
    createInquiry.mockRejectedValue(new Error("Could not reach the server"));

    const { getByText, getByLabelText, findByText } = await renderScreen();

    await fireEvent.changeText(getByLabelText("Message"), "Is this still available?");
    await fireEvent.press(getByText("Send inquiry"));

    expect(await findByText("Could not reach the server")).toBeTruthy();
  });
});
