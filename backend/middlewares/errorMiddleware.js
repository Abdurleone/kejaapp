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

  if (err.name === "CastError") {
    statusCode = httpStatus.BAD_REQUEST;
    message = "Invalid resource id";
  }

  if (err.name === "ValidationError") {
    statusCode = httpStatus.BAD_REQUEST;
    message = Object.values(err.errors)
      .map((error) => error.message)
      .join(", ");
  }

  if (err.code === 11000) {
    statusCode = httpStatus.CONFLICT;
    message = "Duplicate resource";
  }

  if (
    err.name === "MongoNetworkError" ||
    err.name === "MongoServerSelectionError" ||
    err.errorLabelSet?.has("RetryableError")
  ) {
    statusCode = httpStatus.SERVICE_UNAVAILABLE;
    message = "Database temporarily unavailable. Please retry the request.";
  }

  // Previously unhandled request errors left no trace anywhere once
  // responded to; log server errors (not routine 4xx client mistakes) so
  // they show up in the app log.
  if (statusCode >= 500 && env.nodeEnv !== "test") {
    logError(`${req.method} ${req.originalUrl} -> ${statusCode}: ${err.stack || err.message}`);
  }

  res.status(statusCode).json({
    message,
    stack: env.nodeEnv === "production" ? undefined : err.stack,
  });
};

export { errorHandler, notFound };
