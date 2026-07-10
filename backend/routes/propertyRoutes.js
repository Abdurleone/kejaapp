import express from "express";
import {
  addPropertyImage,
  calculatePropertyCost,
  createProperty,
  deleteProperty,
  getProperty,
  listMyProperties,
  listProperties,
  listPropertyMovers,
  removePropertyImage,
  uploadPropertyImage,
  updateProperty,
} from "../controllers/propertyController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";
import { roleGroups } from "../constants/rbac.js";
import env from "../config/env.js";
import { cacheResponse } from "../middlewares/responseCache.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
  costCalculationSchema,
  createPropertySchema,
  propertyImageSchema,
  uploadPropertyImageSchema,
  updatePropertySchema,
} from "../validators/propertyValidators.js";
import { listPropertyReviews } from "../controllers/reviewController.js";
import { listPropertyViewingRequests } from "../controllers/viewingController.js";
import { listPropertyInquiries } from "../controllers/inquiryController.js";

const router = express.Router();

const cachePropertyResponses = cacheResponse({
  namespace: "properties",
  ttlMs: env.propertiesCacheTtlMs,
});

// Uses the "movers" cache namespace (not "properties") since this endpoint's
// content is driven by mover affiliation/verification changes, not property
// edits — keeps it invalidated by the same moverController mutations that
// invalidate the movers list/detail cache.
const cacheMoverResponses = cacheResponse({
  namespace: "movers",
  ttlMs: env.moversCacheTtlMs,
});

router
  .route("/")
  .get(cachePropertyResponses, listProperties)
  .post(
    protect,
    authorize(...roleGroups.listingManagers),
    validateRequest(createPropertySchema),
    createProperty
  );

router.post("/costs/calculate", validateRequest(costCalculationSchema), calculatePropertyCost);

router.get("/mine", protect, authorize(...roleGroups.listingManagers), listMyProperties);

router.get("/:id/inquiries", protect, authorize(...roleGroups.listingManagers), listPropertyInquiries);
router.get("/:id/movers", cacheMoverResponses, listPropertyMovers);
router.get("/:id/reviews", listPropertyReviews);
router.get("/:id/viewings", protect, authorize(...roleGroups.listingManagers), listPropertyViewingRequests);
router.post(
  "/:id/images",
  protect,
  authorize(...roleGroups.listingManagers),
  validateRequest(propertyImageSchema),
  addPropertyImage
);
router.post(
  "/:id/images/upload",
  protect,
  authorize(...roleGroups.listingManagers),
  validateRequest(uploadPropertyImageSchema),
  uploadPropertyImage
);
router.delete(
  "/:id/images/:imageId",
  protect,
  authorize(...roleGroups.listingManagers),
  removePropertyImage
);

router
  .route("/:id")
  .get(cachePropertyResponses, getProperty)
  .put(
    protect,
    authorize(...roleGroups.listingManagers),
    validateRequest(updatePropertySchema),
    updateProperty
  )
  .delete(protect, authorize(...roleGroups.listingManagers), deleteProperty);

export default router;
