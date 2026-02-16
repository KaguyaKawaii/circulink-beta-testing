const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");

// User analytics - no middleware, public access
router.get("/users", analyticsController.getUserAnalytics);

module.exports = router;