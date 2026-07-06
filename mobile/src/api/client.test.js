import {
  apiFetch,
  buildQueryString,
  getApiBaseUrl,
  getAuthToken,
  setApiBaseUrl,
  setAuthToken,
} from "./client.js";

describe("buildQueryString", () => {
  it("builds a query string from provided filters", () => {
    expect(buildQueryString({ page: 1, limit: 20 })).toBe("?page=1&limit=20");
  });

  it("omits undefined, null, and empty-string values", () => {
    expect(buildQueryString({ lat: undefined, lng: null, q: "", page: 2 })).toBe("?page=2");
  });

  it("returns an empty string when there are no usable filters", () => {
    expect(buildQueryString({})).toBe("");
  });
});

describe("auth token storage", () => {
  it("round-trips a token through AsyncStorage", async () => {
    await setAuthToken("test-token");
    expect(await getAuthToken()).toBe("test-token");
  });

  it("clears the token when set to a falsy value", async () => {
    await setAuthToken("test-token");
    await setAuthToken(null);
    expect(await getAuthToken()).toBeNull();
  });
});

describe("API base URL storage", () => {
  it("falls back to the platform default when nothing is stored", async () => {
    await setApiBaseUrl("");
    const baseUrl = await getApiBaseUrl();
    expect(baseUrl).toMatch(/^http:\/\//);
  });

  it("stores and trims a custom base URL, dropping trailing slashes", async () => {
    await setApiBaseUrl("http://192.168.1.20:5000/  ");
    expect(await getApiBaseUrl()).toBe("http://192.168.1.20:5000");
  });
});

describe("apiFetch", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns the parsed JSON payload on success", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message: "ok" }),
    });

    const result = await apiFetch("/api/health");
    expect(result).toEqual({ message: "ok" });
  });

  it("throws with the server's message when the response is not ok", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: "Invalid request" }),
    });

    await expect(apiFetch("/api/properties")).rejects.toThrow("Invalid request");
  });

  it("throws a network-reachability error when fetch itself rejects", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network down"));

    await expect(apiFetch("/api/properties")).rejects.toThrow(/could not reach the api/i);
  });
});
