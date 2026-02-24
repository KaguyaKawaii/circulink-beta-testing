import express from "express";
import adminController from "../controllers/adminController.js";
import analyticsRoutes from "./analyticsRoutes.js";

const router = express.Router();

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

// Analytics routes
router.use("/analytics", analyticsRoutes);

export default router;