/**
 * THE Candlorre — PRODUCT SEARCH API ROUTE
 * GET /api/search?q=lavender
 */

import { Router } from 'express';
import ShopifyService from '../services/shopify.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const query = String(req.query.q || req.query.query || '').trim();
    if (!query) {
      return sendSuccess(res, { results: [], query: '', count: 0 });
    }

    const products = await ShopifyService.getProducts({ first: 40, query });
    const cleanQ = query.toLowerCase();

    const filtered = products.filter(p => {
      const title = (p.title || '').toLowerCase();
      const desc = (p.desc || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const topNote = (p.notes?.top || '').toLowerCase();
      const heartNote = (p.notes?.heart || '').toLowerCase();
      const baseNote = (p.notes?.base || '').toLowerCase();
      return title.includes(cleanQ) || desc.includes(cleanQ) || cat.includes(cleanQ) ||
             topNote.includes(cleanQ) || heartNote.includes(cleanQ) || baseNote.includes(cleanQ);
    });

    return sendSuccess(res, {
      results: filtered,
      query,
      count: filtered.length
    });
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
});

export default router;
