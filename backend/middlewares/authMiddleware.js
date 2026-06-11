import jwt from "jsonwebtoken";
import env from "../config/env.js";
import httpStatus from "../constants/httpStatus.js";
import User from "../models/User.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Not authorized, token missing");
  }

  const token = authHeader.split(" ")[1];
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

  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized for this resource");
  }

  next();
};

export { authorize, protect };
