// routes/closureRoutes.js
import express from "express";
import {
  createClosure,
  getClosures,
  getClosureById,
  updateClosure,
  deleteClosure,
  checkSlotClosed,
  getAvailabilityWithClosures,
  getUpcomingClosures,
  previewClosureConflicts,
  updateClosureStatuses,
  bulkDeleteClosures
} from "../controllers/closureController.js";

const router = express.Router();

// Public routes (no authentication required)
router.post("/", createClosure);
router.post("/preview", previewClosureConflicts);
router.post("/update-status", updateClosureStatuses);  // New endpoint for real-time auto-end
router.post("/bulk-delete", bulkDeleteClosures);  // New endpoint for bulk delete
router.put("/:id", updateClosure);
router.delete("/:id", deleteClosure);
router.get("/", getClosures);
router.get("/upcoming", getUpcomingClosures);
router.get("/check-slot", checkSlotClosed);
router.get("/availability", getAvailabilityWithClosures);
router.get("/:id", getClosureById);

export default router;