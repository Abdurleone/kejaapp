import express from "express";
import {
  createViewingRequest,
  listMyViewingRequests,
  updateViewingRequestStatus,
} from "../controllers/viewingController.js";
import { protect } from "../middlewares/authMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
  createViewingRequestSchema,
  updateViewingStatusSchema,
} from "../validators/viewingValidators.js";

const router = express.Router();

router.use(protect);

router
  .route("/")
  .get(listMyViewingRequests)
  .post(validateRequest(createViewingRequestSchema), createViewingRequest);

router.put("/:id/status", validateRequest(updateViewingStatusSchema), updateViewingRequestStatus);

export default router;
