import express from "express";
import { getDatabaseHealth, getHealth } from "../controllers/healthController.js";

const router = express.Router();

router.get("/", getHealth);
router.get("/database", getDatabaseHealth);

export default router;
