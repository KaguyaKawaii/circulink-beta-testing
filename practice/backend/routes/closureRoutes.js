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
  getUpcomingClosures
} from "../controllers/closureController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protect all routes
router.use(protect);

// Admin only routes
router.post("/", adminOnly, createClosure);
router.put("/:id", adminOnly, updateClosure);
router.delete("/:id", adminOnly, deleteClosure);

// Public (authenticated) routes
router.get("/", getClosures);
router.get("/upcoming", getUpcomingClosures);
router.get("/check-slot", checkSlotClosed);
router.get("/availability", getAvailabilityWithClosures);
router.get("/:id", getClosureById);

export default router;