import express from "express";
import { listMovers } from "../controllers/moverController.js";

const router = express.Router();

router.get("/", listMovers);

export default router;
