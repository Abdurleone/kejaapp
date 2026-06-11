import express from "express";
import {
  calculatePropertyCost,
  createProperty,
  deleteProperty,
  getProperty,
  listProperties,
  updateProperty,
} from "../controllers/propertyController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
  costCalculationSchema,
  createPropertySchema,
  updatePropertySchema,
} from "../validators/propertyValidators.js";
import { listPropertyReviews } from "../controllers/reviewController.js";
import { listPropertyViewingRequests } from "../controllers/viewingController.js";

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

router.get("/:id/reviews", listPropertyReviews);
router.get("/:id/viewings", protect, authorize("landlord", "agency", "admin"), listPropertyViewingRequests);

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
