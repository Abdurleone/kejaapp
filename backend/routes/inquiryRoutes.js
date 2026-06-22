import express from "express";
import {
  createInquiry,
  listMyInquiries,
  updateInquiry,
} from "../controllers/inquiryController.js";
import { roleGroups } from "../constants/rbac.js";
import { authorizeGroup, protect } from "../middlewares/authMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
  createInquirySchema,
  updateInquirySchema,
} from "../validators/inquiryValidators.js";

const router = express.Router();

router.use(protect);

router
  .route("/")
  .get(authorizeGroup(roleGroups.tenantOnly), listMyInquiries)
  .post(authorizeGroup(roleGroups.tenantOnly), validateRequest(createInquirySchema), createInquiry);

router.put("/:id", validateRequest(updateInquirySchema), updateInquiry);

export default router;
