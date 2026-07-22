import express from "express";
import {
  createViewingRequest,
  listMyViewingRequests,
  listReceivedViewingRequests,
  updateViewingRequestStatus,
} from "../controllers/viewingController.js";
import { roleGroups } from "../constants/rbac.js";
import { authorizeGroup, protect } from "../middlewares/authMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
  createViewingRequestSchema,
  updateViewingStatusSchema,
} from "../validators/viewingValidators.js";

const router = express.Router();

router.use(protect);

router
  .route("/")
  .get(authorizeGroup(roleGroups.tenantOnly), listMyViewingRequests)
  .post(authorizeGroup(roleGroups.tenantOnly), validateRequest(createViewingRequestSchema), createViewingRequest);

router.get("/received", authorizeGroup(roleGroups.listingManagers), listReceivedViewingRequests);

router.put("/:id/status", validateRequest(updateViewingStatusSchema), updateViewingRequestStatus);

export default router;
