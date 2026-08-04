import env from "../config/env.js";
import httpStatus from "../constants/httpStatus.js";
import PushSubscription from "../models/PushSubscription.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";

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
