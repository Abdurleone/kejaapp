import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeProvider, useTheme } from "./ThemeContext.js";

function Consumer() {
  const { colorMode, toggleColorMode } = useTheme();

  return (
    <Pressable onPress={toggleColorMode}>
      <Text>{colorMode}</Text>
    </Pressable>
  );
}

const renderConsumer = () =>
  render(
    <ThemeProvider>
      <Consumer />
    </ThemeProvider>
  );

describe("ThemeContext", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("defaults to light mode when nothing is stored", async () => {
    const { getByText } = await renderConsumer();

    await waitFor(() => expect(getByText("light")).toBeTruthy());
  });

  it("toggles to dark mode and persists it", async () => {
    const { getByText } = await renderConsumer();

    await waitFor(() => expect(getByText("light")).toBeTruthy());

    fireEvent.press(getByText("light"));

    await waitFor(() => expect(getByText("dark")).toBeTruthy());
    expect(await AsyncStorage.getItem("keja_color_mode")).toBe("dark");
  });

  it("restores a previously persisted mode on mount", async () => {
    await AsyncStorage.setItem("keja_color_mode", "dark");

    const { getByText } = await renderConsumer();

    await waitFor(() => expect(getByText("dark")).toBeTruthy());
  });

  it("ignores a corrupted stored value and falls back to light", async () => {
    await AsyncStorage.setItem("keja_color_mode", "not-a-real-mode");

    const { getByText } = await renderConsumer();

    await waitFor(() => expect(getByText("light")).toBeTruthy());
  });
});
