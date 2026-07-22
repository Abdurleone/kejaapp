import { act, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { resolveAssetUrl, SettingsProvider, useSettings } from "./SettingsContext.js";

jest.mock("../api/index.js", () => ({
  getApiBaseUrl: jest.fn(),
  setApiBaseUrl: jest.fn(),
}));

import { getApiBaseUrl, setApiBaseUrl } from "../api/index.js";

describe("resolveAssetUrl", () => {
  it("returns null for a falsy url", () => {
    expect(resolveAssetUrl(null, "http://localhost:5000")).toBeNull();
    expect(resolveAssetUrl(undefined, "http://localhost:5000")).toBeNull();
    expect(resolveAssetUrl("", "http://localhost:5000")).toBeNull();
  });

  it("returns an absolute http(s) url unchanged", () => {
    expect(resolveAssetUrl("https://cdn.example.com/a.png", "http://localhost:5000")).toBe(
      "https://cdn.example.com/a.png"
    );
  });

  it("prefixes a relative url with the api base url, trimming a trailing slash", () => {
    expect(resolveAssetUrl("/uploads/a.png", "http://localhost:5000/")).toBe(
      "http://localhost:5000/uploads/a.png"
    );
  });
});

describe("SettingsProvider", () => {
  let capturedSettings;

  function Capture() {
    capturedSettings = useSettings();
    return <Text>{capturedSettings.apiBaseUrl ?? "loading"}</Text>;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    capturedSettings = null;
  });

  it("loads the api base url on mount", async () => {
    getApiBaseUrl.mockResolvedValue("http://localhost:5000");

    const { getByText } = await render(
      <SettingsProvider>
        <Capture />
      </SettingsProvider>
    );

    await waitFor(() => expect(getByText("http://localhost:5000")).toBeTruthy());
  });

  it("persists a new api base url and refreshes it", async () => {
    getApiBaseUrl
      .mockResolvedValueOnce("http://localhost:5000")
      .mockResolvedValueOnce("http://192.168.1.20:5000");
    setApiBaseUrl.mockResolvedValue();

    const { getByText } = await render(
      <SettingsProvider>
        <Capture />
      </SettingsProvider>
    );

    await waitFor(() => expect(getByText("http://localhost:5000")).toBeTruthy());

    await act(async () => {
      await capturedSettings.setApiBaseUrl("http://192.168.1.20:5000");
    });

    expect(setApiBaseUrl).toHaveBeenCalledWith("http://192.168.1.20:5000");
    await waitFor(() => expect(getByText("http://192.168.1.20:5000")).toBeTruthy());
  });

  it("keeps the same setApiBaseUrl function reference across a change that updates apiBaseUrl", async () => {
    // The outer `value` object is memoized on [apiBaseUrl, ...], so it's
    // already a new object once apiBaseUrl changes - that alone doesn't
    // prove setApiBaseUrl itself is stable. Wrapping it in useCallback is
    // what keeps *its* reference identical even across a render where the
    // surrounding value object necessarily changes.
    getApiBaseUrl
      .mockResolvedValueOnce("http://localhost:5000")
      .mockResolvedValueOnce("http://192.168.1.20:5000");
    setApiBaseUrl.mockResolvedValue();
    const captured = [];

    function CaptureConsumer() {
      const value = useSettings();
      captured.push(value);
      return <Text>{value.apiBaseUrl ?? "loading"}</Text>;
    }

    const { getByText } = await render(
      <SettingsProvider>
        <CaptureConsumer />
      </SettingsProvider>
    );
    await waitFor(() => expect(getByText("http://localhost:5000")).toBeTruthy());
    const beforeSet = captured[captured.length - 1].setApiBaseUrl;

    await act(async () => {
      await beforeSet("http://192.168.1.20:5000");
    });
    await waitFor(() => expect(getByText("http://192.168.1.20:5000")).toBeTruthy());
    const afterSet = captured[captured.length - 1].setApiBaseUrl;

    expect(afterSet).toBe(beforeSet);
  });
});
