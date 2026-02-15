const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");
const { protect, admin } = require("../middleware/authMiddleware");

// All analytics routes should be protected and admin-only
router.use(protect, admin);

// User analytics
router.get("/users", analyticsController.getUserAnalytics);

// Overview analytics
router.get("/overview", analyticsController.getAnalyticsOverview);

// Reservation analytics
router.get("/reservations", analyticsController.getReservationAnalytics);

// Room analytics
router.get("/rooms", analyticsController.getRoomAnalytics);

// Engagement metrics
router.get("/engagement", analyticsController.getEngagementMetrics);

// Export analytics
router.get("/export", analyticsController.exportAnalytics);

module.exports = router;