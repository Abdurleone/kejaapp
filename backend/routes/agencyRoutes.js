import express from "express";
import {
  getAgencyStatus,
  submitAgencyVerification,
} from "../controllers/agencyController.js";
import { roleGroups } from "../constants/rbac.js";
import { authorizeGroup, protect } from "../middlewares/authMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import { agencyVerificationSchema } from "../validators/agencyValidators.js";

const router = express.Router();

router.use(protect, authorizeGroup(roleGroups.agencies));

router.post("/verify", validateRequest(agencyVerificationSchema), submitAgencyVerification);
router.get("/status", getAgencyStatus);

export default router;
