import express from "express";
import openApiSpec from "../docs/openapi.js";

const router = express.Router();

router.get("/openapi.json", (req, res) => {
  res.json(openApiSpec);
});

export default router;
