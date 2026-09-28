/**
 * THE Candlorre — ADMIN & STORE MANAGEMENT API ROUTE
 * Protected administration endpoints for orders, shipments, payments, inventory, and system alerts.
 * Protected by strict Admin JWT / HTTP-only cookie authentication.
 * REAL DATA ONLY — 0 orders = 0 orders, no fake statistics.
 */

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Order, { ORDER_STATES } from '../models/Order.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';
import { AlertService } from '../services/alertService.js';
import { EmailService } from '../services/emailService.js';
import { InventorySnapshot } from '../models/InventorySnapshot.js';
import { AlertLog } from '../models/AlertLog.js';
import { AlertSettings } from '../models/AlertSettings.js';
import { StoreActivity } from '../models/StoreActivity.js';
import { scheduler } from '../services/scheduler.js';
import shiprocketService from '../services/shiprocket.service.js';
import { db } from '../db/index.js';
import { sendSuccess, sendError } from '../utils/response.js';
import config from '../config/env.js';

const router = Router();

// ============================================================
// 1. PUBLIC ADMIN AUTHENTICATION ROUTES
// ============================================================

/**
 * POST /api/admin/login
 * Authenticates store administrator and sets secure HTTP-only cookie
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendError(res, 'Email and password are required.', 400);
    }

    // Ensure default admin exists if this is first run
    await Admin.ensureDefaultAdmin();

    const admin = Admin.findByEmail(email);
    if (!admin) {
      return sendError(res, 'Invalid administrator credentials.', 401);
    }

    if (Admin.isLocked(admin)) {
      return sendError(res, 'Account temporarily locked due to excessive failed attempts. Please retry later.', 423);
    }

    const isMatch = await Admin.verifyPassword(admin, password);
    if (!isMatch) {
      await Admin.recordFailedAttempt(admin);
      return sendError(res, 'Invalid administrator credentials.', 401);
    }

    const ip = req.ip || req.connection?.remoteAddress || '';
    await Admin.recordSuccessfulLogin(admin, ip);

    // Issue Admin JWT
    const token = jwt.sign(
      { adminId: admin.id, email: admin.email, role: admin.role },
      config.admin.jwtSecret,
      { expiresIn: config.admin.jwtExpiresIn }
    );

    // Set HTTP-only secure cookie
    res.cookie('candlorre_admin_token', token, {
      httpOnly: true,
      secure: config.server.isProduction,
      sameSite: config.server.isProduction ? 'none' : 'lax',
      maxAge: 12 * 60 * 60 * 1000,
      path: '/'
    });

    // Create audit log
    await db.auditLogs.create({
      action: 'ADMIN_LOGIN',
      actor: admin.email,
      metadata: { ip, timestamp: new Date().toISOString() }
    });

    return sendSuccess(res, {
      admin: Admin.toSafeObject(admin),
      token
    }, 'Administrator authenticated successfully.');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
});

/**
 * POST /api/admin/logout
 */
router.post('/logout', (req, res) => {
  res.clearCookie('candlorre_admin_token', {
    httpOnly: true,
    secure: config.server.isProduction,
    sameSite: config.server.isProduction ? 'none' : 'lax',
    path: '/'
  });
  return sendSuccess(res, { loggedOut: true }, 'Admin session terminated.');
});

// ============================================================
// 2. PROTECTED ADMIN ROUTES (Require requireAdminAuth)
// ============================================================
router.use(requireAdminAuth);

/**
 * GET /api/admin/me
 * Current authenticated administrator info
 */
router.get('/me', (req, res) => {
  return sendSuccess(res, req.admin);
});

/**
 * GET /api/admin/dashboard
 * Aggregated dashboard statistics calculated strictly from real database records
 */
