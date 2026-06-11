import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.status(501).json({
    message: "List properties endpoint is not implemented yet",
  });
});

router.post("/", (req, res) => {
  res.status(501).json({
    message: "Create property endpoint is not implemented yet",
  });
});

router.get("/:id", (req, res) => {
  res.status(501).json({
    message: "Get property endpoint is not implemented yet",
  });
});

router.put("/:id", (req, res) => {
  res.status(501).json({
    message: "Update property endpoint is not implemented yet",
  });
});

router.delete("/:id", (req, res) => {
  res.status(501).json({
    message: "Delete property endpoint is not implemented yet",
  });
});

export default router;
