const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const sessionController = require("../controllers/sessionController"); // ADD THIS

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