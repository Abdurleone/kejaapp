import express from "express";
import {
  createSavedSearch,
  deleteSavedSearch,
  listMySavedSearches,
} from "../controllers/savedSearchController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createSavedSearch);
router.get("/", protect, listMySavedSearches);
router.delete("/:id", protect, deleteSavedSearch);

export default router;
