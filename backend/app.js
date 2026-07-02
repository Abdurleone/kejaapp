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
import agencyRoutes from "./routes/agencyRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import docsRoutes from "./routes/docsRoutes.js";
import favoriteRoutes from "./routes/favoriteRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import inquiryRoutes from "./routes/inquiryRoutes.js";
import moverRoutes from "./routes/moverRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import propertyRoutes from "./routes/propertyRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import viewingRoutes from "./routes/viewingRoutes.js";

const app = express();

app.set("trust proxy", env.trustProxy);
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  "/uploads",
  express.static(path.resolve(env.uploadDir), {
    maxAge: "1y",
    immutable: true,
  })
);

if (env.nodeEnv !== "test") {
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
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
app.use("/api/docs", docsRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/movers", moverRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/viewings", viewingRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
