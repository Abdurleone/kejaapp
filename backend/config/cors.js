import env from "./env.js";

export const isAllowedCorsOrigin = (origin, { nodeEnv = env.nodeEnv, corsOrigins = env.corsOrigins } = {}) => {
  if (!origin) {
    return true;
  }

  // An unset CORS_ORIGIN must fail closed in production - wildcarding every
  // origin while also sending credentials (see corsOptions below) would be
  // an unrestricted, credentialed CORS policy. Dev/test stay permissive so
  // a missing .env value doesn't block local work.
  if (corsOrigins.length === 0) {
    return nodeEnv !== "production";
  }

  if (corsOrigins.includes(origin)) {
    return true;
  }

  if (nodeEnv !== "production" && /^http:\/\/(localhost|127\.0\.0\.1):51\d{2}$/.test(origin)) {
    return true;
  }

  return false;
};

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedCorsOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

export default corsOptions;
