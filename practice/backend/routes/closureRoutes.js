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
  bulkDeleteClosures,
  activateClosure,
  deactivateClosure,
  getClosureStats
} from "../controllers/closureController.js";

const router = express.Router();

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================
router.get("/check-slot", checkSlotClosed);
router.get("/availability", getAvailabilityWithClosures);
router.get("/upcoming", getUpcomingClosures);
router.post("/preview", previewClosureConflicts);
router.post("/update-status", updateClosureStatuses);
router.get("/stats", getClosureStats);

// ============================================
// CRUD OPERATIONS
// ============================================
router.post("/", createClosure);           // Create
router.get("/", getClosures);              // Read all
router.get("/:id", getClosureById);        // Read one
router.put("/:id", updateClosure);         // Update
router.delete("/:id", deleteClosure);      // Delete
router.post("/bulk-delete", bulkDeleteClosures); // Bulk delete

// ============================================
// STATUS MANAGEMENT
// ============================================
router.post("/:id/activate", activateClosure);     // Manual activate
router.post("/:id/deactivate", deactivateClosure); // Manual deactivate

export default router;