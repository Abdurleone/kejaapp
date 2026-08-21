import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GoogleSignInButton from "../src/components/GoogleSignInButton.jsx";

const { loginWithGoogle } = vi.hoisted(() => ({
  loginWithGoogle: vi.fn(),
}));

vi.mock("../app-utils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, loginWithGoogle };
});

describe("GoogleSignInButton", () => {
  const originalGoogle = window.google;

  beforeEach(() => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-client-id");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    window.google = originalGoogle;
  });

  it("renders nothing when VITE_GOOGLE_CLIENT_ID is not set", () => {
    vi.unstubAllEnvs();
    window.google = { accounts: { id: { initialize: vi.fn(), renderButton: vi.fn() } } };

    render(<GoogleSignInButton onAuthenticated={vi.fn()} />);

    expect(window.google.accounts.id.initialize).not.toHaveBeenCalled();
  });

  it("initializes and renders the Google button once the script is available", async () => {
    window.google = { accounts: { id: { initialize: vi.fn(), renderButton: vi.fn() } } };

    render(<GoogleSignInButton onAuthenticated={vi.fn()} />);

    await waitFor(() => expect(window.google.accounts.id.initialize).toHaveBeenCalledTimes(1));
    expect(window.google.accounts.id.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: "test-client-id",
        callback: expect.any(Function),
        // Without this, Chrome's rendered-button flow falls back to the
        // legacy popup mechanism, which hangs indefinitely on
        // accounts.google.com/gsi/transform in current Chrome - confirmed
        // live against production. use_fedcm_for_prompt is a *different*
        // flag (One Tap only, now deprecated/ignored) and doesn't cover this.
        use_fedcm_for_button: true,
      }),
    );
    expect(window.google.accounts.id.renderButton).toHaveBeenCalledTimes(1);
  });

  it("waits for the GIS script's load event when it hasn't loaded yet", async () => {
    window.google = undefined;
    const script = document.createElement("script");
    script.id = "google-identity-services";
    document.head.appendChild(script);

    render(<GoogleSignInButton onAuthenticated={vi.fn()} />);

    window.google = { accounts: { id: { initialize: vi.fn(), renderButton: vi.fn() } } };
    script.dispatchEvent(new Event("load"));

    await waitFor(() => expect(window.google.accounts.id.initialize).toHaveBeenCalledTimes(1));
    document.head.removeChild(script);
  });

  it("calls loginWithGoogle then onAuthenticated when the credential callback fires", async () => {
    let capturedCallback;
    window.google = {
      accounts: {
        id: {
          initialize: vi.fn((options) => {
            capturedCallback = options.callback;
          }),
          renderButton: vi.fn(),
        },
      },
    };
    loginWithGoogle.mockResolvedValue({ user: { id: "u1", role: "tenant", roleConfirmed: false } });
    const onAuthenticated = vi.fn();

    render(<GoogleSignInButton onAuthenticated={onAuthenticated} />);
    await waitFor(() => expect(capturedCallback).toBeTypeOf("function"));

    await capturedCallback({ credential: "fake-credential" });

    expect(loginWithGoogle).toHaveBeenCalledWith("fake-credential");
    expect(onAuthenticated).toHaveBeenCalledWith({ id: "u1", role: "tenant", roleConfirmed: false });
  });

  it("calls onError instead of onAuthenticated when loginWithGoogle rejects", async () => {
    let capturedCallback;
    window.google = {
      accounts: {
        id: {
          initialize: vi.fn((options) => {
            capturedCallback = options.callback;
          }),
          renderButton: vi.fn(),
        },
      },
    };
    loginWithGoogle.mockRejectedValue(new Error("Invalid Google credential"));
    const onAuthenticated = vi.fn();
    const onError = vi.fn();

    render(<GoogleSignInButton onAuthenticated={onAuthenticated} onError={onError} />);
    await waitFor(() => expect(capturedCallback).toBeTypeOf("function"));

    await capturedCallback({ credential: "bad-credential" });

    expect(onAuthenticated).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith("Invalid Google credential");
  });
});
