import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useState } from "react";
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

  it("keeps the same context value reference across a re-render that doesn't change colorMode", async () => {
    const captured = [];

    function CaptureConsumer() {
      const value = useTheme();
      captured.push(value);
      return null;
    }

    function Harness() {
      const [tick, setTick] = useState(0);

      return (
        <ThemeProvider>
          <CaptureConsumer />
          <Pressable onPress={() => setTick((current) => current + 1)}>
            <Text>Bump {tick}</Text>
          </Pressable>
        </ThemeProvider>
      );
    }

    const { getByText } = await render(<Harness />);
    await waitFor(() => expect(captured.length).toBeGreaterThan(0));
    const beforeCount = captured.length;

    // Forces ThemeProvider to re-render (its children prop reference
    // changes) without touching colorMode - a properly memoized context
    // value should be the exact same object both times.
    fireEvent.press(getByText("Bump 0"));
    await waitFor(() => expect(captured.length).toBeGreaterThan(beforeCount));

    expect(captured[captured.length - 1]).toBe(captured[beforeCount - 1]);
  });
});
