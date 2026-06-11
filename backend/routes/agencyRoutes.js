import express from "express";
import {
  getAgencyStatus,
  submitAgencyVerification,
} from "../controllers/agencyController.js";
import { protect } from "../middlewares/authMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import { agencyVerificationSchema } from "../validators/agencyValidators.js";

const router = express.Router();

router.post("/verify", protect, validateRequest(agencyVerificationSchema), submitAgencyVerification);
router.get("/status", protect, getAgencyStatus);

export default router;
