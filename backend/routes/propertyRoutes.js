import express from "express";
import {
  addPropertyImage,
  calculatePropertyCost,
  createProperty,
  deleteProperty,
  getProperty,
  listMyProperties,
  listProperties,
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
