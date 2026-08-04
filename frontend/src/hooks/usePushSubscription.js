import { useCallback, useEffect, useState } from "react";
import {
  fetchVapidPublicKey,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from "../../app-utils.js";

// pushManager.subscribe needs the VAPID public key as a Uint8Array, not the
// base64url string the backend hands back.
const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

// UI state confined to one page (the Account page's push-notifications
// panel) - a hook rather than a context, unlike genuinely app-wide state
// such as AuthContext.
export function usePushSubscription() {
  const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supported) {
      return;
    }

    let active = true;

    (async () => {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const existingSubscription = await registration.pushManager.getSubscription();
      if (active) setSubscribed(Boolean(existingSubscription));
    })().catch(() => {
      // Fail-soft: a signed-in visitor whose browser can't register the
      // service worker just sees the "Enable" toggle stay off, not an error.
    });

    return () => {
      active = false;
    };
  }, [supported]);

  const subscribe = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        throw new Error("Browser notification permission was not granted.");
      }

      const publicKey = await fetchVapidPublicKey();

      if (!publicKey) {
        throw new Error("Web push isn't configured on the server yet.");
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await subscribeToPushNotifications(pushSubscription.toJSON());
      setSubscribed(true);
    } catch (err) {
      setError(err.message || "Could not enable browser notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const pushSubscription = await registration.pushManager.getSubscription();

      if (pushSubscription) {
        await unsubscribeFromPushNotifications(pushSubscription.endpoint);
        await pushSubscription.unsubscribe();
      }

      setSubscribed(false);
    } catch (err) {
      setError(err.message || "Could not disable browser notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  return { supported, subscribed, subscribe, unsubscribe, loading, error };
}
