import express from 'express';
import * as authController from '../controllers/authController.js';

const router = express.Router();

// User registration with OTP
router.post('/register', authController.signup);           // ✅ Fixed: changed from register to signup
router.post('/verify-otp', authController.verifyOtp);      // ✅ Fixed: changed from verify-email to verify-otp
router.post('/resend-otp', authController.resendOtp);      // ✅ Fixed: changed from resend-verification to resend-otp

// User login - COMMENT OUT until you add this function
router.post('/login', authController.login);

// User logout - COMMENT OUT until you add this function
router.post('/logout', authController.logout);

// Get current user - COMMENT OUT until you add this function
router.get('/me', authController.getCurrentUser);

// Check session - COMMENT OUT until you add this function
router.get('/check-session', authController.checkSession);

export default router;