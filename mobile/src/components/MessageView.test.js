import { fireEvent, render } from "@testing-library/react-native";
import MessageView from "./MessageView.js";

describe("MessageView", () => {
  it("renders title and message text", async () => {
    const { getByText } = await render(
      <MessageView title="Sign in required" message="Sign in to continue." />
    );

    expect(getByText("Sign in required")).toBeTruthy();
    expect(getByText("Sign in to continue.")).toBeTruthy();
  });

  it("omits the action button when no onAction handler is given", async () => {
    const { queryByText } = await render(<MessageView title="No results" actionLabel="Retry" />);

    expect(queryByText("Retry")).toBeNull();
  });

  it("calls onAction when the action button is pressed", async () => {
    const onAction = jest.fn();
    const { getByText } = await render(
      <MessageView title="Sign in required" actionLabel="Sign in" onAction={onAction} />
    );

    fireEvent.press(getByText("Sign in"));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
