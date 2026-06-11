import express from "express";
import { createReview } from "../controllers/reviewController.js";
import { protect } from "../middlewares/authMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import { createReviewSchema } from "../validators/reviewValidators.js";

const router = express.Router();

router.post("/", protect, validateRequest(createReviewSchema), createReview);

export default router;
