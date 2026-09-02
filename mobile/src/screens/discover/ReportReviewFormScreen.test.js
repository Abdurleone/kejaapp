import { fireEvent, render } from "@testing-library/react-native";
import ReportReviewFormScreen from "./ReportReviewFormScreen.js";
import { lightColors } from "../../theme/colors.js";

jest.mock("../../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
jest.mock("../../api/index.js", () => ({ reportReview: jest.fn() }));

import { useTheme } from "../../context/ThemeContext.js";
import { reportReview } from "../../api/index.js";

const renderScreen = (navigation = { goBack: jest.fn() }) =>
  render(<ReportReviewFormScreen route={{ params: { reviewId: "r1" } }} navigation={navigation} />);

describe("ReportReviewFormScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTheme.mockReturnValue({ colors: lightColors });
  });

  it("requires a reason before submitting", async () => {
    const { getByText } = await renderScreen();

    await fireEvent.press(getByText("Submit report"));

    expect(getByText("A reason is required.")).toBeTruthy();
    expect(reportReview).not.toHaveBeenCalled();
  });

  it("submits the report and navigates back", async () => {
    reportReview.mockResolvedValue({ _id: "r1" });
    const goBack = jest.fn();

    const { getByText, getByLabelText } = await renderScreen({ goBack });

    await fireEvent.changeText(getByLabelText("Why are you reporting this review?"), "Looks fake");
    await fireEvent.press(getByText("Submit report"));

    expect(reportReview).toHaveBeenCalledWith("r1", "Looks fake");
    await Promise.resolve();
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it("shows an error message when the report fails to submit", async () => {
    reportReview.mockRejectedValue(new Error("You cannot report your own review"));

    const { getByText, getByLabelText, findByText } = await renderScreen();

    await fireEvent.changeText(getByLabelText("Why are you reporting this review?"), "Looks fake");
    await fireEvent.press(getByText("Submit report"));

    expect(await findByText("You cannot report your own review")).toBeTruthy();
  });
});
