const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const loginController = require("../controllers/loginController"); // ADD THIS
const sessionController = require("../controllers/sessionController");

// ✅ NEW: Login routes with session management
router.post("/login", loginController.login);
router.post("/admin-login", loginController.adminLogin);
router.post("/logout", loginController.logout);
router.post("/force-logout", loginController.forceLogout);

// Session management routes
router.post("/check-login-status", sessionController.checkLoginStatus);
router.post("/update-session-login", sessionController.updateSessionLogin);
router.post("/update-session-logout", sessionController.updateSessionLogout);
router.post("/validate-session", sessionController.validateSession);

// Signup + OTP verification
router.post("/signup", authController.signup);
router.post("/verify-otp", authController.verifyOtp);
router.post("/resend-otp", authController.resendOtp);

module.exports = router;