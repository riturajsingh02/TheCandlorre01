/**
 * THE Candlorre — COLLECTIONS API ROUTE
 * GET /api/collections
 */

import { Router } from 'express';
import ShopifyService from '../services/shopify.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    let collections = [];
    if (ShopifyService.isConfigured()) {
      collections = await ShopifyService.getCollections(20);
    } else {
      // Fallback categories
      collections = [
        { id: 'cat_1', title: 'Premium Luxury Candles', handle: 'luxury-candles', available: true },
        { id: 'cat_2', title: 'Metal Collection', handle: 'metal-collection', available: true },
        { id: 'cat_3', title: 'Glass Jar Collection', handle: 'glass-jar-collection', available: true },
        { id: 'cat_4', title: 'Diffusers & Aromas', handle: 'diffusers-aromas', available: true },
        { id: 'cat_5', title: 'Candle Accessories', handle: 'candle-accessories', available: true },
        { id: 'cat_6', title: 'Home Décor', handle: 'home-decor', status: 'Coming Soon', available: false },
        { id: 'cat_7', title: 'Articles / Journal', handle: 'journal', status: 'Coming Soon', available: false }
      ];
    }
    return sendSuccess(res, { collections });
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
});

export default router;
