import express from "express";
import {
  listFavorites,
  removeFavorite,
  saveFavorite,
} from "../controllers/favoriteController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", listFavorites);
router.post("/:propertyId", saveFavorite);
router.delete("/:propertyId", removeFavorite);

export default router;
