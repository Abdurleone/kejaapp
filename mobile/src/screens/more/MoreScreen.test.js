import { fireEvent, render } from "@testing-library/react-native";
import MoreScreen from "./MoreScreen.js";
import { lightColors } from "../../theme/colors.js";

jest.mock("../../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));

import { useTheme } from "../../context/ThemeContext.js";

describe("MoreScreen", () => {
  const mockNavigate = jest.fn();
  const navigation = { navigate: mockNavigate };

  beforeEach(() => {
    jest.clearAllMocks();
    useTheme.mockReturnValue({ colors: lightColors });
  });

  it("lists every hidden tab and navigates to the one pressed", async () => {
    const { getByText } = await render(
      <MoreScreen navigation={navigation} hiddenTabs={["Movers", "Feedback", "Account"]} unreadCount={0} />
    );

    expect(getByText("Movers")).toBeTruthy();
    expect(getByText("Feedback")).toBeTruthy();
    expect(getByText("Account")).toBeTruthy();

    fireEvent.press(getByText("Account"));
    expect(mockNavigate).toHaveBeenCalledWith("Account");
  });

  it("shows the unread count next to Notifications and refreshes it on press", async () => {
    const onOpenNotifications = jest.fn();
    const { getByText } = await render(
      <MoreScreen
        navigation={navigation}
        hiddenTabs={["Notifications", "Feedback"]}
        unreadCount={3}
        onOpenNotifications={onOpenNotifications}
      />
    );

    expect(getByText("3")).toBeTruthy();

    fireEvent.press(getByText("Notifications"));
    expect(onOpenNotifications).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("Notifications");
  });

  it("caps the displayed unread count at 99+", async () => {
    const { getByText } = await render(
      <MoreScreen navigation={navigation} hiddenTabs={["Notifications"]} unreadCount={137} />
    );

    expect(getByText("99+")).toBeTruthy();
  });

  it("renders no badge when there are no unread notifications", async () => {
    const { queryByText } = await render(
      <MoreScreen navigation={navigation} hiddenTabs={["Notifications"]} unreadCount={0} />
    );

    expect(queryByText("0")).toBeNull();
  });
});
