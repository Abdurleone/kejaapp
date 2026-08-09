import env from "../config/env.js";
import httpStatus from "../constants/httpStatus.js";
import PushSubscription from "../models/PushSubscription.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";

// Browser push services actually deliver notifications by POSTing to
// whatever endpoint a subscription registers - without an allowlist here,
// registerPushSubscription would let any authenticated user point the
// server's outbound webpush.sendNotification() call at an arbitrary host
// (SSRF), since a notification is trivially self-triggerable.
const allowedPushEndpointHosts = [
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "notify.windows.com",
  "web.push.apple.com",
];

const isAllowedPushEndpoint = (endpoint) => {
  let url;

  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }

  return (
    url.protocol === "https:" &&
    allowedPushEndpointHosts.some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
    )
  );
};

const getVapidPublicKey = asyncHandler(async (req, res) => {
  res.status(httpStatus.OK).json({
    data: { publicKey: env.vapidPublicKey },
  });
});

const registerPushSubscription = asyncHandler(async (req, res) => {
  const { endpoint, keys } = req.body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new ApiError(httpStatus.BAD_REQUEST, "endpoint and keys.p256dh/keys.auth are required");
  }

  if (!isAllowedPushEndpoint(endpoint)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "endpoint must be a supported push service URL");
  }

  const subscription = await PushSubscription.findOneAndUpdate(
    { endpoint },
    { user: req.user._id, endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(httpStatus.OK).json({
    data: subscription,
  });
});

const removePushSubscription = asyncHandler(async (req, res) => {
  if (!req.body.endpoint) {
    throw new ApiError(httpStatus.BAD_REQUEST, "endpoint is required");
  }

  await PushSubscription.deleteOne({ user: req.user._id, endpoint: req.body.endpoint });

  res.status(httpStatus.OK).json({
    message: "Push subscription removed",
  });
});

export { getVapidPublicKey, registerPushSubscription, removePushSubscription };
