import env from "./env.js";

const corsOptions = {
  origin(origin, callback) {
    if (!origin || env.corsOrigins.length === 0) {
      callback(null, true);
      return;
    }

    if (env.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

export default corsOptions;
