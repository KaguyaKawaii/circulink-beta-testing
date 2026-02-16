// routes/analyticsRoutes.js

const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");

// User analytics
router.get("/users", analyticsController.getUserAnalytics);

// Overview analytics
router.get("/overview", analyticsController.getAnalyticsOverview);

// Reservation analytics - SIMPLE version (just 4 metrics)
router.get("/reservations", analyticsController.getReservationAnalyticsSimple);

// Room analytics
router.get("/rooms", analyticsController.getRoomAnalytics);

// Engagement metrics
router.get("/engagement", analyticsController.getEngagementMetrics);

// Export analytics
router.get("/export", analyticsController.exportAnalytics);

module.exports = router;