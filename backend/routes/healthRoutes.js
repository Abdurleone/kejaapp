import express from "express";
import {
  getDatabaseHealth,
  getHealth,
  getLiveness,
  getReadiness,
} from "../controllers/healthController.js";

const router = express.Router();

router.get("/", getHealth);
router.get("/database", getDatabaseHealth);
router.get("/live", getLiveness);
router.get("/ready", getReadiness);

export default router;
