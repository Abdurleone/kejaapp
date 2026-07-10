import express from "express";
import {
  createMoverRequest,
  listMyMoverRequests,
  listReceivedMoverRequests,
  updateMoverRequestStatus,
} from "../controllers/moverRequestController.js";
import { roleGroups } from "../constants/rbac.js";
import { authorizeGroup, protect } from "../middlewares/authMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
  createMoverRequestSchema,
  updateMoverRequestStatusSchema,
} from "../validators/moverRequestValidators.js";

const router = express.Router();

router.use(protect);

router
  .route("/")
  .get(authorizeGroup(roleGroups.tenantOnly), listMyMoverRequests)
  .post(authorizeGroup(roleGroups.tenantOnly), validateRequest(createMoverRequestSchema), createMoverRequest);

router.get("/received", authorizeGroup(roleGroups.movers), listReceivedMoverRequests);

router.put("/:id/status", validateRequest(updateMoverRequestStatusSchema), updateMoverRequestStatus);

export default router;
