import express from "express";
import {
  affiliateMover,
  getMover,
  getMoverProfile,
  listMovers,
  submitMoverProfile,
  unaffiliateMover,
} from "../controllers/moverController.js";
import { roleGroups } from "../constants/rbac.js";
import { authorizeGroup, protect } from "../middlewares/authMiddleware.js";
import env from "../config/env.js";
import { cacheResponse } from "../middlewares/responseCache.js";
import validateRequest from "../middlewares/validateRequest.js";
import { moverProfileSchema } from "../validators/moverValidators.js";

const router = express.Router();

const cacheMoverResponses = cacheResponse({ namespace: "movers", ttlMs: env.moversCacheTtlMs });

router.get("/", cacheMoverResponses, listMovers);

// Not cached — this response is per-authenticated-user, unlike the public
// listing/detail routes above which are identical for every caller.
router
  .route("/profile")
  .get(protect, authorizeGroup(roleGroups.movers), getMoverProfile)
  .post(protect, authorizeGroup(roleGroups.movers), validateRequest(moverProfileSchema), submitMoverProfile);

router.put("/:id/affiliate", protect, authorizeGroup(roleGroups.listingManagers), affiliateMover);
router.delete("/:id/affiliate", protect, authorizeGroup(roleGroups.listingManagers), unaffiliateMover);

router.get("/:id", cacheMoverResponses, getMover);

export default router;
