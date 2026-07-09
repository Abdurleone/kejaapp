import httpStatus from "../constants/httpStatus.js";
import DeviceToken from "../models/DeviceToken.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const registerDeviceToken = asyncHandler(async (req, res) => {
  if (!req.body.token) {
    throw new ApiError(httpStatus.BAD_REQUEST, "token is required");
  }

  const deviceToken = await DeviceToken.findOneAndUpdate(
    { token: req.body.token },
    { user: req.user._id, token: req.body.token, platform: req.body.platform },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(httpStatus.OK).json({
    data: deviceToken,
  });
});

const removeDeviceToken = asyncHandler(async (req, res) => {
  if (!req.body.token) {
    throw new ApiError(httpStatus.BAD_REQUEST, "token is required");
  }

  await DeviceToken.deleteOne({ user: req.user._id, token: req.body.token });

  res.status(httpStatus.OK).json({
    message: "Device token removed",
  });
});

export { registerDeviceToken, removeDeviceToken };
