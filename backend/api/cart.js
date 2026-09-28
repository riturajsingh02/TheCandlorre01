/**
 * THE Candlorre — CART API ROUTE
 * Handles Shopify server cart sessions
 */

import { Router } from 'express';
import CartService from '../services/cart.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

// POST /api/cart — Create a new cart
router.post('/', async (req, res) => {
  try {
    const { lines = [], discountCodes = [] } = req.body;
    const cart = await CartService.createCart(lines, discountCodes);
    return sendSuccess(res, { cart }, 'Cart created successfully.');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
});

// GET /api/cart/:id — Retrieve cart details
router.get('/:id', async (req, res) => {
  try {
    const cart = await CartService.getCart(req.params.id);
    if (!cart) {
      return sendError(res, 'Cart not found or expired.', 404);
    }
    return sendSuccess(res, { cart });
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
});

// POST /api/cart/lines — Add line items to cart
router.post('/lines', async (req, res) => {
  try {
    const { cartId, lines = [] } = req.body;
    if (!cartId || lines.length === 0) {
      return sendError(res, 'cartId and items array are required.', 400);
    }
    const cart = await CartService.addLines(cartId, lines);
    return sendSuccess(res, { cart }, 'Item(s) added to cart.');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
});

// PATCH /api/cart/lines — Update line quantities
router.patch('/lines', async (req, res) => {
  try {
    const { cartId, lines = [] } = req.body;
    if (!cartId || lines.length === 0) {
      return sendError(res, 'cartId and lines array are required.', 400);
    }
    const cart = await CartService.updateLines(cartId, lines);
    return sendSuccess(res, { cart }, 'Cart updated.');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
});

// DELETE /api/cart/lines — Remove line items
router.delete('/lines', async (req, res) => {
  try {
    const { cartId, lineIds = [] } = req.body;
    if (!cartId || lineIds.length === 0) {
      return sendError(res, 'cartId and lineIds array are required.', 400);
    }
    const cart = await CartService.removeLines(cartId, lineIds);
    return sendSuccess(res, { cart }, 'Item(s) removed.');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
});

// POST /api/cart/discount — Apply discount code
router.post('/discount', async (req, res) => {
  try {
    const { cartId, discountCodes = [] } = req.body;
    if (!cartId) {
      return sendError(res, 'cartId is required.', 400);
    }
    const cart = await CartService.updateDiscountCodes(cartId, discountCodes);
    return sendSuccess(res, { cart }, 'Discount code(s) applied.');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
});

export default router;
