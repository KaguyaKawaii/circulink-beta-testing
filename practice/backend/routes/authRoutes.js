import express from 'express';
import * as authController from '../controllers/authController.js';

const router = express.Router();

// User registration
router.post('/register', authController.register);

// User login
router.post('/login', authController.login);

// User logout
router.post('/logout', authController.logout);

// Get current user
router.get('/me', authController.getCurrentUser);

// Email verification
router.get('/verify-email/:token', authController.verifyEmail);

// Resend verification email
router.post('/resend-verification', authController.resendVerification);

// Check session
router.get('/check-session', authController.checkSession);

export default router;