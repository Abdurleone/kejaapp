import express from "express";
import {
  createInquiry,
  listMyInquiries,
  updateInquiry,
} from "../controllers/inquiryController.js";
import { protect } from "../middlewares/authMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
  createInquirySchema,
  updateInquirySchema,
} from "../validators/inquiryValidators.js";

const router = express.Router();

router.use(protect);

router
  .route("/")
  .get(listMyInquiries)
  .post(validateRequest(createInquirySchema), createInquiry);

router.put("/:id", validateRequest(updateInquirySchema), updateInquiry);

export default router;
