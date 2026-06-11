import express from "express";
import {
  approveAgencyVerification,
  listAgencyVerifications,
  rejectAgencyVerification,
} from "../controllers/adminAgencyController.js";
import {
  listViolations,
  updateViolationStatus,
} from "../controllers/violationController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import { rejectAgencyVerificationSchema } from "../validators/adminValidators.js";
import { updateViolationStatusSchema } from "../validators/violationValidators.js";

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/agencies/verifications", listAgencyVerifications);
router.put("/agencies/verifications/:id/approve", approveAgencyVerification);
router.put(
  "/agencies/verifications/:id/reject",
  validateRequest(rejectAgencyVerificationSchema),
  rejectAgencyVerification
);
router.get("/violations", listViolations);
router.put(
  "/violations/:id/status",
  validateRequest(updateViolationStatusSchema),
  updateViolationStatus
);

export default router;