router.get('/dashboard', async (req, res) => {
  try {
    const inventorySummary = InventorySnapshot.getSummary();
    const alertCounts = AlertLog.getCounts();
    const recentActivity = StoreActivity.getAll({ limit: 15 });
    const settings = AlertSettings.get();

    const orders = db.orders.find();
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(o => (o.createdAt || '').startsWith(today));

    // Calculate REAL metrics — never fake numbers
    const totalRevenue = orders
      .filter(o => o.financialStatus === 'PAID')
      .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

    const orderStats = {
      total: orders.length,
      today: todayOrders.length,
      totalRevenue,
      pending: orders.filter(o => o.status === ORDER_STATES.PENDING || o.status === ORDER_STATES.COD_OTP_PENDING).length,
      codPending: orders.filter(o => o.status === ORDER_STATES.COD_OTP_PENDING).length,
      confirmed: orders.filter(o => o.status === ORDER_STATES.CONFIRMED).length,
      paid: orders.filter(o => o.financialStatus === 'PAID').length,
      processing: orders.filter(o => o.status === ORDER_STATES.PROCESSING).length,
      packed: orders.filter(o => o.status === ORDER_STATES.PACKED).length,
      shipped: orders.filter(o => o.status === ORDER_STATES.SHIPPED || o.status === ORDER_STATES.IN_TRANSIT).length,
      delivered: orders.filter(o => o.status === ORDER_STATES.DELIVERED).length,
      cancelled: orders.filter(o => o.status === ORDER_STATES.CANCELLED).length
    };

    return sendSuccess(res, {
      orders: orderStats,
      inventory: inventorySummary,
      alerts: alertCounts,
      recentActivity,
      settings,
      integrations: {
        shopifyConfigured: Boolean(config.shopify.storeDomain && config.shopify.adminAccessToken),
        shiprocketConfigured: shiprocketService.isConfigured(),
        razorpayConfigured: Boolean(config.payments.razorpay.keyId && config.payments.razorpay.keySecret)
      }
    });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
});

/**
 * GET /api/admin/orders
 * Returns all real customer orders with filtering
 */
router.get('/orders', (req, res) => {
  try {
    const { status, financialStatus, search } = req.query;
    const orders = Order.getAll({ orderStatus: status, financialStatus, search });
    return sendSuccess(res, {
      orders,
      total: orders.length
    });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
});

/**
 * GET /api/admin/orders/:id
 * Detailed order view including payments, COD verification, Shiprocket status, and audit trail
 */
router.get('/orders/:id', (req, res) => {
  try {
    const order = Order.findById(req.params.id) || Order.findByOrderNumber(req.params.id);
    if (!order) return sendError(res, 'Order not found.', 404);

    const codVerification = db.codVerifications.findOne({ orderId: order.id });
    const payments = db.paymentTransactions.find({ orderId: order.id });
    const shiprocketOrder = db.shiprocketOrders.findOne({ localOrderId: order.id });
    const auditLogs = db.auditLogs.find({ orderId: order.id });

    return sendSuccess(res, {
      order,
      codVerification: codVerification ? {
        id: codVerification.id,
        phone: codVerification.phone,
        status: codVerification.status,
        attempts: codVerification.attempts,
        verifiedAt: codVerification.verifiedAt,
        expiresAt: codVerification.expiresAt
      } : null,
      payments,
      shiprocketOrder,
      auditLogs
    });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
});

/**
 * POST /api/admin/orders/:id/status
 * Manually update order status following strict state machine rules
 */
router.post('/orders/:id/status', async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!status) return sendError(res, 'Target status is required.', 400);

    const updated = await Order.updateStatus(req.params.id, status, reason || 'Manual admin update', req.admin.email);
    return sendSuccess(res, { order: updated }, `Order status updated to ${status}.`);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
});

/**
 * POST /api/admin/orders/:id/shiprocket-create
 * Triggers real order creation on Shiprocket
 */
router.post('/orders/:id/shiprocket-create', async (req, res) => {
  try {
    const order = Order.findById(req.params.id) || Order.findByOrderNumber(req.params.id);
    if (!order) return sendError(res, 'Order not found.', 404);

    const result = await shiprocketService.createOrder(order);
    const refreshed = Order.findById(order.id);
    return sendSuccess(res, { shiprocketOrder: result, order: refreshed }, 'Shiprocket order created successfully.');
  } catch (err) {
    return sendError(res, `Shiprocket order creation failed: ${err.message}`, 500);
  }
});

/**
 * POST /api/admin/orders/:id/shiprocket-awb
 * Generates real AWB and assigns courier on Shiprocket
 */
router.post('/orders/:id/shiprocket-awb', async (req, res) => {
  try {
    const order = Order.findById(req.params.id) || Order.findByOrderNumber(req.params.id);
    if (!order) return sendError(res, 'Order not found.', 404);

    const shipmentId = order.shiprocket?.shipmentId;
    if (!shipmentId) {
      return sendError(res, 'Order does not have a Shiprocket shipment ID yet. Create order first.', 400);
    }

    const result = await shiprocketService.assignAwb(shipmentId);
    const refreshed = Order.findById(order.id);
    return sendSuccess(res, { shipment: result, order: refreshed }, 'Real AWB assigned successfully!');
  } catch (err) {
    return sendError(res, `Failed to assign AWB from Shiprocket: ${err.message}`, 500);
  }
});

/**
 * GET /api/admin/payments
 * Lists all real payment transactions
 */
router.get('/payments', (req, res) => {
  try {
    const payments = db.paymentTransactions.find();
    return sendSuccess(res, {
      payments: payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      total: payments.length
    });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
});

/**
 * GET /api/admin/alerts — Alert log history
 */
router.get('/alerts', (req, res) => {
  try {
    const { type, severity, status, search, limit = 50 } = req.query;
    const alerts = AlertLog.getAll({ type, severity, status, search, limit });
    const counts = AlertLog.getCounts();
    return sendSuccess(res, { alerts, counts, count: alerts.length });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
});

/**
 * POST /api/admin/alerts/:id/retry
 */
router.post('/alerts/:id/retry', async (req, res) => {
  try {
    const result = await EmailService.retryAlert(req.params.id);
    return sendSuccess(res, result, 'Alert successfully re-dispatched.');
  } catch (err) {
    return sendError(res, `Retry failed: ${err.message}`, 500);
  }
});

/**
 * GET /api/admin/inventory
 */
router.get('/inventory', (req, res) => {
  try {
    const summary = InventorySnapshot.getSummary();
    return sendSuccess(res, summary);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
});

/**
 * POST /api/admin/inventory/sync
 */
router.post('/inventory/sync', async (req, res) => {
  try {
    const result = await scheduler.syncInventoryFromShopify();
    return sendSuccess(res, result, 'Shopify inventory synced successfully.');
  } catch (err) {
    return sendError(res, `Inventory sync failed: ${err.message}`, 500);
  }
});

/**
 * POST /api/admin/inventory/adjust
 */
router.post('/inventory/adjust', async (req, res) => {
  try {
    const { productId, variantId, quantity, sku, productTitle, variantTitle, price, imageUrl } = req.body;
    if (!productId || !variantId || quantity === undefined) {
      return sendError(res, 'productId, variantId, and quantity are required.', 400);
    }

    await AlertService.evaluateVariantInventory({
      productId,
      variantId,
      sku: sku || 'SKU-CNDLR',
      productTitle: productTitle || 'Botanical Candle',
      variantTitle: variantTitle || 'Standard',
      imageUrl: imageUrl || '',
      price: parseFloat(price || 0),
      quantity: parseInt(quantity, 10)
    });

    const updated = InventorySnapshot.getById(productId, variantId);
    return sendSuccess(res, { snapshot: updated }, 'Inventory adjusted and alert thresholds evaluated.');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
});

/**
 * GET /api/admin/settings
 */
router.get('/settings', (req, res) => {
  try {
    const settings = AlertSettings.get();
    return sendSuccess(res, settings);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
});

/**
 * PUT /api/admin/settings
 */
router.put('/settings', async (req, res) => {
  try {
    const updated = await AlertSettings.update(req.body);
    return sendSuccess(res, updated, 'Alert settings updated successfully.');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
});

/**
 * GET /api/admin/activity
 */
router.get('/activity', (req, res) => {
  try {
    const { type, limit = 50 } = req.query;
    const activities = StoreActivity.getAll({ type, limit });
    return sendSuccess(res, { activities, count: activities.length });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
});

export default router;
