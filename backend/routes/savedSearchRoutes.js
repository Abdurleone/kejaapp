import express from "express";
import {
  createSavedSearch,
  deleteSavedSearch,
  listMySavedSearches,
} from "../controllers/savedSearchController.js";
import { protect } from "../middlewares/authMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import { createSavedSearchSchema } from "../validators/savedSearchValidators.js";

const router = express.Router();

router.post("/", protect, validateRequest(createSavedSearchSchema), createSavedSearch);
router.get("/", protect, listMySavedSearches);
router.delete("/:id", protect, deleteSavedSearch);

export default router;
