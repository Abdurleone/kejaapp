import express from "express";
import {
  listNotifications,
  markNotificationRead,
} from "../controllers/notificationController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", protect, listNotifications);
router.put("/:id/read", protect, markNotificationRead);

export default router;
