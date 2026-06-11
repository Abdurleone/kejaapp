import env from "../config/env.js";
import httpStatus from "../constants/httpStatus.js";
import AuthSession from "../models/AuthSession.js";
import User from "../models/User.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import parseCookies from "../utils/cookies.js";
import generateToken from "../utils/generateToken.js";
import { generateOpaqueToken, hashToken } from "../utils/tokens.js";

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
  if (req.body.refreshToken) {
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
      role: user.role,
      phone: user.phone,
    },
    token,
    refreshToken,
    tokenType: "Bearer",
    expiresIn: env.jwtExpiresIn,
  });
};

const registerUser = asyncHandler(async (req, res) => {
  const { email, name, password, phone, role } = req.body;
  const normalizedEmail = email.toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new ApiError(httpStatus.CONFLICT, "A user with this email already exists");
  }

  const user = await User.create({
    email: normalizedEmail,
    name,
    password,
    phone,
    role,
  });

  await sendAuthResponse(req, res, httpStatus.CREATED, user);
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid email or password");
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
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateCurrentUser,
};
