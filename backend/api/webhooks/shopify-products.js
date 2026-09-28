/**
 * THE Candlorre — SHOPIFY PRODUCTS WEBHOOK HANDLER
 * POST /api/webhooks/shopify-products
 * Receives product creations, updates, deletions, and pricing changes in real time.
 */

import { Router } from 'express';
import crypto from 'crypto';
import { config } from '../../config/env.js';
import { AlertService } from '../../services/alertService.js';
import { db } from '../../db/index.js';

const router = Router();

function verifyShopifyHmac(req) {
  const hmacHeader = req.headers['x-shopify-hmac-sha256'];
  const secret = config.shopify.webhookSecret;

  if (!secret) return true;
  if (!hmacHeader) return false;

  const rawBody = req.rawBody || JSON.stringify(req.body);
  const hash = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader));
}

router.post('/', async (req, res) => {
  const topic = req.headers['x-shopify-topic'] || 'products/update';
  const webhookId = req.headers['x-shopify-webhook-id'] || `prod_hook_${req.body?.id}_${topic}_${Date.now()}`;

  if (!verifyShopifyHmac(req)) {
    console.warn(`[Webhook] Invalid HMAC signature for topic: ${topic}`);
    await AlertService.sendSystemErrorAlert({
      serviceName: 'Shopify Product Webhook Authenticator',
      error: new Error(`Rejected unauthorized product webhook with topic "${topic}"`)
    });
    return res.status(401).send('Unauthorized webhook signature.');
  }

  const existingEvent = db.webhookEvents.findById(webhookId);
  if (existingEvent) {
    return res.status(200).json({ received: true, duplicate: true });
  }

  await db.webhookEvents.create({
    id: webhookId,
    topic,
    productId: req.body?.id,
    processedAt: new Date().toISOString()
  });

  const productData = req.body;

  try {
    if (topic === 'products/create') {
      await AlertService.handleProductCreated({
        id: productData.id,
        title: productData.title,
        handle: productData.handle,
        productType: productData.product_type,
        variants: (productData.variants || []).map(v => ({
          id: v.id,
          title: v.title,
          sku: v.sku,
          price: v.price,
          stock: v.inventory_quantity
        }))
      });
    }

    // Process variant inventory & price states
    for (const variant of (productData?.variants || [])) {
      await AlertService.evaluateVariantInventory({
        productId: productData.id,
        variantId: variant.id,
        sku: variant.sku,
        productTitle: productData.title,
        variantTitle: variant.title,
        productHandle: productData.handle,
        imageUrl: productData.image?.src || productData.images?.[0]?.src || '',
        price: parseFloat(variant.price || 0),
        quantity: variant.inventory_quantity ?? 0
      });
    }

    return res.status(200).json({ received: true, topic, productId: productData?.id });
  } catch (err) {
    console.error(`[Webhook Error] Processing ${topic}:`, err);
    await AlertService.sendSystemErrorAlert({
      serviceName: `Shopify Product Webhook (${topic})`,
      error: err
    });
    return res.status(500).json({ error: 'Product webhook failed', message: err.message });
  }
});

export default router;
