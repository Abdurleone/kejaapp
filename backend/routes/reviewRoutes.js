import express from "express";
import {
  createReview,
  listMyPropertyReviews,
  respondToReview,
} from "../controllers/reviewController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
  createReviewSchema,
  updateReviewResponseSchema,
} from "../validators/reviewValidators.js";

const router = express.Router();

router.post("/", protect, validateRequest(createReviewSchema), createReview);
router.get("/mine", protect, authorize("landlord", "agency", "admin"), listMyPropertyReviews);
router.put(
  "/:id/response",
  protect,
  authorize("landlord", "agency"),
  validateRequest(updateReviewResponseSchema),
  respondToReview
);

export default router;
