import express from "express";
import {
  changePassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  updateCurrentUser,
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
  changePasswordSchema,
  loginUserSchema,
  registerUserSchema,
  updateProfileSchema,
} from "../validators/authValidators.js";

const router = express.Router();

router.post("/register", validateRequest(registerUserSchema), registerUser);
router.post("/login", validateRequest(loginUserSchema), loginUser);
router.post("/logout", logoutUser);
router.get("/me", protect, getCurrentUser);
router.put("/me", protect, validateRequest(updateProfileSchema), updateCurrentUser);
router.put("/password", protect, validateRequest(changePasswordSchema), changePassword);

export default router;
