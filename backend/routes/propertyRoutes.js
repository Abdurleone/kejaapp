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

router
  .route("/")
  .get(listProperties)
  .post(
    protect,
    authorize("landlord", "agency", "admin"),
    validateRequest(createPropertySchema),
    createProperty
  );

router.post("/costs/calculate", validateRequest(costCalculationSchema), calculatePropertyCost);

router.get("/mine", protect, authorize("landlord", "agency", "admin"), listMyProperties);

router.get("/:id/inquiries", protect, authorize("landlord", "agency", "admin"), listPropertyInquiries);
router.get("/:id/reviews", listPropertyReviews);
router.get("/:id/viewings", protect, authorize("landlord", "agency", "admin"), listPropertyViewingRequests);
router.post(
  "/:id/images",
  protect,
  authorize("landlord", "agency", "admin"),
  validateRequest(propertyImageSchema),
  addPropertyImage
);
router.post(
  "/:id/images/upload",
  protect,
  authorize("landlord", "agency", "admin"),
  validateRequest(uploadPropertyImageSchema),
  uploadPropertyImage
);
router.delete(
  "/:id/images/:imageId",
  protect,
  authorize("landlord", "agency", "admin"),
  removePropertyImage
);

router
  .route("/:id")
  .get(getProperty)
  .put(
    protect,
    authorize("landlord", "agency", "admin"),
    validateRequest(updatePropertySchema),
    updateProperty
  )
  .delete(protect, authorize("landlord", "agency", "admin"), deleteProperty);

export default router;
