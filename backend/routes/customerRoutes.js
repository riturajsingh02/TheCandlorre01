/**
 * THE Candlorre — CUSTOMER ACCOUNT ROUTER
 * Routes for Profile management, Saved Addresses, and Orders.
 */

import { Router } from 'express';
import { CustomerController } from '../controllers/customerController.js';
import { AuthController } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  validateSignup,
  validateLogin,
  validateForgotPassword,
  validateAddress
} from '../middleware/validation.js';

const router = Router();

// Auth compatibility routes (e.g. /api/customer/login, /api/customer/register)
router.post('/register', validateSignup, AuthController.register);
router.post('/login', validateLogin, AuthController.login);
router.post('/recover', validateForgotPassword, AuthController.forgotPassword);
router.post('/logout', AuthController.logout);

// Protected Profile routes
router.get('/profile', requireAuth, CustomerController.getProfile);
router.get('/me', requireAuth, CustomerController.getProfile);
router.put('/profile', requireAuth, CustomerController.updateProfile);

// Protected Address routes
router.get('/addresses', requireAuth, CustomerController.getAddresses);
router.post('/addresses', requireAuth, validateAddress, CustomerController.addAddress);
router.put('/addresses/:id', requireAuth, validateAddress, CustomerController.updateAddress);
router.delete('/addresses/:id', requireAuth, CustomerController.deleteAddress);
router.post('/addresses/:id/default', requireAuth, CustomerController.setDefaultAddress);

// Protected Order routes
router.get('/orders', requireAuth, CustomerController.getOrders);
router.get('/orders/:id', requireAuth, CustomerController.getOrderById);

export default router;
