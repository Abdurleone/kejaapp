import express from "express";
import {
  listFavorites,
  removeFavorite,
  saveFavorite,
} from "../controllers/favoriteController.js";
import { roleGroups } from "../constants/rbac.js";
import { authorizeGroup, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect, authorizeGroup(roleGroups.tenantOnly));

router.get("/", listFavorites);
router.post("/:propertyId", saveFavorite);
router.delete("/:propertyId", removeFavorite);

export default router;
