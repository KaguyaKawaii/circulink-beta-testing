// routes/adminRoutes.js
import express from "express";
const router = express.Router();

import {
  registerAdmin,
  loginAdmin,
  verifyOTP,
  resendOTP,
  getSummaryCounts,
  updateAdminProfile,
  updateAdminPassword,
  getSystemSettings,
  updateSystemSettings
} from "../controllers/adminController.js"; // Make sure the path is correct

// Test route to verify router is working
router.get("/test", (req, res) => {
  res.json({ 
    success: true, 
    message: "Admin routes are working!",
    timestamp: new Date().toISOString()
  });
});

// Admin authentication
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);

// Admin profile management
router.put("/:id", updateAdminProfile);
router.put("/:id/password", updateAdminPassword);

// System settings
router.get("/system/settings", getSystemSettings);
router.put("/system/settings", updateSystemSettings);

// Dashboard data
router.get("/summary", getSummaryCounts);

export default router;