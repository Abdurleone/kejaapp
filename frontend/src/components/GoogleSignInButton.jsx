import { useEffect, useRef } from "react";
import { loginWithGoogle } from "../../app-utils.js";

// Renders nothing (an empty container) until VITE_GOOGLE_CLIENT_ID is set -
// same "empty = disabled" convention the backend already follows for
// GOOGLE_CLIENT_ID, rather than showing a broken/unusable button.
export default function GoogleSignInButton({ onAuthenticated, onError }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    const clientId = import.meta.env?.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      return undefined;
    }

    let cancelled = false;

    const handleCredential = async ({ credential }) => {
      try {
        const response = await loginWithGoogle(credential);
        onAuthenticated(response.user);
      } catch (err) {
        onError?.(err.message || "Google sign-in failed");
      }
    };

    const renderButton = () => {
      if (cancelled || !window.google?.accounts?.id || !buttonRef.current) {
        return;
      }

      window.google.accounts.id.initialize({ client_id: clientId, callback: handleCredential });
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        width: 280,
      });
    };

    if (window.google?.accounts?.id) {
      renderButton();
      return undefined;
    }

    // The GIS script (loaded in index.html) may not have finished loading
    // yet by the time this mounts on a slow connection - wait for it rather
    // than silently never showing a button.
    const script = document.getElementById("google-identity-services");
    script?.addEventListener("load", renderButton);

    return () => {
      cancelled = true;
      script?.removeEventListener("load", renderButton);
    };
  }, [onAuthenticated, onError]);

  return <div ref={buttonRef} className="google-signin-button" />;
}
