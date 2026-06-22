import jwt from "jsonwebtoken";
import env from "../config/env.js";
import httpStatus from "../constants/httpStatus.js";
import User from "../models/User.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import parseCookies from "../utils/cookies.js";

const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }

  const cookies = parseCookies(req.headers.cookie);
  return cookies[env.authCookieName];
};

const protect = asyncHandler(async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Not authorized, token missing");
  }

  let decoded;

  try {
    decoded = jwt.verify(token, env.jwtSecret);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Not authorized, token expired");
    }

    throw new ApiError(httpStatus.UNAUTHORIZED, "Not authorized, token invalid");
  }

  req.user = await User.findById(decoded.id).select("-password");

  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Not authorized, user not found");
  }

  if (req.user.accountStatus && req.user.accountStatus !== "active") {
    throw new ApiError(httpStatus.FORBIDDEN, "Account is not active");
  }

  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized for this resource");
  }

  next();
};

const authorizeGroup = (roles) => authorize(...roles);

export { authorize, authorizeGroup, protect };
