import express from "express";
import {
  createReview,
  listMyPropertyReviews,
  reportReview,
  respondToReview,
} from "../controllers/reviewController.js";
import { roleGroups } from "../constants/rbac.js";
import { authorizeGroup, protect } from "../middlewares/authMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
  createReviewSchema,
  reportReviewSchema,
  updateReviewResponseSchema,
} from "../validators/reviewValidators.js";

const router = express.Router();

router.post("/", protect, authorizeGroup(roleGroups.tenantOnly), validateRequest(createReviewSchema), createReview);
router.get("/mine", protect, authorizeGroup(roleGroups.listingManagers), listMyPropertyReviews);
router.put(
  "/:id/response",
  protect,
  authorizeGroup(roleGroups.propertyOwners),
  validateRequest(updateReviewResponseSchema),
  respondToReview
);
// Any signed-in user except the review's own author (enforced in the
// controller, not by role - a tenant, another tenant, or the property owner
// might all have a legitimate reason to flag one).
router.post("/:id/report", protect, validateRequest(reportReviewSchema), reportReview);

export default router;
