// analyticsRoutes.js
import express from "express";
import {
  getUserAnalytics,
  getAnalyticsOverview,
  getReservationAnalytics,
  getDetailedReservationAnalytics,
  getRoomAnalytics,
  getDetailedRoomAnalytics,
  getEngagementMetrics,
  exportAnalytics
} from "../controllers/analyticsController.js";

const router = express.Router();

// User analytics
router.get("/users", getUserAnalytics);

// Overview analytics
router.get("/overview", getAnalyticsOverview);

// Reservation analytics - SIMPLE version
router.get("/reservations", getReservationAnalytics);

// Detailed reservation analytics with trends and growth data
router.get("/reservations/detailed", getDetailedReservationAnalytics);

// Room analytics - SIMPLE version
router.get("/rooms", getRoomAnalytics);

// Detailed room analytics with trends and growth data
router.get("/rooms/detailed", getDetailedRoomAnalytics);

// Engagement metrics
router.get("/engagement", getEngagementMetrics);

// Export analytics
router.get("/export", exportAnalytics);

export default router;