import express from "express";
import fs from "node:fs";
import path from "node:path";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import Sentry from "./instrument.js";
import corsOptions from "./config/cors.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import env from "./config/env.js";
import csrfProtection from "./middlewares/csrfProtection.js";
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
import pushSubscriptionRoutes from "./routes/pushSubscriptionRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import savedSearchRoutes from "./routes/savedSearchRoutes.js";
import supportPaymentRoutes from "./routes/supportPaymentRoutes.js";
import viewingRoutes from "./routes/viewingRoutes.js";

const app = express();

// Populated only by the Render-specific consolidated build
// (backend/Dockerfile.render copies the frontend's built dist/ here as
// ./public) - local dev, docker-compose, and Kubernetes never have this
// directory, so every route/config below that checks it no-ops back to
// today's behavior for them.
const publicDir = path.resolve("public");
const hasBundledFrontend = fs.existsSync(publicDir);

app.set("trust proxy", env.trustProxy);
app.use(
  helmet(
    hasBundledFrontend
      ? {
          // Only when this backend is actually serving the frontend's HTML
          // (see hasBundledFrontend above) - helmet's default CSP would
          // otherwise block frontend/index.html's static Google Identity
          // Services <script> tag outright, something the frontend's
          // previous life as a separate, header-less static site never hit.
          contentSecurityPolicy: {
            directives: {
              ...helmet.contentSecurityPolicy.getDefaultDirectives(),
              "script-src": ["'self'", "https://accounts.google.com"],
              "connect-src": ["'self'", "https://accounts.google.com"],
              "frame-src": ["https://accounts.google.com"],
              // Property photos are never same-origin: resolveAssetUrl's
              // fallback/seed images point at Unsplash, and real uploads
              // resolve to whatever S3_PUBLIC_BASE_URL (Backblaze B2) is
              // configured - an arbitrary host, not a fixed one. Widened the
              // same way Helmet's own defaults already do for font-src/
              // style-src in this exact directive block, rather than
              // enumerating specific image hosts.
              "img-src": ["'self'", "data:", "https:"],
            },
          },
        }
      : undefined
  )
);
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

if (hasBundledFrontend) {
  app.use(express.static(publicDir));
}

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
app.use("/api", csrfProtection);

app.get("/", (req, res) => {
  if (hasBundledFrontend) {
    return res.sendFile(path.join(publicDir, "index.html"));
  }

  res.json({
    message: "JakezApp API is running...",
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
app.use("/api/push-subscriptions", pushSubscriptionRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/saved-searches", savedSearchRoutes);
app.use("/api/support-payments", supportPaymentRoutes);
app.use("/api/viewings", viewingRoutes);

// SPA client-side routing fallback (e.g. a direct hit on /discover) - only
// when this build actually bundled the frontend; a plain req.path check
// rather than a wildcard route path, so it doesn't depend on whichever
// path-to-regexp syntax the installed Express major version expects.
app.use((req, res, next) => {
  if (!hasBundledFrontend || req.method !== "GET" || req.path.startsWith("/api")) {
    return next();
  }

  res.sendFile(path.join(publicDir, "index.html"));
});

app.use(notFound);

if (env.sentryDsn) {
  Sentry.setupExpressErrorHandler(app);
}

app.use(errorHandler);

export default app;
