/**
 * THE Candlorre — AUTHENTICATION ROUTER
 * Express routing for customer registration, authentication, Google OAuth, and password recovery.
 */

import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { requireAuth, optionalAuth } from '../middleware/authMiddleware.js';
import {
  validateSignup,
  validateLogin,
  validateForgotPassword
} from '../middleware/validation.js';

const router = Router();

// Configuration & Google OAuth
router.get('/config', AuthController.getConfig);
router.get('/google/url', AuthController.getGoogleAuthUrl);
router.get('/google/callback', AuthController.googleCallback);

// Account Actions
router.post('/register', validateSignup, AuthController.register);
router.post('/signup', validateSignup, AuthController.register);
router.post('/login', validateLogin, AuthController.login);
router.post('/google', AuthController.googleAuth);
router.post('/forgot-password', validateForgotPassword, AuthController.forgotPassword);
router.post('/recover', validateForgotPassword, AuthController.forgotPassword);
router.post('/verify-otp', AuthController.verifyOtp);
router.post('/reset-password', AuthController.resetPassword);
router.post('/logout', optionalAuth, AuthController.logout);

// Session Profile
router.get('/me', requireAuth, AuthController.getMe);

export default router;
