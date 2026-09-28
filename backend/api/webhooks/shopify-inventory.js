/**
 * THE Candlorre — SHOPIFY INVENTORY WEBHOOK HANDLER
 * POST /api/webhooks/shopify-inventory
 * Receives real-time inventory level adjustments and dispatches stock threshold alerts.
 */

import { Router } from 'express';
import crypto from 'crypto';
import { config } from '../../config/env.js';
import { AlertService } from '../../services/alertService.js';
import { InventorySnapshot } from '../../models/InventorySnapshot.js';
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
  const topic = req.headers['x-shopify-topic'] || 'inventory_levels/update';
  const webhookId = req.headers['x-shopify-webhook-id'] || `inv_hook_${req.body?.inventory_item_id}_${Date.now()}`;

  if (!verifyShopifyHmac(req)) {
    console.warn(`[Webhook] Invalid HMAC signature for topic: ${topic}`);
    await AlertService.sendSystemErrorAlert({
      serviceName: 'Shopify Inventory Webhook Authenticator',
      error: new Error(`Rejected unauthorized inventory webhook with topic "${topic}"`)
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
    inventoryItemId: req.body?.inventory_item_id,
    processedAt: new Date().toISOString()
  });

  const { inventory_item_id, available } = req.body;

  try {
    // Find matching snapshot by inventory item ID or variant
    const allSnapshots = InventorySnapshot.getAll();
    const matching = allSnapshots.find(s => String(s.variantId) === String(inventory_item_id) || String(s.sku) === String(inventory_item_id));

    if (matching) {
      await AlertService.evaluateVariantInventory({
        productId: matching.productId,
        variantId: matching.variantId,
        sku: matching.sku,
        productTitle: matching.productTitle,
        variantTitle: matching.variantTitle,
        productHandle: matching.productHandle,
        imageUrl: matching.imageUrl,
        price: matching.price,
        quantity: available ?? 0
      });
    }

    return res.status(200).json({ received: true, topic, inventoryItemId: inventory_item_id });
  } catch (err) {
    console.error(`[Webhook Error] Processing ${topic}:`, err);
    await AlertService.sendSystemErrorAlert({
      serviceName: `Shopify Inventory Webhook (${topic})`,
      error: err
    });
    return res.status(500).json({ error: 'Inventory webhook failed', message: err.message });
  }
});

export default router;
