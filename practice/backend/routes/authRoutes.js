// routes/authRoutes.js
import express from 'express';
import * as authController from '../controllers/authController.js';

const router = express.Router();

// User registration with OTP - MUST be /signup to match frontend
router.post('/signup', authController.signup);           // ✅ Changed from /register to /signup
router.post('/verify-otp', authController.verifyOtp);    // ✅ Keep as verify-otp
router.post('/resend-otp', authController.resendOtp);    // ✅ Keep as resend-otp

// User login
router.post('/login', authController.login);

// User logout
router.post('/logout', authController.logout);

// Get current user (protected route - will add auth middleware later)
router.get('/me', authController.getCurrentUser);

// Check session
router.get('/check-session', authController.checkSession);

export default router;