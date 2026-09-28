/**
 * THE Candlorre — SHOPIFY ORDERS WEBHOOK HANDLER
 * Idempotent, cryptographically verified processing for Shopify order events.
 * Real data only — strictly enforces HMAC authentication and duplicate event suppression.
 */

import { Router } from 'express';
import crypto from 'crypto';
import config from '../../config/env.js';
import db from '../../db/index.js';
import Order, { ORDER_STATES } from '../../models/Order.js';
import { InventorySnapshot } from '../../models/InventorySnapshot.js';
import { AlertService } from '../../services/alertService.js';

const router = Router();

/**
 * Verify Shopify Webhook HMAC-SHA256
 */
function verifyShopifyHmac(req) {
  const hmacHeader = req.headers['x-shopify-hmac-sha256'];
  const secret = config.shopify.webhookSecret;

  if (!secret) {
    console.error('[Shopify Webhook] Rejected: SHOPIFY_WEBHOOK_SECRET is not configured on server.');
    return false;
  }
  if (!hmacHeader) return false;

  const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
  const hash = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');

  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader));
  } catch (e) {
    return false;
  }
}

router.post('/', async (req, res) => {
  const topic = req.headers['x-shopify-topic'] || 'orders/create';
  const webhookId = req.headers['x-shopify-webhook-id'] || `hook_${req.body?.id}_${topic}`;

  // 1. Strict HMAC Authentication
  if (!verifyShopifyHmac(req)) {
    console.warn(`[Shopify Webhook] Unauthorized attempt rejected for topic: ${topic}`);
    return res.status(401).json({ error: 'Unauthorized webhook signature' });
  }

  // 2. Idempotency Check: suppress duplicate processing
  const existingEvent = db.shopifyWebhookEvents.findById(webhookId) || db.webhookEvents.findById(webhookId);
  if (existingEvent) {
    console.log(`[Shopify Webhook] Duplicate event detected and suppressed: ${webhookId}`);
    return res.status(200).json({ received: true, duplicate: true });
  }

  await db.shopifyWebhookEvents.create({
    id: webhookId,
    topic,
    orderId: req.body?.id,
    processedAt: new Date().toISOString()
  });

  const shopifyOrder = req.body;
  if (!shopifyOrder || !shopifyOrder.id) {
    return res.status(400).json({ error: 'Empty order payload' });
  }

  const shopifyOrderId = String(shopifyOrder.id);
  const orderNumber = shopifyOrder.name || `TC-${shopifyOrder.order_number || shopifyOrderId}`;

  try {
    switch (topic) {
      case 'orders/create': {
        // Prevent duplicate local orders
        const existingOrder = db.orders.findOne(o => o.shopify?.orderId === shopifyOrderId);
        if (existingOrder) {
          console.log(`[Shopify Webhook] Order ${shopifyOrderId} already mapped locally as ${existingOrder.orderNumber}`);
          break;
        }

        const isPaid = shopifyOrder.financial_status === 'paid';
        const isCod = shopifyOrder.gateway === 'cash_on_delivery' || shopifyOrder.payment_gateway_names?.includes('cash_on_delivery');

        const shipping = shopifyOrder.shipping_address || {};
        const localOrder = await Order.create(null, {
          orderNumber: shopifyOrder.name ? shopifyOrder.name.replace('#', '') : Order.generateOrderNumber(),
          shopifyOrderId,
          status: isPaid ? ORDER_STATES.PAID : (isCod ? ORDER_STATES.COD_OTP_PENDING : ORDER_STATES.PENDING),
          financialStatus: isPaid ? 'PAID' : (isCod ? 'PENDING_COD' : 'PENDING_PAYMENT'),
          totalPrice: parseFloat(shopifyOrder.total_price || 0),
          subtotalPrice: parseFloat(shopifyOrder.subtotal_price || 0),
          currencyCode: shopifyOrder.currency || 'INR',
          paymentMethod: isPaid ? 'Shopify Online' : (isCod ? 'Cash on Delivery (COD)' : 'Shopify Pending'),
          shippingAddress: {
            name: `${shipping.first_name || ''} ${shipping.last_name || ''}`.trim() || 'Client',
            phone: shipping.phone || shopifyOrder.phone || '',
            address1: shipping.address1 || '',
            city: shipping.city || '',
            zip: shipping.zip || '',
            state: shipping.province || '',
            country: shipping.country || 'India'
          },
          lineItems: (shopifyOrder.line_items || []).map(li => ({
            title: li.title,
            quantity: li.quantity,
            price: parseFloat(li.price || 0),
            sku: li.sku || '',
            variantId: li.variant_id ? String(li.variant_id) : null,
            productId: li.product_id ? String(li.product_id) : null
          }))
        });

        // Store in shopify_orders mapping table
        await db.shopifyOrders.create({
          shopifyOrderId,
          localOrderId: localOrder.id,
          orderNumber: localOrder.orderNumber,
          financialStatus: shopifyOrder.financial_status,
          fulfillmentStatus: shopifyOrder.fulfillment_status,
          totalPrice: shopifyOrder.total_price
        });

        console.log(`[Shopify Webhook] Local order ${localOrder.orderNumber} created from Shopify Order #${shopifyOrderId}`);
        break;
      }

      case 'orders/updated':
      case 'orders/paid': {
        const orderMapping = db.shopifyOrders.findOne({ shopifyOrderId });
        if (orderMapping && orderMapping.localOrderId) {
          const updates = {};
          if (shopifyOrder.financial_status === 'paid') {
            updates.financialStatus = 'PAID';
            await Order.updateStatus(orderMapping.localOrderId, ORDER_STATES.PAID, 'Marked PAID via Shopify webhook', 'shopify_webhook');
          }
          await db.orders.updateById(orderMapping.localOrderId, updates);
        }
        break;
      }

      case 'orders/cancelled': {
        const orderMapping = db.shopifyOrders.findOne({ shopifyOrderId });
        if (orderMapping && orderMapping.localOrderId) {
          await Order.updateStatus(orderMapping.localOrderId, ORDER_STATES.CANCELLED, shopifyOrder.cancel_reason || 'Cancelled on Shopify', 'shopify_webhook');
        }
        break;
      }

      case 'fulfillments/create':
      case 'fulfillments/update': {
        const orderMapping = db.shopifyOrders.findOne({ shopifyOrderId });
        const fulfillment = shopifyOrder.fulfillments?.[0] || shopifyOrder;
        if (orderMapping && orderMapping.localOrderId && fulfillment.tracking_number) {
          await Order.updateTracking(orderMapping.localOrderId, {
            courier: fulfillment.tracking_company || 'Courier Partner',
            trackingNumber: fulfillment.tracking_number,
            trackingUrl: fulfillment.tracking_url || `https://shiprocket.co/tracking/${fulfillment.tracking_number}`,
            status: 'Shipped via Shopify Fulfillment'
          });
          await Order.updateStatus(orderMapping.localOrderId, ORDER_STATES.SHIPPED, 'Fulfillment recorded in Shopify', 'shopify_webhook');
        }
        break;
      }

      default:
        console.log(`[Shopify Webhook] Unhandled event topic: ${topic}`);
    }

    return res.status(200).json({ received: true, topic, shopifyOrderId });
  } catch (err) {
    console.error(`[Shopify Webhook Error]:`, err);
    return res.status(500).json({ error: 'Webhook processing failed', message: err.message });
  }
});

export default router;
