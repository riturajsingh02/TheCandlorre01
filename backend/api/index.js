/**
 * THE Candlorre — MASTER API ROUTER
 * Aggregates all modular REST endpoints under /api
 */

import { Router } from 'express';
import { config } from '../config/env.js';
import productsRouter from './products.js';
import collectionsRouter from './collections.js';
import searchRouter from './search.js';
import cartRouter from './cart.js';
import checkoutRouter from './checkout.js';
import customerRouter from './customer.js';
import authRouter from '../routes/authRoutes.js';
import ordersRouter from './orders.js';
import trackingRouter from './tracking.js';
import wishlistRouter from './wishlist.js';
import contactRouter from './contact.js';
import adminRouter from './admin.js';
import ordersWebhookRouter from './webhooks/shopify-orders.js';
import productsWebhookRouter from './webhooks/shopify-products.js';
import inventoryWebhookRouter from './webhooks/shopify-inventory.js';
import paymentWebhookRouter from './webhooks/payment.js';
import shiprocketWebhookRouter from './webhooks/shiprocket.js';
import ShippingService from '../services/shipping.js';
import { InventorySnapshot } from '../models/InventorySnapshot.js';
import { sendSuccess } from '../utils/response.js';

const apiRouter = Router();

// Health Check
apiRouter.get('/health', (req, res) => {
  return sendSuccess(res, {
    status: 'ok',
    store: 'The Candlorre',
    shopifyConnected: Boolean(config.shopify.storeDomain && config.shopify.storefrontAccessToken),
    alertSystem: 'active',
    timestamp: new Date().toISOString()
  });
});

// Safe Public Config Endpoint
apiRouter.get('/config', (req, res) => {
  return res.json({
    shopifyStoreDomain: config.shopify.storeDomain,
    shopifyStorefrontToken: config.shopify.storefrontAccessToken,
    shopifyApiVersion: config.shopify.apiVersion,
    razorpayKeyId: config.payments.razorpay.keyId,
    ga4MeasurementId: config.analytics.ga4MeasurementId,
    metaPixelId: config.analytics.metaPixelId,
    googleAdsId: config.analytics.googleAdsId,
    whatsappNumber: config.contact.whatsappNumber,
    supportEmail: config.contact.supportEmail,
    supportPhone: config.contact.supportPhone,
    orderTrackingEndpoint: config.tracking.orderTrackingEndpoint
  });
});

// Real-Time Storefront Inventory Status Endpoint
apiRouter.get('/inventory-status', (req, res) => {
  const snapshots = InventorySnapshot.getAll();
  const stockMap = {};
  snapshots.forEach(s => {
    stockMap[s.id] = {
      productId: s.productId,
      variantId: s.variantId,
      sku: s.sku,
      quantity: s.quantity,
      state: s.state,
      available: s.quantity > 0,
      isLowStock: s.state === 'LOW',
      isCritical: s.state === 'CRITICAL',
      isOutOfStock: s.state === 'OUT_OF_STOCK'
    };
  });
  return sendSuccess(res, { inventory: stockMap });
});

// Indian PIN Code Serviceability Checker
apiRouter.all('/check-pincode', async (req, res) => {
  const pincode = req.query.pincode || req.body?.pincode;
  const result = await ShippingService.checkPincode(pincode);
  return res.json(result);
});

// Reverse Geocoding Proxy
apiRouter.get('/reverse-geocode', async (req, res) => {
  const { lat, lng } = req.query;
  try {
    const result = await ShippingService.reverseGeocode(lat, lng);
    return res.json({ success: true, ...result, data: result });
  } catch (err) {
    return res.status(502).json({ success: false, error: err.message });
  }
});

// Mount Sub-routers
apiRouter.use('/products', productsRouter);
apiRouter.use('/collections', collectionsRouter);
apiRouter.use('/search', searchRouter);
apiRouter.use('/cart', cartRouter);
apiRouter.use('/checkout', checkoutRouter);
apiRouter.use('/customer', customerRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/tracking', trackingRouter);
apiRouter.use('/wishlist', wishlistRouter);
apiRouter.use('/contact', contactRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/webhooks/shopify-orders', ordersWebhookRouter);
apiRouter.use('/webhooks/shopify-products', productsWebhookRouter);
apiRouter.use('/webhooks/shopify-inventory', inventoryWebhookRouter);
apiRouter.use('/webhooks/payment', paymentWebhookRouter);
apiRouter.use('/webhooks/shiprocket', shiprocketWebhookRouter);

export default apiRouter;
