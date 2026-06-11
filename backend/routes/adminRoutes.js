import express from "express";
import {
  approveAgencyVerification,
  listAgencyVerifications,
  rejectAgencyVerification,
} from "../controllers/adminAgencyController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import { rejectAgencyVerificationSchema } from "../validators/adminValidators.js";

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/agencies/verifications", listAgencyVerifications);
router.put("/agencies/verifications/:id/approve", approveAgencyVerification);
router.put(
  "/agencies/verifications/:id/reject",
  validateRequest(rejectAgencyVerificationSchema),
  rejectAgencyVerification
);

export default router;
