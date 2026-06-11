import env from "../config/env.js";
import httpStatus from "../constants/httpStatus.js";
import User from "../models/User.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import generateToken from "../utils/generateToken.js";

const getCookieOptions = () => ({
  httpOnly: true,
  maxAge: env.authCookieMaxAge,
  sameSite: env.authCookieSecure ? "none" : "lax",
  secure: env.authCookieSecure,
});

const sendAuthResponse = (res, statusCode, user) => {
  const userId = user._id.toString();
  const token = generateToken({ id: userId, role: user.role });

  res.cookie(env.authCookieName, token, getCookieOptions());

  res.status(statusCode).json({
    user: {
      id: userId,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
    },
    token,
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

  sendAuthResponse(res, httpStatus.CREATED, user);
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  sendAuthResponse(res, httpStatus.OK, user);
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
  res.clearCookie(env.authCookieName, {
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
  registerUser,
  updateCurrentUser,
};
