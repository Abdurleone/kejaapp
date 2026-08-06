import { fireEvent, render, waitFor, act } from "@testing-library/react-native";
import { useState } from "react";
import { Pressable, Text, Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeProvider, useTheme } from "./ThemeContext.js";

function Consumer() {
  const { colorMode, resolvedColorMode, toggleColorMode } = useTheme();

  return (
    <Pressable testID="toggle" onPress={toggleColorMode}>
      <Text testID="colorMode">{colorMode}</Text>
      <Text testID="resolvedColorMode">{resolvedColorMode}</Text>
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
    jest.spyOn(Appearance, "getColorScheme").mockReturnValue("light");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("defaults to system mode when nothing is stored, resolved from the device's scheme", async () => {
    const { getByTestId } = await renderConsumer();

    await waitFor(() => expect(getByTestId("colorMode")).toHaveTextContent("system"));
    expect(getByTestId("resolvedColorMode")).toHaveTextContent("light");
  });

  it("resolves system mode to dark when the device is in dark mode", async () => {
    Appearance.getColorScheme.mockReturnValue("dark");

    const { getByTestId } = await renderConsumer();

    await waitFor(() => expect(getByTestId("resolvedColorMode")).toHaveTextContent("dark"));
  });

  it("cycles system -> light -> dark -> system on each tap and persists each choice", async () => {
    const { getByTestId } = await renderConsumer();
    const toggle = getByTestId("toggle");

    await waitFor(() => expect(getByTestId("colorMode")).toHaveTextContent("system"));

    fireEvent.press(toggle);
    await waitFor(() => expect(getByTestId("colorMode")).toHaveTextContent("light"));
    expect(await AsyncStorage.getItem("keja_color_mode")).toBe("light");

    fireEvent.press(toggle);
    await waitFor(() => expect(getByTestId("colorMode")).toHaveTextContent("dark"));
    expect(await AsyncStorage.getItem("keja_color_mode")).toBe("dark");

    fireEvent.press(toggle);
    await waitFor(() => expect(getByTestId("colorMode")).toHaveTextContent("system"));
    expect(await AsyncStorage.getItem("keja_color_mode")).toBe("system");
  });

  it("restores a previously persisted mode on mount", async () => {
    await AsyncStorage.setItem("keja_color_mode", "dark");

    const { getByTestId } = await renderConsumer();

    await waitFor(() => expect(getByTestId("colorMode")).toHaveTextContent("dark"));
  });

  it("ignores a corrupted stored value and falls back to system", async () => {
    await AsyncStorage.setItem("keja_color_mode", "not-a-real-mode");

    const { getByTestId } = await renderConsumer();

    await waitFor(() => expect(getByTestId("colorMode")).toHaveTextContent("system"));
  });

  it("updates resolvedColorMode live when the OS preference changes while still in system mode", async () => {
    let emitChange;
    jest.spyOn(Appearance, "addChangeListener").mockImplementation((listener) => {
      emitChange = listener;
      return { remove: jest.fn() };
    });

    const { getByTestId } = await renderConsumer();

    await waitFor(() => expect(getByTestId("resolvedColorMode")).toHaveTextContent("light"));

    await act(async () => {
      emitChange({ colorScheme: "dark" });
    });

    await waitFor(() => expect(getByTestId("resolvedColorMode")).toHaveTextContent("dark"));
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
