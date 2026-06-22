import express from "express";
import {
  createReview,
  listMyPropertyReviews,
  respondToReview,
} from "../controllers/reviewController.js";
import { roleGroups } from "../constants/rbac.js";
import { authorizeGroup, protect } from "../middlewares/authMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
  createReviewSchema,
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

export default router;
