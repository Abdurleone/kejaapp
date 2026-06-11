import express from "express";
import {
  approveAgencyVerification,
  listAgencyVerifications,
  rejectAgencyVerification,
} from "../controllers/adminAgencyController.js";
import {
  getUser,
  getUserSummary,
  listUserStatusHistory,
  listUsers,
  updateUserStatus,
} from "../controllers/adminUserController.js";
import {
  listViolations,
  updateViolationStatus,
} from "../controllers/violationController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
  rejectAgencyVerificationSchema,
  updateUserStatusSchema,
} from "../validators/adminValidators.js";
import { updateViolationStatusSchema } from "../validators/violationValidators.js";

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/users", listUsers);
router.get("/users/:id/summary", getUserSummary);
router.get("/users/:id/status-history", listUserStatusHistory);
router.put("/users/:id/status", validateRequest(updateUserStatusSchema), updateUserStatus);
router.get("/users/:id", getUser);
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
