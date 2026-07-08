import express from "express";
import { createFeedback, listMyFeedback, listPublicFeedback } from "../controllers/feedbackController.js";
import { roleGroups } from "../constants/rbac.js";
import { authorizeGroup, protect } from "../middlewares/authMiddleware.js";
import { cacheResponse } from "../middlewares/responseCache.js";
import validateRequest from "../middlewares/validateRequest.js";
import { createFeedbackSchema } from "../validators/feedbackValidators.js";
import env from "../config/env.js";

const router = express.Router();

const cachePublicFeedbackResponses = cacheResponse({
  namespace: "feedbackPublic",
  ttlMs: env.feedbackPublicCacheTtlMs,
});

router.post("/", protect, authorizeGroup(roleGroups.publicRegistration), validateRequest(createFeedbackSchema), createFeedback);
router.get("/mine", protect, listMyFeedback);
router.get("/public", cachePublicFeedbackResponses, listPublicFeedback);

export default router;
