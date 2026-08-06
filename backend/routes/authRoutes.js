import express from "express";
import {
  changePassword,
  confirmRole,
  deleteCurrentUser,
  getCurrentUser,
  googleAuth,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateCurrentUser,
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
  changePasswordSchema,
  confirmRoleSchema,
  googleAuthSchema,
  loginUserSchema,
  refreshTokenSchema,
  registerUserSchema,
  updateProfileSchema,
} from "../validators/authValidators.js";

const router = express.Router();

router.post("/register", validateRequest(registerUserSchema), registerUser);
router.post("/login", validateRequest(loginUserSchema), loginUser);
router.post("/google", validateRequest(googleAuthSchema), googleAuth);
router.post("/refresh", validateRequest(refreshTokenSchema), refreshAccessToken);
router.post("/logout", logoutUser);

router.get("/me", protect, getCurrentUser);
router.put("/me", protect, validateRequest(updateProfileSchema), updateCurrentUser);
router.put("/role", protect, validateRequest(confirmRoleSchema), confirmRole);
router.delete("/me", protect, deleteCurrentUser);
router.put("/password", protect, validateRequest(changePasswordSchema), changePassword);

export default router;
