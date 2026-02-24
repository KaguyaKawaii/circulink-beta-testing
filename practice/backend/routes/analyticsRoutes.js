import express from "express";
import * as analyticsController from "../controllers/analyticsController.js";

const router = express.Router();

// User analytics
router.get("/users", analyticsController.getUserAnalytics);

// Overview analytics
router.get("/overview", analyticsController.getAnalyticsOverview);

// Reservation analytics - SIMPLE version
router.get("/reservations", analyticsController.getReservationAnalytics);

// Detailed reservation analytics with trends and growth data
router.get("/reservations/detailed", analyticsController.getDetailedReservationAnalytics);

// Room analytics - SIMPLE version
router.get("/rooms", analyticsController.getRoomAnalytics);

// Detailed room analytics with trends and growth data
router.get("/rooms/detailed", analyticsController.getDetailedRoomAnalytics);

// Engagement metrics
router.get("/engagement", analyticsController.getEngagementMetrics);

// Export analytics
router.get("/export", analyticsController.exportAnalytics);

export default router;