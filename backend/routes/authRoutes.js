import express from "express";
import {
  changePassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateCurrentUser,
  registerFcmToken, // Added our new controller
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
  changePasswordSchema,
  loginUserSchema,
  refreshTokenSchema,
  registerUserSchema,
  updateProfileSchema,
} from "../validators/authValidators.js";

const router = express.Router();

router.post("/register", validateRequest(registerUserSchema), registerUser);
router.post("/login", validateRequest(loginUserSchema), loginUser);
router.post("/refresh", validateRequest(refreshTokenSchema), refreshAccessToken);
router.post("/logout", logoutUser);

// --- MOBILE DEVICE REGISTRATION ---
// Used by React Native to register push notification tokens
router.post("/fcm-token", protect, registerFcmToken);

router.get("/me", protect, getCurrentUser);
router.put("/me", protect, validateRequest(updateProfileSchema), updateCurrentUser);
router.put("/password", protect, validateRequest(changePasswordSchema), changePassword);

export default router;
