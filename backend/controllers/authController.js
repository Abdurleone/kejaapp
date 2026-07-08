import env from "../config/env.js";
import httpStatus from "../constants/httpStatus.js";
import AgencyVerification from "../models/AgencyVerification.js";
import AuthSession from "../models/AuthSession.js";
import Favorite from "../models/Favorite.js";
import Inquiry from "../models/Inquiry.js";
import Notification from "../models/Notification.js";
import Property from "../models/Property.js";
import PropertyImageFingerprint from "../models/PropertyImageFingerprint.js";
import Review from "../models/Review.js";
import User from "../models/User.js";
import UserStatusLog from "../models/UserStatusLog.js";
import UserViolation from "../models/UserViolation.js";
import ViewingRequest from "../models/ViewingRequest.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import parseCookies from "../utils/cookies.js";
import generateToken from "../utils/generateToken.js";
import { generateOpaqueToken, hashToken } from "../utils/tokens.js";
import { suggestUsernames } from "../utils/usernameGenerator.js";

// --- EXISTING UTILITIES ---
const getCookieOptions = () => ({
  httpOnly: true,
  maxAge: env.authCookieMaxAge,
  sameSite: env.authCookieSecure ? "none" : "lax",
  secure: env.authCookieSecure,
});

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  maxAge: env.refreshTokenMaxAge,
  sameSite: env.authCookieSecure ? "none" : "lax",
  secure: env.authCookieSecure,
});

const createRefreshSession = async (req, user) => {
  const refreshToken = generateOpaqueToken();

  await AuthSession.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
    expiresAt: new Date(Date.now() + env.refreshTokenMaxAge),
  });

  return refreshToken;
};

const getRefreshTokenFromRequest = (req) => {
  // req.body is only populated when the request has a JSON body/Content-Type
  // (e.g. login/refresh calls with a payload); logout is called with neither,
  // so express.json() leaves req.body undefined here.
  if (req.body?.refreshToken) {
    return req.body.refreshToken;
  }

  const cookies = parseCookies(req.headers.cookie);
  return cookies[env.refreshCookieName];
};

const sendAuthResponse = async (req, res, statusCode, user) => {
  const userId = user._id.toString();
  const token = generateToken({ id: userId, role: user.role });
  const refreshToken = await createRefreshSession(req, user);

  res.cookie(env.authCookieName, token, getCookieOptions());
  res.cookie(env.refreshCookieName, refreshToken, getRefreshCookieOptions());

  res.status(statusCode).json({
    user: {
      id: userId,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      phone: user.phone,
    },
    token,
    refreshToken,
    tokenType: "Bearer",
    expiresIn: env.jwtExpiresIn,
  });
};

// --- NEW FCM TOKEN REGISTRATION ---
/**
 * @desc    Register or update an FCM token for push notifications (React Native)
 * @route   POST /api/auth/fcm-token
 * @access  Private
 */
const registerFcmToken = asyncHandler(async (req, res) => {
  const { token, platform } = req.body;

  if (!token) {
    throw new ApiError(httpStatus.BAD_REQUEST, "FCM Token is required");
  }

  const devicePlatform = platform || "android";

  // Atomically add token if it doesn't exist, otherwise update lastSeen
  const user = await User.findOneAndUpdate(
    { 
      _id: req.user._id,
      "fcmTokens.token": { $ne: token } 
    },
    {
      $addToSet: { 
        fcmTokens: { 
          token, 
          platform: devicePlatform, 
          lastSeen: new Date() 
        } 
      }
    },
    { new: true }
  );

  if (!user) {
    await User.updateOne(
      { _id: req.user._id, "fcmTokens.token": token },
      { $set: { "fcmTokens.$.lastSeen": new Date() } }
    );
  }

  res.status(httpStatus.OK).json({
    message: "Device token registered successfully",
  });
});

// --- EXISTING AUTH FLOWS ---

const registerUser = asyncHandler(async (req, res) => {
  const { email, name, password, phone, role } = req.body;
  const normalizedEmail = email.toLowerCase();
  const normalizedUsername = req.body.username.trim().toLowerCase();

  const [existingEmail, existingUsername] = await Promise.all([
    User.findOne({ email: normalizedEmail }),
    User.findOne({ username: normalizedUsername }),
  ]);

  if (existingEmail) {
    throw new ApiError(httpStatus.CONFLICT, "A user with this email already exists");
  }

  if (existingUsername) {
    const suggestions = await suggestUsernames(User, normalizedUsername);
    throw new ApiError(httpStatus.CONFLICT, "Username is already taken", { suggestions });
  }

  let user;

  try {
    user = await User.create({
      email: normalizedEmail,
      name,
      username: normalizedUsername,
      password,
      phone,
      role,
    });
  } catch (err) {
    // Rare race: another registration claimed this exact username between our
    // check and this write. Tell the user, with fresh suggestions, instead of
    // silently swapping in a username they never chose.
    if (err.code === 11000 && err.keyPattern?.username) {
      const suggestions = await suggestUsernames(User, normalizedUsername);
      throw new ApiError(httpStatus.CONFLICT, "Username is already taken", { suggestions });
    }
    throw err;
  }

  await sendAuthResponse(req, res, httpStatus.CREATED, user);
});

