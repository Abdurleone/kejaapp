import express from "express";
import { loginUser, registerUser } from "../controllers/authController.js";
import validateRequest from "../middlewares/validateRequest.js";
import { loginUserSchema, registerUserSchema } from "../validators/authValidators.js";

const router = express.Router();

router.post("/register", validateRequest(registerUserSchema), registerUser);
router.post("/login", validateRequest(loginUserSchema), loginUser);

export default router;
