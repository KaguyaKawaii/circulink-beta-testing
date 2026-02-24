import express from "express";
import * as forgotPasswordController from "../controllers/forgotPasswordController.js";

const router = express.Router();

// Request OTP
router.post("/forgot-password", forgotPasswordController.requestOtp);

// Verify OTP + reset password
router.post("/verify-otp", forgotPasswordController.verifyOtpAndResetPassword);

export default router;