const loginUser = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const user = await User.findOne({
    $or: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }],
  }).select("+password");

  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid credentials");
  }

  await sendAuthResponse(req, res, httpStatus.OK, user);
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);

  if (!refreshToken) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Refresh token missing");
  }

  const session = await AuthSession.findOne({
    tokenHash: hashToken(refreshToken),
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).populate("user");

  if (!session || !session.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Refresh token invalid");
  }

  if (session.user.accountStatus && session.user.accountStatus !== "active") {
    throw new ApiError(httpStatus.FORBIDDEN, "Account is not active");
  }

  session.revokedAt = new Date();
  session.lastUsedAt = new Date();
  await session.save();

  await sendAuthResponse(req, res, httpStatus.OK, session.user);
});

const getCurrentUser = asyncHandler(async (req, res) => {
  res.status(httpStatus.OK).json({
    user: {
      id: req.user._id.toString(),
      name: req.user.name,
      email: req.user.email,
      username: req.user.username,
      role: req.user.role,
      phone: req.user.phone,
    },
  });
});

const updateCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (req.body.name !== undefined) {
    user.name = req.body.name;
  }

  if (req.body.phone !== undefined) {
    user.phone = req.body.phone;
  }

  await user.save();

  res.status(httpStatus.OK).json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      phone: user.phone,
    },
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (!(await user.matchPassword(req.body.currentPassword))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Current password is incorrect");
  }

  user.password = req.body.newPassword;
  await user.save();

  res.status(httpStatus.OK).json({
    message: "Password updated",
  });
});

const deleteCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const ownedProperties = await Property.find({ owner: userId }).select("_id");
  const ownedPropertyIds = ownedProperties.map((property) => property._id);

  await Promise.all([
    AuthSession.deleteMany({ user: userId }),
    Favorite.deleteMany({
      $or: [
        { user: userId },
        { property: { $in: ownedPropertyIds } },
      ],
    }),
    Inquiry.deleteMany({
      $or: [
        { sender: userId },
        { owner: userId },
        { property: { $in: ownedPropertyIds } },
        { respondedBy: userId },
      ],
    }),
    ViewingRequest.deleteMany({
      $or: [
        { requester: userId },
        { owner: userId },
        { property: { $in: ownedPropertyIds } },
        { reviewedBy: userId },
      ],
    }),
    Review.deleteMany({
      $or: [
        { user: userId },
        { property: { $in: ownedPropertyIds } },
        { "ownerResponse.respondedBy": userId },
      ],
    }),
    Notification.deleteMany({ user: userId }),
    AgencyVerification.deleteMany({
      $or: [
        { user: userId },
        { reviewedBy: userId },
      ],
    }),
    PropertyImageFingerprint.deleteMany({
      $or: [
        { property: { $in: ownedPropertyIds } },
        { uploadedBy: userId },
        { matchedUploadedBy: userId },
      ],
    }),
    UserViolation.deleteMany({ user: userId }),
    UserStatusLog.deleteMany({
      $or: [
        { user: userId },
        { changedBy: userId },
      ],
    }),
    Property.deleteMany({ owner: userId }),
  ]);

  await user.deleteOne();

  res.clearCookie(env.authCookieName, {
    httpOnly: true,
    sameSite: env.authCookieSecure ? "none" : "lax",
    secure: env.authCookieSecure,
  });
  res.clearCookie(env.refreshCookieName, {
    httpOnly: true,
    sameSite: env.authCookieSecure ? "none" : "lax",
    secure: env.authCookieSecure,
  });

  res.status(httpStatus.OK).json({
    message: "Account and associated data deleted",
  });
});

const logoutUser = asyncHandler(async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);

  if (refreshToken) {
    await AuthSession.findOneAndUpdate(
      {
        tokenHash: hashToken(refreshToken),
        revokedAt: null,
      },
      {
        revokedAt: new Date(),
      }
    );
  }

  res.clearCookie(env.authCookieName, {
    httpOnly: true,
    sameSite: env.authCookieSecure ? "none" : "lax",
    secure: env.authCookieSecure,
  });
  res.clearCookie(env.refreshCookieName, {
    httpOnly: true,
    sameSite: env.authCookieSecure ? "none" : "lax",
    secure: env.authCookieSecure,
  });

  res.status(httpStatus.OK).json({
    message: "Logged out",
  });
});

export {
  changePassword,
  deleteCurrentUser,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateCurrentUser,
  registerFcmToken, // Exported for use in authRoutes.js
};
