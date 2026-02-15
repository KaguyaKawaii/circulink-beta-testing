// routes/analyticsRoutes.js
const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");

// All analytics routes (no middleware since you don't need it)
router.get("/overview", analyticsController.getAnalyticsOverview);
router.get("/users", analyticsController.getUserAnalytics);
router.get("/reservations", analyticsController.getReservationAnalytics);
router.get("/rooms", analyticsController.getRoomAnalytics);
router.get("/engagement", analyticsController.getEngagementMetrics);
router.get("/export", analyticsController.exportAnalytics);

module.exports = router;