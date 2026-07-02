import express from "express";
import { listMovers } from "../controllers/moverController.js";
import env from "../config/env.js";
import { cacheResponse } from "../middlewares/responseCache.js";

const router = express.Router();

router.get(
  "/",
  cacheResponse({ namespace: "movers", ttlMs: env.moversCacheTtlMs }),
  listMovers
);

export default router;
