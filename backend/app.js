import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import corsOptions from "./config/cors.js";
import env from "./config/env.js";
import { errorHandler, notFound } from "./middlewares/errorMiddleware.js";
import agencyRoutes from "./routes/agencyRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import moverRoutes from "./routes/moverRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import propertyRoutes from "./routes/propertyRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";

const app = express();

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (env.nodeEnv !== "test") {
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
}

app.get("/", (req, res) => {
  res.json({
    message: "KejaApp API is running...",
    environment: env.nodeEnv,
  });
});

app.use("/api/agencies", agencyRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/movers", moverRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/reviews", reviewRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
