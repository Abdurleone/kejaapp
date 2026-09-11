import express from "express";
import { triggerDemoReset } from "../controllers/demoController.js";

const router = express.Router();

// No protect/CSRF on purpose - a webhook-style, secret-gated route meant for
// an external cron-ping service (or a manual curl) to call directly, not a
// user session action. Its real defense is env.demoMode (404s outright
// unless this is the dedicated demo environment) plus the :secret path
// segment, checked in triggerDemoReset against DEMO_RESET_SECRET.
router.post("/reset/:secret", triggerDemoReset);

export default router;
