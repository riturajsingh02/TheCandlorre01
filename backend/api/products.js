/**
 * THE Candlorre — PRODUCTS API ROUTE
 * GET /api/products
 * GET /api/products/:handle
 */

import { Router } from 'express';
import ShopifyService from '../services/shopify.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

// GET /api/products — List all active products
router.get('/', async (req, res) => {
  try {
    const { limit = 50, sort = 'BEST_SELLING', query = '', reverse = 'false' } = req.query;
    const products = await ShopifyService.getProducts({
      first: parseInt(limit, 10) || 50,
      query: query.toString(),
      sortKey: sort.toString(),
      reverse: reverse === 'true'
    });
    return sendSuccess(res, { products, count: products.length });
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
});

// GET /api/products/:handle — Fetch single product detail
router.get('/:handle', async (req, res) => {
  try {
    const { handle } = req.params;
    const product = await ShopifyService.getProductByHandle(handle);
    if (!product) {
      return sendError(res, `Product with handle "${handle}" not found.`, 404);
    }
    return sendSuccess(res, { product });
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
});

export default router;
