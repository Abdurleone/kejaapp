import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { createDeviceToken, deleteDeviceToken } from "../api/index.js";

let registeredToken = null;
let notificationsModule = null;

// Best-effort: registration silently no-ops on any failure (missing
// permission, simulator/emulator, no EAS project configured yet, etc.)
// rather than surfacing an error to the signed-in user. Also a practical
// necessity: since Expo SDK 53, push notifications don't work in Expo Go on
// Android at all (a development build is required there), so this always
// no-ops today unless run from a real development/production build.
//
// Crucially, merely *importing* expo-notifications throws in that
// unsupported environment (it registers an internal push-token listener as
// an import-time side effect), so the module itself must only ever be
// required lazily, from inside this guard - never at the top of this file.
const canUsePushNotifications = () => {
  // Device.isDevice is always true on web (per Expo's docs), so it alone
  // doesn't exclude the web preview target - push isn't supported there.
  if (Platform.OS === "web" || !Device.isDevice) {
    return false;
  }

  if (Platform.OS === "android" && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return false;
  }

  return true;
};

const getNotifications = () => {
  if (!notificationsModule) {
    notificationsModule = require("expo-notifications");
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }

  return notificationsModule;
};

export const registerForPushNotifications = async () => {
  try {
    if (!canUsePushNotifications()) {
      return;
    }

    const Notifications = getNotifications();
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return;
    }

    // Required by getExpoPushTokenAsync - normally set automatically by an
    // EAS build, but this repo hasn't run `eas build:configure` yet (see
    // mobile/README.md), so it's absent in local/Expo Go development.
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
      return;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    registeredToken = token;

    await createDeviceToken({ token, platform: Platform.OS });
  } catch (error) {
    console.error("Could not register for push notifications", error);
  }
};

export const unregisterForPushNotifications = async () => {
  if (!registeredToken) {
    return;
  }

  const token = registeredToken;
  registeredToken = null;

  try {
    await deleteDeviceToken(token);
  } catch (error) {
    console.error("Could not unregister push notification token", error);
  }
};
