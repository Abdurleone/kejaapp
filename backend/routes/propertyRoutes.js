import express from "express";
import {
  createProperty,
  deleteProperty,
  getProperty,
  listProperties,
  updateProperty,
} from "../controllers/propertyController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import { createPropertySchema, updatePropertySchema } from "../validators/propertyValidators.js";
import { listPropertyReviews } from "../controllers/reviewController.js";

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

router.get("/:id/reviews", listPropertyReviews);

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
