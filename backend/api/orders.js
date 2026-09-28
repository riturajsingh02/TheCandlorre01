/**
 * THE Candlorre — ORDERS API ROUTE
 * GET /api/orders
 * GET /api/orders/:id
 */

import { Router } from 'express';
import CustomerService from '../services/customer.js';
import OrderService from '../services/order.js';
import Order from '../models/Order.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return req.query.token || null;
}

// GET /api/orders — Fetch customer orders
router.get('/', async (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) return sendError(res, 'Authentication token required.', 401);
    const customer = await CustomerService.getCustomer(token);
    return sendSuccess(res, {
      orders: customer.orders || [],
      count: (customer.orders || []).length
    });
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
});

// GET /api/orders/:id — Fetch single order detail
router.get('/:id', async (req, res) => {
  try {
    const token = extractToken(req);
    const orderId = req.params.id;

    if (token) {
      try {
        const order = await OrderService.getCustomerOrder(token, orderId);
        if (order) return sendSuccess(res, { order });
      } catch (err) {
        // Fallback to direct DB lookup
      }
    }

    // Direct database lookup by order number or ID
    const localOrder = Order.findByOrderNumber(orderId) || Order.findById(orderId);
    if (localOrder) {
      const sanitized = {
        id: localOrder.id,
        orderNumber: localOrder.orderNumber,
        status: localOrder.status,
        financialStatus: localOrder.financialStatus,
        fulfillmentStatus: localOrder.fulfillmentStatus || 'UNFULFILLED',
        totalPrice: localOrder.totalPrice,
        subtotalPrice: localOrder.subtotalPrice,
        discountAmount: localOrder.discountAmount,
        discountLabel: localOrder.discountLabel,
        shippingPrice: localOrder.shippingPrice,
        paymentMethod: localOrder.paymentMethod,
        shippingAddress: localOrder.shippingAddress,
        lineItems: localOrder.lineItems,
        tracking: localOrder.tracking,
        timeline: localOrder.timeline,
        processedAt: localOrder.createdAt,
        createdAt: localOrder.createdAt,
        updatedAt: localOrder.updatedAt
      };
      return sendSuccess(res, { order: sanitized });
    }

    return sendError(res, `Order "${orderId}" not found.`, 404);
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
});

export default router;
