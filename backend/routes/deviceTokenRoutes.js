import express from "express";
import { registerDeviceToken, removeDeviceToken } from "../controllers/deviceTokenController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", protect, registerDeviceToken);
router.delete("/", protect, removeDeviceToken);

export default router;
