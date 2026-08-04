import express from "express";
import {
  getVapidPublicKey,
  registerPushSubscription,
  removePushSubscription,
} from "../controllers/pushSubscriptionController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/vapid-public-key", getVapidPublicKey);
router.post("/", protect, registerPushSubscription);
router.delete("/", protect, removePushSubscription);

export default router;
