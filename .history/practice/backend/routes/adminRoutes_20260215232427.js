// routes/adminRoutes.js
import express from "express";
const router = express.Router();
import * as adminController from "../controllers/adminController.js"; // Note the .js extension

// Admin authentication
router.post("/register", adminController.registerAdmin);
router.post("/login", adminController.loginAdmin);
router.post("/verify-otp", adminController.verifyOTP);
router.post("/resend-otp", adminController.resendOTP);

// Admin profile management
router.put("/:id", adminController.updateAdminProfile);
router.put("/:id/password", adminController.updateAdminPassword);

// System settings
router.get("/system/settings", adminController.getSystemSettings);
router.put("/system/settings", adminController.updateSystemSettings);

// Dashboard data
router.get("/summary", adminController.getSummaryCounts);

export default router;