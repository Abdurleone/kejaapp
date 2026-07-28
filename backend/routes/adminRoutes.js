import express from "express";
import {
  approveAgencyVerification,
  listAgencyVerifications,
  rejectAgencyVerification,
} from "../controllers/adminAgencyController.js";
import {
  approveMoverVerification,
  listMoverVerifications,
  rejectMoverVerification,
} from "../controllers/adminMoverController.js";
import {
  deleteUser,
  getUser,
  getUserSummary,
  listUserStatusHistory,
  listUsers,
  updateUserStatus,
} from "../controllers/adminUserController.js";
import {
  listMyPropertyReviews,
} from "../controllers/reviewController.js";
import {
  listFeedbackForAdmin,
  respondToFeedback,
} from "../controllers/feedbackController.js";
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
import { rejectMoverVerificationSchema } from "../validators/moverValidators.js";
import { updateViolationStatusSchema } from "../validators/violationValidators.js";
import { respondToFeedbackSchema } from "../validators/feedbackValidators.js";

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/users", listUsers);
router.get("/users/:id/summary", getUserSummary);
router.get("/users/:id/status-history", listUserStatusHistory);
router.put("/users/:id/status", validateRequest(updateUserStatusSchema), updateUserStatus);
router.delete("/users/:id", deleteUser);
router.get("/users/:id", getUser);
router.get("/reviews", listMyPropertyReviews);
router.get("/agencies/verifications", listAgencyVerifications);
router.put("/agencies/verifications/:id/approve", approveAgencyVerification);
router.put(
  "/agencies/verifications/:id/reject",
  validateRequest(rejectAgencyVerificationSchema),
  rejectAgencyVerification
);
router.get("/movers/verifications", listMoverVerifications);
router.put("/movers/verifications/:id/approve", approveMoverVerification);
router.put(
  "/movers/verifications/:id/reject",
  validateRequest(rejectMoverVerificationSchema),
  rejectMoverVerification
);
router.get("/violations", listViolations);
router.put(
  "/violations/:id/status",
  validateRequest(updateViolationStatusSchema),
  updateViolationStatus
);
router.get("/feedback", listFeedbackForAdmin);
router.put("/feedback/:id/respond", validateRequest(respondToFeedbackSchema), respondToFeedback);

export default router;
