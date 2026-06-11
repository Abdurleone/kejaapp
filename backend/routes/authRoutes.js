import express from "express";
import { getCurrentUser, loginUser, registerUser } from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import { loginUserSchema, registerUserSchema } from "../validators/authValidators.js";

const router = express.Router();

router.post("/register", validateRequest(registerUserSchema), registerUser);
router.post("/login", validateRequest(loginUserSchema), loginUser);
router.get("/me", protect, getCurrentUser);

export default router;
