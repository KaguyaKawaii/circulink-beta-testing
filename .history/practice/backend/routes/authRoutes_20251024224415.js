const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Signup + OTP verification
router.post("/signup", authController.signup);
router.post("/verify-otp", authController.verifyOtp);
router.post("/resend-otp", authController.resendOtp);



module.exports = router;
