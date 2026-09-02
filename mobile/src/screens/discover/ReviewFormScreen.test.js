import { fireEvent, render } from "@testing-library/react-native";
import ReviewFormScreen from "./ReviewFormScreen.js";
import { lightColors } from "../../theme/colors.js";

jest.mock("../../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
jest.mock("../../api/index.js", () => ({ createReview: jest.fn() }));

import { useTheme } from "../../context/ThemeContext.js";
import { createReview } from "../../api/index.js";

const renderScreen = (navigation = { goBack: jest.fn() }) =>
  render(<ReviewFormScreen route={{ params: { propertyId: "p1" } }} navigation={navigation} />);

describe("ReviewFormScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTheme.mockReturnValue({ colors: lightColors });
  });

  it("defaults to a 5-star rating and submits with an optional comment", async () => {
    createReview.mockResolvedValue({ _id: "r1" });
    const goBack = jest.fn();

    const { getByText, getByLabelText, findByText } = await renderScreen({ goBack });

    await fireEvent.changeText(getByLabelText("Comment"), "Great place to stay");
    await fireEvent.press(getByText("Submit review"));

    expect(await findByText("Review submitted")).toBeTruthy();
    expect(createReview).toHaveBeenCalledWith({ property: "p1", rating: 5, comment: "Great place to stay" });

    await fireEvent.press(getByText("Back to property"));
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it("submits the selected rating", async () => {
    createReview.mockResolvedValue({ _id: "r1" });

    const { getByText, findByText } = await renderScreen();

    await fireEvent.press(getByText("3"));
    await fireEvent.press(getByText("Submit review"));

    expect(await findByText("Review submitted")).toBeTruthy();
    expect(createReview).toHaveBeenCalledWith({ property: "p1", rating: 3, comment: "" });
  });

  it("surfaces the eligibility error verbatim when the tenant hasn't completed a viewing", async () => {
    createReview.mockRejectedValue(new Error("You can only review a property after a completed viewing"));

    const { getByText, findByText } = await renderScreen();

    await fireEvent.press(getByText("Submit review"));

    expect(await findByText("You can only review a property after a completed viewing")).toBeTruthy();
  });
});
