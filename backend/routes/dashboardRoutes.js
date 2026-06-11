import express from "express";
import { getDashboardSummary } from "../controllers/dashboardController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/summary", protect, getDashboardSummary);

export default router;
