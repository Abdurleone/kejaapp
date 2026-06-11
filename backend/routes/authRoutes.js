import express from "express";

const router = express.Router();

router.post("/register", (req, res) => {
  res.status(501).json({
    message: "Register endpoint is not implemented yet",
  });
});

router.post("/login", (req, res) => {
  res.status(501).json({
    message: "Login endpoint is not implemented yet",
  });
});

export default router;
