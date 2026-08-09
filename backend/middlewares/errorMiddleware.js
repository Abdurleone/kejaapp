import env from "../config/env.js";
import httpStatus from "../constants/httpStatus.js";
import { logError } from "../utils/logger.js";

const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  res.status(httpStatus.NOT_FOUND);
  next(error);
};

// Express detects error-handling middleware by arity (4 args), so `_next` must stay
// even though it's unused — dropping it would stop Express from routing errors here.
const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || (res.statusCode === 200 ? httpStatus.INTERNAL_SERVER_ERROR : res.statusCode);
  let message = err.message;
  // Whether `message` is already a deliberately safe, user-facing string -
  // either a statusCode was explicitly set by application code (an ApiError
  // thrown on purpose) or one of the branches below just classified it.
  // Anything else is a raw/unexpected exception (a library internal, a
  // programming bug) and must not be echoed verbatim to the client below.
  let messageIsSafe = Boolean(err.statusCode);

  if (err.name === "CastError") {
    statusCode = httpStatus.BAD_REQUEST;
    message = "Invalid resource id";
    messageIsSafe = true;
  }

  if (err.name === "ValidationError") {
    statusCode = httpStatus.BAD_REQUEST;
    message = Object.values(err.errors)
      .map((error) => error.message)
      .join(", ");
    messageIsSafe = true;
  }

  if (err.code === 11000) {
    statusCode = httpStatus.CONFLICT;
    message = "Duplicate resource";
    messageIsSafe = true;
  }

  if (
    err.name === "MongoNetworkError" ||
    err.name === "MongoServerSelectionError" ||
    err.errorLabelSet?.has("RetryableError")
  ) {
    statusCode = httpStatus.SERVICE_UNAVAILABLE;
    message = "Database temporarily unavailable. Please retry the request.";
    messageIsSafe = true;
  }

  // Previously unhandled request errors left no trace anywhere once
  // responded to; log server errors (not routine 4xx client mistakes) so
  // they show up in the app log.
  if (statusCode >= 500 && env.nodeEnv !== "test") {
    logError(`${req.method} ${req.originalUrl} -> ${statusCode}: ${err.stack || err.message}`);
  }

  if (statusCode >= 500 && !messageIsSafe && env.nodeEnv === "production") {
    message = "Internal server error";
  }

  res.status(statusCode).json({
    message,
    ...(err.details || {}),
    stack: env.nodeEnv === "production" ? undefined : err.stack,
  });
};

export { errorHandler, notFound };
