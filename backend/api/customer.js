/**
 * THE Candlorre — CUSTOMER & AUTH API ROUTER
 * Powered by real database-backed authentication and sessions.
 */

import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { CustomerController } from '../controllers/customerController.js';
import { requireAuth, optionalAuth } from '../middleware/authMiddleware.js';
import {
  validateSignup,
  validateLogin,
  validateForgotPassword,
  validateAddress
} from '../middleware/validation.js';

const router = Router();

// ==========================================
// Authentication Endpoints
// ==========================================
router.post('/login', validateLogin, AuthController.login);
router.post('/register', validateSignup, AuthController.register);
router.post('/signup', validateSignup, AuthController.register);
router.post('/recover', validateForgotPassword, AuthController.forgotPassword);
router.post('/forgot-password', validateForgotPassword, AuthController.forgotPassword);
router.post('/verify-otp', AuthController.verifyOtp);
router.post('/reset-password', AuthController.resetPassword);
router.post('/logout', optionalAuth, AuthController.logout);

// ==========================================
// Customer Profile Endpoints
// ==========================================
router.get('/', requireAuth, CustomerController.getProfile);
router.get('/profile', requireAuth, CustomerController.getProfile);
router.get('/me', requireAuth, CustomerController.getProfile);
router.patch('/profile', requireAuth, CustomerController.updateProfile);
router.put('/profile', requireAuth, CustomerController.updateProfile);

// ==========================================
// Saved Addresses Endpoints
// ==========================================
router.get('/addresses', requireAuth, CustomerController.getAddresses);
router.post('/addresses', requireAuth, validateAddress, CustomerController.addAddress);
router.put('/addresses/:id', requireAuth, validateAddress, CustomerController.updateAddress);
router.delete('/addresses/:id', requireAuth, CustomerController.deleteAddress);
router.post('/addresses/:id/default', requireAuth, CustomerController.setDefaultAddress);

// ==========================================
// Order History & Tracking Endpoints
// ==========================================
router.get('/orders/track', optionalAuth, CustomerController.trackOrder);
router.get('/orders/track/:identifier', optionalAuth, CustomerController.trackOrder);
router.get('/orders', requireAuth, CustomerController.getOrders);
router.get('/orders/:id', requireAuth, CustomerController.getOrderById);

export default router;
