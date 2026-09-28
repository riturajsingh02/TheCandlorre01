/**
 * THE Candlorre — WISHLIST API ROUTE
 * POST /api/wishlist/sync
 */

import { Router } from 'express';
import WishlistService from '../services/wishlist.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

router.post('/sync', async (req, res) => {
  try {
    const { items = [] } = req.body;
    const formatted = WishlistService.formatWishlist(items);
    return sendSuccess(res, { wishlist: formatted, count: formatted.length }, 'Wishlist synchronized.');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
});

export default router;
