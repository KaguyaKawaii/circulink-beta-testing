// routes/analyticsRoutes.js
const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// All analytics routes require admin authentication
router.use(protect, adminOnly);

// Main analytics overview
router.get("/overview", analyticsController.getAnalyticsOverview);

// Detailed analytics sections
router.get("/users", analyticsController.getUserAnalytics);
router.get("/reservations", analyticsController.getReservationAnalytics);
router.get("/rooms", analyticsController.getRoomAnalytics);
router.get("/engagement", analyticsController.getEngagementMetrics);

// Export functionality
router.get("/export", analyticsController.exportAnalytics);

module.exports = router;