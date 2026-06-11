import env from "./env.js";

export const isAllowedCorsOrigin = (origin) => {
  if (!origin || env.corsOrigins.length === 0) {
    return true;
  }

  if (env.corsOrigins.includes(origin)) {
    return true;
  }

  if (env.nodeEnv !== "production" && /^http:\/\/(localhost|127\.0\.0\.1):51\d{2}$/.test(origin)) {
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
