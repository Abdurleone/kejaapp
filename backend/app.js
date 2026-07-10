import express from "express";
import path from "node:path";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import corsOptions from "./config/cors.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import env from "./config/env.js";
import { errorHandler, notFound } from "./middlewares/errorMiddleware.js";
import { createRateLimiter } from "./middlewares/rateLimiter.js";
import { accessLogStream, nairobiTimestamp } from "./utils/logger.js";
import agencyRoutes from "./routes/agencyRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import deviceTokenRoutes from "./routes/deviceTokenRoutes.js";
import docsRoutes from "./routes/docsRoutes.js";
import favoriteRoutes from "./routes/favoriteRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import inquiryRoutes from "./routes/inquiryRoutes.js";
import moverRoutes from "./routes/moverRoutes.js";
import moverRequestRoutes from "./routes/moverRequestRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import propertyRoutes from "./routes/propertyRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import savedSearchRoutes from "./routes/savedSearchRoutes.js";
import viewingRoutes from "./routes/viewingRoutes.js";

const app = express();

app.set("trust proxy", env.trustProxy);
app.use(helmet());
app.use(cors(corsOptions));
// Property image uploads are base64-encoded JSON (~4/3 size inflation over the
// raw file), so the body limit has to clear env.maxUploadBytes with room to
// spare for the surrounding JSON fields, not just match it.
const jsonBodyLimit = Math.ceil((env.maxUploadBytes * 4) / 3) + 1024;

app.use(express.json({ limit: jsonBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: jsonBodyLimit }));
app.use(
  "/uploads",
  express.static(path.resolve(env.uploadDir), {
    maxAge: "1y",
    immutable: true,
  })
);

// Morgan's built-in :date token always renders UTC (clf format hardcodes
// "+0000"); override it so access logs read in Nairobi time like the rest
// of the app's logging.
morgan.token("date", () => nairobiTimestamp());

if (env.nodeEnv !== "test") {
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
  app.use(morgan("combined", { stream: accessLogStream }));
}

app.use("/api", createRateLimiter({
  name: "api",
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
}));

app.get("/", (req, res) => {
  res.json({
    message: "KejaApp API is running...",
    environment: env.nodeEnv,
  });
});

app.use("/api/agencies", agencyRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", createRateLimiter({
  name: "auth",
  windowMs: env.rateLimitWindowMs,
  max: env.authRateLimitMax,
}), authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/device-tokens", deviceTokenRoutes);
app.use("/api/docs", docsRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/movers", moverRoutes);
app.use("/api/mover-requests", moverRequestRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/saved-searches", savedSearchRoutes);
app.use("/api/viewings", viewingRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
